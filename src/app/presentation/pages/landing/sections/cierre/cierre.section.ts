import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CTA, PLATAFORMAS } from '../../../../../core/config/landing.config';
import { Foco } from '../../foco.directive';
import { Iman } from '../../iman.directive';
import { Reveal } from '../../reveal.directive';
import { VisitDossier } from '../../visit-dossier';

/**
 * Closing: the full dossier of this visit, then the call to play the demo and "Otra ronda", which
 * takes the visitor back to the start (the run never says it ends).
 */
@Component({
  selector: 'app-landing-cierre',
  imports: [DecimalPipe, Reveal, Iman, Foco],
  templateUrl: './cierre.section.html',
  styleUrl: './cierre.section.css',
})
export class CierreSection {
  protected readonly visita = inject(VisitDossier);
  protected readonly cta = CTA;
  protected readonly plataformas = PLATAFORMAS;
}
