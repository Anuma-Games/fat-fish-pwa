import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { EnvioOutbox, Retroalimentacion } from '../../domain/models/retroalimentacion';
import { RetroalimentacionApiRepository } from '../../infrastructure/api/retroalimentacion-api.repository';
import { ConnectivityService } from '../../infrastructure/pwa/connectivity.service';
import { SyncStatusService } from '../../infrastructure/pwa/sync-status.service';
import { OutboxDb } from '../../infrastructure/storage/outbox-db';

const MAX_INTENTOS = 5;

export type ResultadoEnvio = 'ENVIADO' | 'EN_COLA' | 'RECHAZADO';

/**
 * Sends feedback to the API. If there is no connection, the submission waits in the IndexedDB
 * outbox and is sent again when the connection comes back (or when the app opens).
 */
@Injectable({ providedIn: 'root' })
export class RetroalimentacionFacade {
  private readonly api = inject(RetroalimentacionApiRepository);
  private readonly outbox = inject(OutboxDb);
  private readonly conectividad = inject(ConnectivityService);
  private readonly sync = inject(SyncStatusService);

  readonly envios = signal<EnvioOutbox[]>([]);
  private sincronizando = false;

  constructor() {
    effect(() => {
      if (this.conectividad.enLinea()) {
        void this.sincronizar();
      }
    });
  }

  async enviar(datos: Retroalimentacion): Promise<ResultadoEnvio> {
    const envio: EnvioOutbox = {
      id: crypto.randomUUID(),
      tipo: 'retroalimentacion',
      contenido: datos,
      creadoEn: new Date().toISOString(),
      intentos: 0,
      estado: 'PENDIENTE',
    };
    await this.outbox.guardar(envio);
    if (!navigator.onLine) {
      console.warn(
        `${LOG_PREFIX} Sin conexión: retroalimentación ${envio.id} guardada en IndexedDB (outbox)`,
      );
      await this.refrescar();
      return 'EN_COLA';
    }
    const estado = await this.intentar(envio);
    await this.refrescar();
    if (estado === 'ENVIADO') return 'ENVIADO';
    return estado === 'FALLIDO' ? 'RECHAZADO' : 'EN_COLA';
  }

  /** Sends every pending submission; safe to repeat thanks to the Idempotency-Key. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando) return;
    this.sincronizando = true;
    try {
      const pendientes = (await this.outbox.todos()).filter((e) => e.estado === 'PENDIENTE');
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
      await this.refrescar();
    }
  }

  async refrescar(): Promise<void> {
    this.envios.set(await this.outbox.todos());
  }

  private async intentar(envio: EnvioOutbox): Promise<EnvioOutbox['estado']> {
    envio.intentos += 1;
    envio.estado = 'ENVIANDO';
    await this.outbox.guardar(envio);
    const inicio = performance.now();
    try {
      const respuesta = await firstValueFrom(this.api.enviar(envio.contenido, envio.id));
      envio.estado = 'ENVIADO';
      envio.idServidor = respuesta.id;
      envio.ultimoError = undefined;
      this.sync.registrar();
      console.info(
        `${LOG_PREFIX} POST /api/pwa/retroalimentacion OK en ${(performance.now() - inicio).toFixed(1)} ms: id ${respuesta.id} (Idempotency-Key ${envio.id})`,
      );
    } catch (e) {
      const err = e as HttpErrorResponse;
      const sinRed = err.status === 0 || err.status >= 500;
      envio.ultimoError = sinRed ? 'Sin conexión con el servidor' : `Rechazado (${err.status})`;
      envio.estado = !sinRed || envio.intentos >= MAX_INTENTOS ? 'FALLIDO' : 'PENDIENTE';
      console.warn(`${LOG_PREFIX} POST falló (${err.status}); estado ${envio.estado}`, err.message);
    }
    await this.outbox.guardar(envio);
    return envio.estado;
  }
}
