import { Component } from '@angular/core';
import { PASOS, PILARES, VUELTA } from '../../../../../core/config/landing.config';
import { PixelIcon } from '../../../../components/pixel-icon/pixel-icon';
import { Reveal } from '../../reveal.directive';

/** Bars of the rising goal; they fade out to the right instead of ending. */
const BARRAS = 16;

/**
 * "Cómo se juega": the loop of one round (bet, spin, score, goal, shop) that returns to the table
 * with a higher goal. It does not say how many rounds a run has.
 */
@Component({
  selector: 'app-landing-como-se-juega',
  imports: [PixelIcon, Reveal],
  templateUrl: './como-se-juega.section.html',
  styleUrl: './como-se-juega.section.css',
})
export class ComoSeJuegaSection {
  protected readonly pasos = PASOS;
  protected readonly vuelta = VUELTA;
  protected readonly pilares = PILARES;
  protected readonly metas = Array.from({ length: BARRAS }, (_, i) =>
    Math.round(10 + 90 * Math.pow(i / (BARRAS - 1), 1.6)),
  );
}
