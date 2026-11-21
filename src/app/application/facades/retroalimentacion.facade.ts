import { Injectable, effect, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import {
  EnvioOutbox,
  EnvioRetroalimentacion,
  ResultadoEnvio,
  porEnviar,
} from '../../domain/models/envio-outbox';
import { Retroalimentacion } from '../../domain/models/retroalimentacion';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { RetroalimentacionRepository } from '../../domain/ports/retroalimentacion.repository';
import { SegundoPlano } from '../../domain/ports/segundo-plano';
import { intentarEnvio } from '../outbox/intentar-envio';
import { SincronizacionFacade } from './sincronizacion.facade';

export type { ResultadoEnvio } from '../../domain/models/envio-outbox';

const esRetroalimentacion = (envio: EnvioOutbox): envio is EnvioRetroalimentacion =>
  envio.tipo === 'retroalimentacion';

/**
 * Sends feedback to the API. If there is no connection, the submission waits in the IndexedDB
 * outbox and is sent again when the connection comes back (or when the app opens). It also asks for
 * Background Sync, so in Chromium browsers the service worker sends it even with the tab closed.
 */
@Injectable({ providedIn: 'root' })
export class RetroalimentacionFacade {
  private readonly api = inject(RetroalimentacionRepository);
  private readonly outbox = inject(OutboxRepository);
  private readonly sync = inject(SincronizacionFacade);
  private readonly segundoPlano = inject(SegundoPlano);

  private sincronizando = false;

  constructor() {
    effect(() => {
      if (this.sync.enLinea()) {
        // Runs at start on every page (App creates this facade): if IndexedDB is not available
        // (some private modes), log it instead of leaving an unhandled rejection
        this.sincronizar().catch((err: unknown) =>
          console.error(`${LOG_PREFIX} No se pudo revisar el outbox de retroalimentación`, err),
        );
      }
    });
  }

  async enviar(datos: Retroalimentacion): Promise<ResultadoEnvio> {
    const envio: EnvioRetroalimentacion = {
      id: crypto.randomUUID(),
      tipo: 'retroalimentacion',
      contenido: datos,
      creadoEn: new Date().toISOString(),
      intentos: 0,
      estado: 'PENDIENTE',
    };
    await this.outbox.guardar(envio);
    if (!this.sync.enLinea()) {
      console.warn(
        `${LOG_PREFIX} Sin conexión: retroalimentación ${envio.id} guardada en IndexedDB (outbox)`,
      );
      this.segundoPlano.programarEnvio();
      return 'EN_COLA';
    }
    const estado = await this.intentar(envio);
    if (estado === 'ENVIADO') return 'ENVIADO';
    if (estado === 'FALLIDO') return 'RECHAZADO';
    this.segundoPlano.programarEnvio();
    return 'EN_COLA';
  }

  /** Sends every pending submission; safe to repeat thanks to the Idempotency-Key. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando) return;
    this.sincronizando = true;
    try {
      const pendientes = (await this.outbox.todos()).filter(esRetroalimentacion).filter(porEnviar);
      if (pendientes.length > 0) {
        console.info(
          `${LOG_PREFIX} Sincronizando outbox: ${pendientes.length} envío(s) pendiente(s)`,
        );
      }
      let quedan = 0;
      for (const envio of pendientes) {
        if ((await this.intentar(envio)) === 'PENDIENTE') quedan++;
      }
      if (quedan > 0) this.segundoPlano.programarEnvio();
    } finally {
      this.sincronizando = false;
    }
  }

  private async intentar(envio: EnvioRetroalimentacion): Promise<EnvioRetroalimentacion['estado']> {
    const estado = await intentarEnvio(
      envio,
      this.outbox,
      async () => (await firstValueFrom(this.api.enviar(envio.contenido, envio.id))).id,
      'POST /api/pwa/retroalimentacion',
    );
    if (estado === 'ENVIADO') this.sync.registrar();
    return estado;
  }
}
