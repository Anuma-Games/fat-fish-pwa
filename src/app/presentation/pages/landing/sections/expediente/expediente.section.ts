import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CTA, DatoExpediente, EXPEDIENTE } from '../../../../../core/config/landing.config';
import { prefiereMenosMovimiento } from '../../motion';
import { Reveal } from '../../reveal.directive';

const DURACION_MS = 1400;

function formato(dato: DatoExpediente, valor = dato.valor): string {
  return typeof valor === 'number'
    ? `${dato.prefijo ?? ''}${valor.toLocaleString('es-MX')}`
    : valor;
}

/**
 * Sample dossier on paper: when it reaches the screen the black bars slide away one by one, the
 * numbers count up and a "Confidencial" stamp falls. Without motion it is shown complete.
 */
@Component({
  selector: 'app-landing-expediente',
  imports: [RouterLink, Reveal],
  templateUrl: './expediente.section.html',
  styleUrl: './expediente.section.css',
})
export class ExpedienteSection {
  protected readonly expediente = EXPEDIENTE;
  protected readonly cta = CTA;
  protected readonly valores = signal(EXPEDIENTE.muestra.map((d) => formato(d)));
  protected readonly revelando = signal(false);

  private readonly archivo = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) return;
      const hoja = this.archivo.nativeElement.querySelector('.archivo');
      if (!hoja) return;
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            observador.disconnect();
            this.revelar();
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
    // Next frame, so the CSS animation starts again.
    requestAnimationFrame(() => this.revelar());
  }

  private revelar(): void {
    this.revelando.set(true);
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS);
      const suave = 1 - Math.pow(1 - t, 3);
      this.valores.set(
        EXPEDIENTE.muestra.map((d) =>
          typeof d.valor === 'number' ? formato(d, Math.round(d.valor * suave)) : d.valor,
        ),
      );
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
}
