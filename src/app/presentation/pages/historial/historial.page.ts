import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, afterRenderEffect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HistorialFacade } from '../../../application/facades/historial.facade';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { LOG_PREFIX } from '../../../core/config/api.config';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

/**
 * Dossier (/perfil): statistics and history of the player consulted last time. It has no search of
 * its own; "Buscar otro jugador" goes back to /acceso, the only search by alias or ID.
 */
@Component({
  selector: 'app-historial-page',
  imports: [RouterLink, DatePipe, DecimalPipe, PixelIcon],
  templateUrl: './historial.page.html',
  styleUrl: './historial.page.css',
})
export class HistorialPage {
  protected readonly facade = inject(HistorialFacade);
  protected readonly sincronizacion = inject(SincronizacionFacade);

  constructor() {
    // The route guard only lets in a visitor who already looked up a player in /acceso
    const jugadorId = this.facade.jugadorGuardado();
    // Coming from /acceso the dossier of the chosen player is already on its way
    if (jugadorId && !this.facade.consultando(jugadorId)) this.facade.buscar(jugadorId);
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

  protected horas(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const min = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `${h} h ${min} min` : `${min} min`;
  }

  protected minutos(segundos: number): string {
    return `${Math.round(segundos / 60)} min`;
  }
}
