import { Injectable, effect, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import {
  EnvioOutbox,
  EnvioRetroalimentacion,
  ResultadoEnvio,
} from '../../domain/models/envio-outbox';
import { Retroalimentacion } from '../../domain/models/retroalimentacion';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { RetroalimentacionRepository } from '../../domain/ports/retroalimentacion.repository';
import { intentarEnvio } from '../outbox/intentar-envio';
import { SincronizacionFacade } from './sincronizacion.facade';

export type { ResultadoEnvio } from '../../domain/models/envio-outbox';

const esRetroalimentacion = (envio: EnvioOutbox): envio is EnvioRetroalimentacion =>
  envio.tipo === 'retroalimentacion';

/**
 * Sends feedback to the API. If there is no connection, the submission waits in the IndexedDB
 * outbox and is sent again when the connection comes back (or when the app opens).
 */
@Injectable({ providedIn: 'root' })
export class RetroalimentacionFacade {
  private readonly api = inject(RetroalimentacionRepository);
  private readonly outbox = inject(OutboxRepository);
  private readonly sync = inject(SincronizacionFacade);

  private sincronizando = false;

  constructor() {
    effect(() => {
      if (this.sync.enLinea()) {
        void this.sincronizar();
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
      return 'EN_COLA';
    }
    const estado = await this.intentar(envio);
    if (estado === 'ENVIADO') return 'ENVIADO';
    return estado === 'FALLIDO' ? 'RECHAZADO' : 'EN_COLA';
  }

  /** Sends every pending submission; safe to repeat thanks to the Idempotency-Key. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando) return;
    this.sincronizando = true;
    try {
      const pendientes = (await this.outbox.todos())
        .filter(esRetroalimentacion)
        .filter((e) => e.estado === 'PENDIENTE');
      if (pendientes.length > 0) {
        console.info(
          `${LOG_PREFIX} Sincronizando outbox: ${pendientes.length} envío(s) pendiente(s)`,
        );
      }
      for (const envio of pendientes) {
        await this.intentar(envio);
      }
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
