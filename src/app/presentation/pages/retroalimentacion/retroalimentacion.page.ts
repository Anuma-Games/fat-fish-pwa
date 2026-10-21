import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ResultadoEnvio,
  RetroalimentacionFacade,
} from '../../../application/facades/retroalimentacion.facade';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { Categoria, Componente } from '../../../domain/models/retroalimentacion';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

@Component({
  selector: 'app-retroalimentacion-page',
  imports: [FormsModule, DatePipe, PixelIcon],
  templateUrl: './retroalimentacion.page.html',
  styleUrl: './retroalimentacion.page.css',
})
export class RetroalimentacionPage {
  protected readonly facade = inject(RetroalimentacionFacade);
  protected readonly sincronizacion = inject(SincronizacionFacade);

  protected readonly categorias: { valor: Categoria; texto: string }[] = [
    { valor: 'ERROR', texto: 'Error' },
    { valor: 'SUGERENCIA', texto: 'Sugerencia' },
    { valor: 'OTRO', texto: 'Otro' },
  ];
  protected readonly componentes: { valor: Componente; texto: string }[] = [
    { valor: 'JUEGO', texto: 'Juego' },
    { valor: 'PWA', texto: 'PWA' },
    { valor: 'OTRO', texto: 'Otro' },
  ];

  protected categoria: Categoria = 'SUGERENCIA';
  protected componente: Componente = 'PWA';
  protected mensaje = '';
  protected readonly enviando = signal(false);
  protected readonly aviso = signal<{ tipo: ResultadoEnvio; texto: string } | null>(null);

  constructor() {
    void this.facade.refrescar();
  }

  protected async enviar(): Promise<void> {
    if (this.mensaje.trim().length < 10) {
      this.aviso.set({ tipo: 'RECHAZADO', texto: 'El mensaje debe tener al menos 10 caracteres.' });
      return;
    }
    this.enviando.set(true);
    const resultado = await this.facade.enviar({
      categoria: this.categoria,
      componente: this.componente,
      mensaje: this.mensaje.trim(),
    });
    this.enviando.set(false);
    const textos: Record<ResultadoEnvio, string> = {
      ENVIADO: '¡Gracias! Tu mensaje se guardó en el servidor.',
      EN_COLA: 'Guardado en tu dispositivo. Se enviará cuando vuelva la conexión.',
      RECHAZADO: 'El servidor rechazó el mensaje. Revisa los datos.',
    };
    this.aviso.set({ tipo: resultado, texto: textos[resultado] });
    if (resultado !== 'RECHAZADO') {
      this.mensaje = '';
    }
  }
}
