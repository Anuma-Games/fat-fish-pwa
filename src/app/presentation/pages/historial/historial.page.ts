import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, afterRenderEffect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HistorialFacade } from '../../../application/facades/historial.facade';
import { LAB_PLAYER_ID, LOG_PREFIX } from '../../../core/config/api.config';
import { ConnectivityService } from '../../../infrastructure/pwa/connectivity.service';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

@Component({
  selector: 'app-historial-page',
  imports: [FormsModule, DatePipe, DecimalPipe, PixelIcon],
  templateUrl: './historial.page.html',
  styleUrl: './historial.page.css',
})
export class HistorialPage {
  protected readonly facade = inject(HistorialFacade);
  protected readonly conectividad = inject(ConnectivityService);
  protected readonly jugadorId = signal(this.idGuardado());

  constructor() {
    this.consultar();
    // Logs how long it took from the GET until the rows were painted.
    afterRenderEffect(() => {
      const partidas = this.facade.partidas();
      if (!this.facade.cargando() && !this.facade.cargandoMas() && this.facade.perfil()) {
        const ms = (performance.now() - this.facade.inicioConsulta).toFixed(1);
        console.info(
          `${LOG_PREFIX} Expediente renderizado: ${partidas.length} partidas en pantalla, ${ms} ms desde el GET`,
        );
      }
    });
  }

  protected consultar(): void {
    const id = this.jugadorId().trim().replace(/^#/, '');
    try {
      localStorage.setItem('fatfish.jugadorId', id);
    } catch {
      // Private mode: the id is not remembered
    }
    this.facade.buscar(id);
  }

  protected horas(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const min = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h} h ${min} min` : `${min} min`;
  }

  protected minutos(segundos: number): string {
    return `${Math.round(segundos / 60)} min`;
  }

  /** Ignores ids saved by older versions of the lab (UUIDs). */
  private idGuardado(): string {
    try {
      const guardado = localStorage.getItem('fatfish.jugadorId');
      return guardado && /^\d+$/.test(guardado) ? guardado : LAB_PLAYER_ID;
    } catch {
      return LAB_PLAYER_ID;
    }
  }
}
