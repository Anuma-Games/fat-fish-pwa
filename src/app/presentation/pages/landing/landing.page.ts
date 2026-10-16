import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CTA,
  EQUIPO,
  EXPEDIENTE,
  HERO,
  MECANICAS,
  PILARES,
  PLATAFORMAS,
  PREGUNTAS,
} from '../../../core/config/landing.config';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

/**
 * Landing page of the promotion site. It has no route data (`layout: 'landing'`), so the app shell
 * (top bar and side menu) is hidden and the page takes the whole window.
 * Every text and link comes from `core/config/landing.config.ts`.
 */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, PixelIcon],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css',
})
export class LandingPage {
  protected readonly cta = CTA;
  protected readonly hero = HERO;
  protected readonly expediente = EXPEDIENTE;
  protected readonly pilares = PILARES;
  protected readonly mecanicas = MECANICAS;
  protected readonly plataformas = PLATAFORMAS;
  protected readonly equipo = EQUIPO;
  protected readonly preguntas = PREGUNTAS;
}
