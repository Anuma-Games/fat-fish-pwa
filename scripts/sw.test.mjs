// Pruebas del Service Worker propio (public/sw.js): las reglas con las que vacía el outbox en el
// evento `sync`. Se corre con `npm run test:sw` (node --test) porque el archivo es JavaScript plano
// y no pasa por el compilador de Angular. El acceso real a IndexedDB se prueba en el navegador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import vm from 'node:vm';

const RAIZ = join(import.meta.dirname, '..');

/** Loads public/sw.js in a sandbox; importScripts('ngsw-worker.js') does nothing here. */
function cargarSw() {
  const escuchas = {};
  const importados = [];
  const self = { addEventListener: (tipo, fn) => (escuchas[tipo] = fn) };
  const consola = { info() {}, warn() {}, error() {} };
  vm.runInNewContext(readFileSync(join(RAIZ, 'public/sw.js'), 'utf8'), {
    self,
    importScripts: (url) => importados.push(url),
    console: consola,
  });
  return { api: self.fatFishOutbox, escuchas, importados };
}

/** Outbox in memory with the same methods the worker uses on IndexedDB. */
function outboxEnMemoria(envios) {
  const filas = new Map(envios.map((e) => [e.id, structuredClone(e)]));
  return {
    filas,
    todos: async () => [...filas.values()].map((e) => structuredClone(e)),
    obtener: async (id) => filas.has(id) && structuredClone(filas.get(id)),
    guardar: async (e) => void filas.set(e.id, structuredClone(e)),
  };
}

const envio = (id, cambios = {}) => ({
  id,
  tipo: 'retroalimentacion',
  contenido: { categoria: 'ERROR', componente: 'PWA', mensaje: 'Sin señal en el camión' },
  creadoEn: '2026-11-19T10:00:00.000Z',
  intentos: 0,
  estado: 'PENDIENTE',
  ...cambios,
});

const sinCandado = (fn) => fn();

