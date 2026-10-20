import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CTA, EQUIPO, PREGUNTAS } from '../../../core/config/landing.config';
import { Crupier } from './crupier';
import { seguirAvance } from './motion';
import { Reveal } from './reveal.directive';
import { CrupierVoz } from './sections/crupier-voz/crupier-voz';
import { CierreSection } from './sections/cierre/cierre.section';
import { ComoSeJuegaSection } from './sections/como-se-juega/como-se-juega.section';
import { ComodinesSection } from './sections/comodines/comodines.section';
import { ExpedienteSection } from './sections/expediente/expediente.section';
import { HeroSection } from './sections/hero/hero.section';
import { MensajeSection } from './sections/mensaje/mensaje.section';
import { VisitHud } from './sections/visit-hud/visit-hud';
import { SonidoMesa } from './sonido-mesa';
import { VisitDossier } from './visit-dossier';

/**
 * Landing page of the promotion site ("La mesa te observa"). Its route data (`layout: 'landing'`)
 * hides the app shell, so the page takes the whole window. It is design only: every text comes from
 * `core/config/landing.config.ts`, and the visit dossier lives in memory (VisitDossier), without
 * any service, storage or API call of the PWA. The Crupier's lines and the optional room sound
 * (SonidoMesa) live here too, and nothing plays until the visitor turns the sound on.
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
    CrupierVoz,
  ],
  providers: [VisitDossier, Crupier, SonidoMesa],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css',
})
export class LandingPage {
  protected readonly cta = CTA;
  protected readonly equipo = EQUIPO;
  protected readonly preguntas = PREGUNTAS;
  protected readonly sonido = inject(SonidoMesa);

  constructor() {
    const visita = inject(VisitDossier);
    const crupier = inject(Crupier);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      visita.iniciar(host);
      crupier.iniciar();
      destroyRef.onDestroy(seguirAvance(host));
    });
  }
}
