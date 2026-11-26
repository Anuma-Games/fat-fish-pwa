// Service Worker of the PWA (README 7.4). Angular's worker (ngsw-worker.js) does the caching and the
// updates; this file imports it and adds Background Sync: when the browser gets the network back it
// fires `sync`, even with every tab of the site closed, and the outbox (IndexedDB) is emptied with
// the same rules as the page (application/outbox/intentar-envio.ts). Only Chromium browsers fire
// `sync`; in Safari and Firefox the page keeps emptying the outbox when it opens or reconnects.
// It is plain JavaScript because Angular does not compile a custom service worker; the logic is
// tested with `npm run test:sw` (scripts/sw.test.mjs).
importScripts('./ngsw-worker.js');

(() => {
  const LOG_PREFIX = '[FatFish]';
  /** Tag registered by the page (infrastructure/pwa/background-sync.service.ts). */
  const TAG = 'fatfish-outbox';
  /** The page and this worker take the same Web Lock before sending, so a submission goes once. */
  const CANDADO = 'fatfish-outbox';
  const DB_NAME = 'fatfish-pwa';
  const DB_VERSION = 1;
  const STORE = 'outbox';
  const MAX_INTENTOS = 5;
  /** Same bound as TIMEOUT_ENVIO_MS in core/config/api.config.ts. Includes reading the body. */
  const TIMEOUT_ENVIO_MS = 15_000;
  /** Same public key as API_KEY in core/config/api.config.ts (scripts/sw.test.mjs checks it). */
  const API_KEY = '592b1e9539192affbc34916c574836930b1bf725c34e672d38ce847827e9a450';
  const RUTAS = { retroalimentacion: '/api/pwa/retroalimentacion', encuesta: '/api/pwa/encuesta' };

  /**
   * Same rule as `porEnviar` in domain/models/envio-outbox.ts. ENVIANDO is only set inside the
   * lock, so one seen inside the lock was abandoned mid-request and is sent again with the same
   * Idempotency-Key.
   */
  const porEnviar = (envio) => envio.estado === 'PENDIENTE' || envio.estado === 'ENVIANDO';

  /** Same rule as core/http/errores-http.ts: failures that may disappear by themselves. */
  const esReintentable = (status) =>
    status === 0 || status === 504 || status === 408 || status === 429 || status >= 500;

  /** POST of one submission; resolves with the id of the server or rejects with `{ status }`. */
  async function enviar(envio, fetchFn = fetch) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_ENVIO_MS);
    try {
      let respuesta;
      try {
        respuesta = await fetchFn(RUTAS[envio.tipo], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': envio.id,
            'X-Api-Key': API_KEY,
          },
          body: JSON.stringify(envio.contenido),
          signal: controller.signal,
        });
      } catch {
        throw { status: 0 };
      }
      if (!respuesta.ok) throw { status: respuesta.status };
      return String((await respuesta.json()).id);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Sends every submission of the outbox that still has to reach the API, one at a time, inside the
   * shared lock. Each submission is read again inside the lock, so one the page already sent is
   * skipped.
   * Resolves with how many stay PENDIENTE after a temporary failure.
   */
  async function vaciarOutbox({ outbox, enviar, candado }) {
    return candado(async () => {
      let quedan = 0;
      const pendientes = (await outbox.todos()).filter(porEnviar);
      for (const { id } of pendientes) {
        const envio = await outbox.obtener(id);
        if (!envio || !porEnviar(envio) || !RUTAS[envio.tipo]) continue;
        // An ENVIANDO recovered after its last attempt has no attempts left: no more POSTs
        if (envio.intentos >= MAX_INTENTOS) {
          envio.estado = 'FALLIDO';
          envio.ultimoError ??= 'Se agotaron los intentos';
          await outbox.guardar(envio);
          console.warn(
            `${LOG_PREFIX} [sync] ${envio.tipo} ${envio.id} sin intentos; estado FALLIDO`,
          );
          continue;
        }
        envio.intentos += 1;
        envio.estado = 'ENVIANDO';
        await outbox.guardar(envio);
        try {
          envio.idServidor = await enviar(envio);
          envio.estado = 'ENVIADO';
          envio.ultimoError = undefined;
          console.info(
            `${LOG_PREFIX} [sync] ${envio.tipo} ${envio.id} enviado: id ${envio.idServidor}`,
          );
        } catch (error) {
          const status = error?.status ?? 0;
          const reintentable = esReintentable(status);
          envio.ultimoError = reintentable
            ? 'Sin conexión con el servidor'
            : `Rechazado (${status})`;
          envio.estado = !reintentable || envio.intentos >= MAX_INTENTOS ? 'FALLIDO' : 'PENDIENTE';
          if (envio.estado === 'PENDIENTE') quedan++;
          console.warn(
            `${LOG_PREFIX} [sync] ${envio.tipo} ${envio.id} falló (${status}); estado ${envio.estado}`,
          );
        }
        await outbox.guardar(envio);
      }
      return quedan;
    });
  }

  /** The same database and store as infrastructure/storage/outbox-db.ts. */
  function abrirDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('estado', 'estado');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function outboxIndexedDb(db) {
    const tx = (modo, accion) =>
      new Promise((resolve, reject) => {
        const request = accion(db.transaction(STORE, modo).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    return {
      todos: () => tx('readonly', (s) => s.getAll()),
      obtener: (id) => tx('readonly', (s) => s.get(id)),
      guardar: (envio) => tx('readwrite', (s) => s.put(envio)),
    };
  }

  const candadoWebLocks = (fn) =>
    self.navigator?.locks ? self.navigator.locks.request(CANDADO, fn) : fn();

  async function sincronizar() {
    const db = await abrirDb();
    try {
      const quedan = await vaciarOutbox({
        outbox: outboxIndexedDb(db),
        enviar,
        candado: candadoWebLocks,
      });
      // Rejecting tells the browser to fire `sync` again later, with a growing wait
      if (quedan > 0) throw new Error(`${quedan} envío(s) siguen pendientes`);
    } finally {
      db.close();
    }
  }

  self.addEventListener('sync', (event) => {
    if (event.tag === TAG) event.waitUntil(sincronizar());
  });

  // Only for scripts/sw.test.mjs
  self.fatFishOutbox = {
    TAG,
    CANDADO,
    API_KEY,
    MAX_INTENTOS,
    porEnviar,
    TIMEOUT_ENVIO_MS,
    esReintentable,
    enviar,
    vaciarOutbox,
  };
})();
