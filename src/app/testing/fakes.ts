import { signal } from '@angular/core';
import { EnvioOutbox } from '../domain/models/envio-outbox';
import { Conectividad } from '../domain/ports/conectividad';
import { OutboxRepository } from '../domain/ports/outbox.repository';
import { SesionRepository } from '../domain/ports/sesion.repository';

/** Test doubles for the infrastructure ports used by the facade specs. */
export class OutboxEnMemoria implements OutboxRepository {
  readonly filas = new Map<string, EnvioOutbox>();

  async guardar(envio: EnvioOutbox): Promise<void> {
    this.filas.set(envio.id, structuredClone(envio));
  }

  async todos(): Promise<EnvioOutbox[]> {
    return [...this.filas.values()].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }
}

export class ConectividadFalsa implements Conectividad {
  readonly enLinea = signal(true);
}

export class SesionFalsa implements SesionRepository {
  id: string | null = null;
  sync: Date | null = null;
  jugadorId(): string | null {
    return this.id;
  }
  guardarJugadorId(id: string): void {
    this.id = id;
  }
  olvidarJugadorId(): void {
    this.id = null;
  }
  ultimaSincronizacion(): Date | null {
    return this.sync;
  }
  guardarUltimaSincronizacion(fecha: Date): void {
    this.sync = fecha;
  }
}
