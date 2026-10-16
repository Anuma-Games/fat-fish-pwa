import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CTA, PLATAFORMAS } from '../../../../../core/config/landing.config';
import { Reveal } from '../../reveal.directive';
import { VisitDossier } from '../../visit-dossier';

/** Closing: the full dossier of this visit, then the call to play the demo. */
@Component({
  selector: 'app-landing-cierre',
  imports: [DecimalPipe, Reveal],
  templateUrl: './cierre.section.html',
  styleUrl: './cierre.section.css',
})
export class CierreSection {
  protected readonly visita = inject(VisitDossier);
  protected readonly cta = CTA;
  protected readonly plataformas = PLATAFORMAS;
}
