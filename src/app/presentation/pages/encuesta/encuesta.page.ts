import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EncuestaFacade } from '../../../application/facades/encuesta.facade';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { COMENTARIO_MAX, Encuesta, Escala } from '../../../domain/models/encuesta';
import { ResultadoEnvio } from '../../../domain/models/envio-outbox';
import { OpinionTabs } from '../../components/opinion-tabs/opinion-tabs';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

type Clave = 'percepcionRiesgo' | 'cambioOpinion' | 'claridadMensaje';

interface Pregunta {
  clave: Clave;
  etiqueta: string;
  texto: string;
  minimo: string;
  maximo: string;
}

/**
 * Anonymous survey (/opinion/encuesta). It never asks for the alias or the ID: the facade only
 * sends the three scales and the optional comment. Without connection the answers wait in the
 * outbox and the facade sends them when the connection returns.
 */
@Component({
  selector: 'app-encuesta-page',
  imports: [FormsModule, PixelIcon, OpinionTabs],
  templateUrl: './encuesta.page.html',
  styleUrl: './encuesta.page.css',
})
export class EncuestaPage {
  protected readonly facade = inject(EncuestaFacade);
  protected readonly sincronizacion = inject(SincronizacionFacade);

  protected readonly escala: Escala[] = [1, 2, 3, 4, 5];
  protected readonly comentarioMax = COMENTARIO_MAX;
  protected readonly preguntas: Pregunta[] = [
    {
      clave: 'percepcionRiesgo',
      etiqueta: 'Riesgo',
      texto: '¿Qué tan riesgosos te parecen los juegos de azar?',
      minimo: 'Nada',
      maximo: 'Mucho',
    },
    {
      clave: 'cambioOpinion',
      etiqueta: 'Cambio',
      texto: '¿El juego cambió lo que pensabas de ellos?',
      minimo: 'Nada',
      maximo: 'Mucho',
    },
    {
      clave: 'claridadMensaje',
      etiqueta: 'Mensaje',
      texto: '¿Qué tan claro fue el mensaje sobre la ludopatía?',
      minimo: 'Nada',
      maximo: 'Muy claro',
    },
  ];

  protected readonly respuestas = signal<Record<Clave, Escala | null>>(this.sinRespuestas());
  protected comentario = '';
  /** True after a submit with missing answers, to mark the unanswered questions. */
  protected readonly intentado = signal(false);
  protected readonly aviso = signal<{ tipo: ResultadoEnvio; texto: string } | null>(null);
  /** Outbox id of the answers that the current notice says are waiting on the device. */
  private readonly enCola = signal<string | null>(null);

  constructor() {
    void this.facade.refrescar();
    // The facade sends the queued answers by itself when the connection returns; the notice
    // follows that submission so it never keeps saying "se enviará" after it was sent.
    effect(() => {
      const id = this.enCola();
      if (!id) return;
      const estado = this.facade.envios().find((e) => e.id === id)?.estado;
      if (estado === 'ENVIADO') {
        this.enCola.set(null);
        this.aviso.set({
          tipo: 'ENVIADO',
          texto: 'Volvió la conexión: tus respuestas ya se guardaron en el servidor.',
        });
      } else if (estado === 'FALLIDO') {
        this.enCola.set(null);
        this.aviso.set({
          tipo: 'RECHAZADO',
          texto: 'El servidor rechazó la encuesta que estaba guardada en tu dispositivo.',
        });
      }
    });
  }

  protected elegir(clave: Clave, valor: Escala): void {
    this.respuestas.update((r) => ({ ...r, [clave]: valor }));
  }

  /** Roving tabindex: Tab enters each scale once, on the chosen value or on the first one. */
  protected enfocable(clave: Clave, valor: Escala): boolean {
    return (this.respuestas()[clave] ?? 1) === valor;
  }

  /** Arrow keys move and choose inside a scale, like a native radio group (Home/End: 1 and 5). */
  protected mover(evento: KeyboardEvent, clave: Clave, actual: Escala): void {
    const pasos: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let siguiente: number;
    if (evento.key === 'Home') siguiente = 1;
    else if (evento.key === 'End') siguiente = this.escala.length;
    else if (evento.key in pasos) {
      const total = this.escala.length;
      siguiente = ((actual - 1 + pasos[evento.key] + total) % total) + 1;
    } else return;
    evento.preventDefault();
    this.elegir(clave, siguiente as Escala);
    const grupo = (evento.currentTarget as HTMLElement).parentElement;
    (grupo?.children[siguiente - 1] as HTMLElement | undefined)?.focus();
  }

  protected faltante(clave: Clave): boolean {
    return this.intentado() && this.respuestas()[clave] === null;
  }

  protected async enviar(): Promise<void> {
    const r = this.respuestas();
    if (r.percepcionRiesgo === null || r.cambioOpinion === null || r.claridadMensaje === null) {
      this.intentado.set(true);
      this.aviso.set({ tipo: 'RECHAZADO', texto: 'Responde las tres preguntas antes de enviar.' });
      return;
    }
    const datos: Encuesta = {
      percepcionRiesgo: r.percepcionRiesgo,
      cambioOpinion: r.cambioOpinion,
      claridadMensaje: r.claridadMensaje,
      comentario: this.comentario,
    };
    this.enCola.set(null);
    const resultado = await this.facade.enviar(datos);
    const textos: Record<ResultadoEnvio, string> = {
      ENVIADO: '¡Gracias! Tus respuestas se guardaron en el servidor.',
      EN_COLA: 'Guardado en tu dispositivo. Se enviará cuando vuelva la conexión.',
      RECHAZADO: this.facade.error() ?? 'El servidor rechazó la encuesta. Revisa tus respuestas.',
    };
    this.aviso.set({ tipo: resultado, texto: textos[resultado] });
    // `envios()` is refreshed before `enviar` returns and the newest submission comes first
    if (resultado === 'EN_COLA') this.enCola.set(this.facade.envios()[0]?.id ?? null);
    if (resultado !== 'RECHAZADO') {
      this.respuestas.set(this.sinRespuestas());
      this.comentario = '';
      this.intentado.set(false);
    }
  }

  private sinRespuestas(): Record<Clave, Escala | null> {
    return { percepcionRiesgo: null, cambioOpinion: null, claridadMensaje: null };
  }
}
