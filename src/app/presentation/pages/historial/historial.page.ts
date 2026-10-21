import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, afterRenderEffect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HistorialFacade } from '../../../application/facades/historial.facade';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { LOG_PREFIX } from '../../../core/config/api.config';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

@Component({
  selector: 'app-historial-page',
  imports: [FormsModule, DatePipe, DecimalPipe, PixelIcon],
  templateUrl: './historial.page.html',
  styleUrl: './historial.page.css',
})
export class HistorialPage {
  protected readonly facade = inject(HistorialFacade);
  protected readonly sincronizacion = inject(SincronizacionFacade);
  protected readonly jugadorId = signal(this.facade.idGuardado());

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
    this.facade.buscar(this.jugadorId().trim().replace(/^#/, ''));
  }

  protected horas(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const min = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h} h ${min} min` : `${min} min`;
  }

  protected minutos(segundos: number): string {
    return `${Math.round(segundos / 60)} min`;
  }
}
