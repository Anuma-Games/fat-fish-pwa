import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { Encuesta, validarEncuesta } from '../../domain/models/encuesta';
import { EnvioEncuesta, EnvioOutbox, ResultadoEnvio } from '../../domain/models/envio-outbox';
import { EncuestaRepository } from '../../domain/ports/encuesta.repository';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { intentarEnvio } from '../outbox/intentar-envio';
import { SincronizacionFacade } from './sincronizacion.facade';

const esEncuesta = (envio: EnvioOutbox): envio is EnvioEncuesta => envio.tipo === 'encuesta';

/**
 * Anonymous survey. It never sends player data. Without connection the answers wait in the
 * IndexedDB outbox and are sent when the connection returns (or when the app opens); the
 * Idempotency-Key (the id of the outbox record) makes every retry safe.
 *
 * Usage from the UI:
 *   - `await enviar(datos)` returns ENVIADO (saved on the server), EN_COLA (saved on the device,
 *     it will be sent later) or RECHAZADO (invalid data: message in `error()`, nothing is queued).
 *   - `enviando()` disables the button while a submit is in progress.
 *   - `pendientes()` is how many answers still wait on the device; `envios()` has the detail.
 */
@Injectable({ providedIn: 'root' })
export class EncuestaFacade {
  private readonly api = inject(EncuestaRepository);
  private readonly outbox = inject(OutboxRepository);
  private readonly sync = inject(SincronizacionFacade);

  readonly envios = signal<EnvioEncuesta[]>([]);
  readonly pendientes = computed(
    () => this.envios().filter((e) => e.estado === 'PENDIENTE').length,
  );
  readonly enviando = signal(false);
  /** Message in Spanish for the user; null when there is nothing to report. */
  readonly error = signal<string | null>(null);
  private sincronizando = false;

  constructor() {
    effect(() => {
      if (this.sync.enLinea()) {
        // Runs at start on every page (App creates this facade): if IndexedDB is not available
        // (some private modes), log it instead of leaving an unhandled rejection
        this.sincronizar().catch((err: unknown) =>
          console.error(`${LOG_PREFIX} No se pudo revisar el outbox de encuestas`, err),
        );
      }
    });
  }

  async enviar(datos: Encuesta): Promise<ResultadoEnvio> {
    const problema = validarEncuesta(datos);
    if (problema) {
      this.error.set(problema);
      return 'RECHAZADO';
    }
    this.error.set(null);
    this.enviando.set(true);
    try {
      const comentario = datos.comentario?.trim();
      const envio: EnvioEncuesta = {
        id: crypto.randomUUID(),
        tipo: 'encuesta',
        contenido: { ...datos, comentario: comentario || undefined },
        creadoEn: new Date().toISOString(),
        intentos: 0,
        estado: 'PENDIENTE',
      };
      await this.outbox.guardar(envio);
      if (!this.sync.enLinea()) {
        console.warn(
          `${LOG_PREFIX} Sin conexión: encuesta ${envio.id} guardada en IndexedDB (outbox)`,
        );
        await this.refrescar();
        return 'EN_COLA';
      }
      const estado = await this.intentar(envio);
      await this.refrescar();
      if (estado === 'ENVIADO') return 'ENVIADO';
      if (estado === 'FALLIDO') {
        this.error.set('El servidor rechazó la encuesta.');
        return 'RECHAZADO';
      }
      return 'EN_COLA';
    } finally {
      this.enviando.set(false);
    }
  }

  /** Sends every pending survey; safe to repeat thanks to the Idempotency-Key. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando) return;
    this.sincronizando = true;
    try {
      const pendientes = (await this.outbox.todos())
        .filter(esEncuesta)
        .filter((e) => e.estado === 'PENDIENTE');
      if (pendientes.length > 0) {
        console.info(
          `${LOG_PREFIX} Sincronizando outbox: ${pendientes.length} encuesta(s) pendiente(s)`,
        );
      }
      for (const envio of pendientes) {
        await this.intentar(envio);
      }
    } finally {
      this.sincronizando = false;
      await this.refrescar();
    }
  }

  async refrescar(): Promise<void> {
    this.envios.set((await this.outbox.todos()).filter(esEncuesta));
  }

  private async intentar(envio: EnvioEncuesta): Promise<EnvioEncuesta['estado']> {
    const estado = await intentarEnvio(
      envio,
      this.outbox,
      async () => (await firstValueFrom(this.api.enviar(envio.contenido, envio.id))).id,
      'POST /api/pwa/encuesta',
    );
    if (estado === 'ENVIADO') this.sync.registrar();
    return estado;
  }
}