describe('public/sw.js', () => {
  let sw;
  beforeEach(() => (sw = cargarSw()));

  it("imports Angular's worker and listens to sync", () => {
    assert.deepEqual(sw.importados, ['./ngsw-worker.js']);
    assert.equal(typeof sw.escuchas.sync, 'function');
  });

  it('only answers the outbox tag', () => {
    const esperas = [];
    sw.escuchas.sync({ tag: 'otra-cosa', waitUntil: (p) => esperas.push(p) });
    assert.equal(esperas.length, 0);
  });

  it('uses the same public key as the page (core/config/api.config.ts)', () => {
    const config = readFileSync(join(RAIZ, 'src/app/core/config/api.config.ts'), 'utf8');
    assert.match(config, new RegExp(`API_KEY = '${sw.api.API_KEY}'`));
  });

  it('uses the same tag and lock as the page', () => {
    const sync = readFileSync(
      join(RAIZ, 'src/app/infrastructure/pwa/background-sync.service.ts'),
      'utf8',
    );
    const candado = readFileSync(
      join(RAIZ, 'src/app/application/outbox/candado-outbox.ts'),
      'utf8',
    );
    assert.match(sync, new RegExp(`TAG_OUTBOX = '${sw.api.TAG}'`));
    assert.match(candado, new RegExp(`CANDADO_OUTBOX = '${sw.api.CANDADO}'`));
  });

  it('posts the content with the Idempotency-Key and the key of the API', async () => {
    let peticion;
    const fetchFalso = async (url, opciones) => {
      peticion = { url, ...opciones };
      return { ok: true, json: async () => ({ id: 31 }) };
    };
    const e = envio('uuid-1');
    assert.equal(await sw.api.enviar(e, fetchFalso), '31');
    assert.equal(peticion.url, '/api/pwa/retroalimentacion');
    assert.equal(peticion.method, 'POST');
    assert.equal(peticion.headers['Idempotency-Key'], 'uuid-1');
    assert.equal(peticion.headers['X-Api-Key'], sw.api.API_KEY);
    assert.deepEqual(JSON.parse(peticion.body), e.contenido);
  });

  it('turns a network error into status 0 and an HTTP error into its status', async () => {
    await assert.rejects(
      sw.api.enviar(envio('a'), async () => {
        throw new TypeError('Failed to fetch');
      }),
      { status: 0 },
    );
    await assert.rejects(
      sw.api.enviar(envio('a'), async () => ({ ok: false, status: 400 })),
      { status: 400 },
    );
  });

  it('sends the pending submissions and keeps the server id', async () => {
    const outbox = outboxEnMemoria([envio('a'), envio('b', { tipo: 'encuesta', contenido: {} })]);
    const quedan = await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => `srv-${e.id}`,
      candado: sinCandado,
    });
    assert.equal(quedan, 0);
    assert.equal(outbox.filas.get('a').estado, 'ENVIADO');
    assert.equal(outbox.filas.get('a').idServidor, 'srv-a');
    assert.equal(outbox.filas.get('a').intentos, 1);
    assert.equal(outbox.filas.get('b').estado, 'ENVIADO');
  });

  it('leaves alone what is not PENDIENTE', async () => {
    const outbox = outboxEnMemoria([
      envio('enviado', { estado: 'ENVIADO', idServidor: '1' }),
      envio('fallido', { estado: 'FALLIDO' }),
    ]);
    const enviados = [];
    await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => enviados.push(e.id),
      candado: sinCandado,
    });
    assert.deepEqual(enviados, []);
  });

  it('does not send a submission the page sent before the worker took the lock', async () => {
    const outbox = outboxEnMemoria([envio('a')]);
    const leer = outbox.todos;
    // The list is read first; the page sends `a` in the meantime
    outbox.todos = async () => {
      const lista = await leer();
      outbox.filas.set('a', envio('a', { estado: 'ENVIADO', idServidor: '9', intentos: 1 }));
      return lista;
    };
    const enviados = [];
    await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => enviados.push(e.id),
      candado: sinCandado,
    });
    assert.deepEqual(enviados, []);
    assert.equal(outbox.filas.get('a').idServidor, '9');
  });

  it('retries temporary failures and marks a rejection FALLIDO', async () => {
    const outbox = outboxEnMemoria([envio('sin-red'), envio('lleno'), envio('malo')]);
    const status = { 'sin-red': 0, lleno: 503, malo: 400 };
    const quedan = await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => Promise.reject({ status: status[e.id] }),
      candado: sinCandado,
    });
    assert.equal(quedan, 2);
    assert.equal(outbox.filas.get('sin-red').estado, 'PENDIENTE');
    assert.equal(outbox.filas.get('sin-red').ultimoError, 'Sin conexión con el servidor');
    assert.equal(outbox.filas.get('lleno').estado, 'PENDIENTE');
    assert.equal(outbox.filas.get('malo').estado, 'FALLIDO');
    assert.equal(outbox.filas.get('malo').ultimoError, 'Rechazado (400)');
  });

  it('gives up after MAX_INTENTOS', async () => {
    const outbox = outboxEnMemoria([envio('a', { intentos: sw.api.MAX_INTENTOS - 1 })]);
    const quedan = await sw.api.vaciarOutbox({
      outbox,
      enviar: async () => Promise.reject({ status: 503 }),
      candado: sinCandado,
    });
    assert.equal(quedan, 0);
    assert.equal(outbox.filas.get('a').estado, 'FALLIDO');
  });

  it('sends everything inside the lock', async () => {
    const outbox = outboxEnMemoria([envio('a')]);
    let dentro = false;
    const enviados = [];
    await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => {
        assert.ok(dentro, 'sent outside the lock');
        enviados.push(e.id);
        return '1';
      },
      candado: async (fn) => {
        dentro = true;
        try {
          return await fn();
        } finally {
          dentro = false;
        }
      },
    });
    assert.deepEqual(enviados, ['a']);
  });

  it('sends again a submission left ENVIANDO, with the same key and one more attempt', async () => {
    // The tab closed (or the worker stopped) in the middle of the request
    const outbox = outboxEnMemoria([envio('a', { estado: 'ENVIANDO', intentos: 1 })]);
    const claves = [];
    const quedan = await sw.api.vaciarOutbox({
      outbox,
      enviar: async (e) => (claves.push(e.id), 'srv-a'),
      candado: sinCandado,
    });
    assert.equal(quedan, 0);
    assert.deepEqual(claves, ['a']);
    assert.equal(outbox.filas.get('a').estado, 'ENVIADO');
    assert.equal(outbox.filas.get('a').intentos, 2);
  });

  it('gives up on an abandoned ENVIANDO that already used its attempts', async () => {
    const outbox = outboxEnMemoria([
      envio('a', { estado: 'ENVIANDO', intentos: sw.api.MAX_INTENTOS - 1 }),
    ]);
    await sw.api.vaciarOutbox({
      outbox,
      enviar: async () => Promise.reject({ status: 0 }),
      candado: sinCandado,
    });
    assert.equal(outbox.filas.get('a').estado, 'FALLIDO');
  });

  it('uses the same rule as the page to know what still has to be sent', () => {
    const modelo = readFileSync(join(RAIZ, 'src/app/domain/models/envio-outbox.ts'), 'utf8');
    assert.match(modelo, /envio\.estado === 'PENDIENTE' \|\| envio\.estado === 'ENVIANDO'/);
    const estados = ['PENDIENTE', 'ENVIANDO', 'ENVIADO', 'FALLIDO'];
    assert.deepEqual(
      estados.filter((estado) => sw.api.porEnviar({ estado })),
      ['PENDIENTE', 'ENVIANDO'],
    );
  });
});
