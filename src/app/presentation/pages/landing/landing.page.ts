import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CTA, EQUIPO, PREGUNTAS } from '../../../core/config/landing.config';
import { seguirAvance } from './motion';
import { Reveal } from './reveal.directive';
import { CierreSection } from './sections/cierre/cierre.section';
import { ComoSeJuegaSection } from './sections/como-se-juega/como-se-juega.section';
import { ComodinesSection } from './sections/comodines/comodines.section';
import { ExpedienteSection } from './sections/expediente/expediente.section';
import { HeroSection } from './sections/hero/hero.section';
import { MensajeSection } from './sections/mensaje/mensaje.section';
import { VisitHud } from './sections/visit-hud/visit-hud';
import { VisitDossier } from './visit-dossier';

/**
 * Landing page of the promotion site ("La mesa te observa"). Its route data (`layout: 'landing'`)
 * hides the app shell, so the page takes the whole window. It is design only: every text comes from
 * `core/config/landing.config.ts`, and the visit dossier lives in memory (VisitDossier), without
 * any service, storage or API call of the PWA.
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    Reveal,
    HeroSection,
    ComoSeJuegaSection,
    ComodinesSection,
    ExpedienteSection,
    MensajeSection,
    CierreSection,
    VisitHud,
  ],
  providers: [VisitDossier],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css',
})
export class LandingPage {
  protected readonly cta = CTA;
  protected readonly equipo = EQUIPO;
  protected readonly preguntas = PREGUNTAS;

  constructor() {
    const visita = inject(VisitDossier);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      visita.iniciar(host);
      destroyRef.onDestroy(seguirAvance(host));
    });
  }
}
