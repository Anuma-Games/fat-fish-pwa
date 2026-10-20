import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CRUPIER,
  CTA,
  DatoExpediente,
  EXPEDIENTE,
  FICHA,
} from '../../../../../core/config/landing.config';
import { Crupier } from '../../crupier';
import { Foco } from '../../foco.directive';
import { Iman } from '../../iman.directive';
import { escribir, prefiereMenosMovimiento } from '../../motion';
import { Reveal } from '../../reveal.directive';

const DURACION_MS = 1400;
/** Pause between one typed field and the next. */
const ENTRE_CAMPOS_MS = 260;

function formato(dato: DatoExpediente, valor = dato.valor): string {
  return typeof valor === 'number'
    ? `${dato.prefijo ?? ''}${valor.toLocaleString('es-MX')}`
    : valor;
}

/**
 * Sample dossier as a police file: photo with a height chart, file number and status. When it
 * reaches the screen the black bars slide away, the alias and the text fields are typed, the
 * numbers count up and a "Confidencial" stamp falls. Without motion it is shown complete.
 */
@Component({
  selector: 'app-landing-expediente',
  imports: [RouterLink, Reveal, Iman, Foco],
  templateUrl: './expediente.section.html',
  styleUrl: './expediente.section.css',
})
export class ExpedienteSection {
  protected readonly expediente = EXPEDIENTE;
  protected readonly ficha = FICHA;
  protected readonly cta = CTA;
  protected readonly alias = signal(EXPEDIENTE.alias);
  protected readonly valores = signal(EXPEDIENTE.muestra.map((d) => formato(d)));
  protected readonly revelando = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly crupier = inject(Crupier);
  private detener: (() => void)[] = [];

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.cancelar());
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) return;
      const hoja = this.host.nativeElement.querySelector('.archivo');
      if (!hoja) return;
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            observador.disconnect();
            this.revelar();
            this.crupier.decir(CRUPIER.expediente, true);
          }
        },
        { threshold: 0.4 },
      );
      observador.observe(hoja);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  protected repetir(): void {
    if (prefiereMenosMovimiento()) return;
    this.revelando.set(false);
    // Next frame, so the CSS animations start again.
    requestAnimationFrame(() => this.revelar());
  }

  private revelar(): void {
    this.cancelar();
    this.revelando.set(true);
    const actuales = EXPEDIENTE.muestra.map(() => '');
    this.valores.set(actuales);

    this.detener.push(escribir(EXPEDIENTE.alias, (t) => this.alias.set(t), 70));

    // Text fields are typed one after the other; numbers count up meanwhile
    EXPEDIENTE.muestra.forEach((d, i) => {
      if (typeof d.valor === 'number') return;
      const texto = d.valor;
      const espera = setTimeout(
        () => {
          this.detener.push(
            escribir(texto, (t) => {
              actuales[i] = t;
              this.valores.set([...actuales]);
            }),
          );
        },
        500 + i * ENTRE_CAMPOS_MS,
      );
      this.detener.push(() => clearTimeout(espera));
    });

    const inicio = performance.now();
    let cuadro = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS);
      const suave = 1 - Math.pow(1 - t, 3);
      EXPEDIENTE.muestra.forEach((d, i) => {
        if (typeof d.valor === 'number') actuales[i] = formato(d, Math.round(d.valor * suave));
      });
      this.valores.set([...actuales]);
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    this.detener.push(() => cancelAnimationFrame(cuadro));
  }

  private cancelar(): void {
    this.detener.forEach((f) => f());
    this.detener = [];
  }
}
