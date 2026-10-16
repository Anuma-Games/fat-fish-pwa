import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CTA, HERO } from '../../../../../core/config/landing.config';

/** European wheel order, from the 0 clockwise. */
const ORDEN = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

interface Casilla {
  numero: number;
  d: string;
  color: string;
  x: number;
  y: number;
  giro: number;
}

/** Pockets of the decorative wheel, drawn in a -110..110 viewBox. */
function casillas(): Casilla[] {
  const paso = (Math.PI * 2) / ORDEN.length;
  const punto = (r: number, a: number) =>
    `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return ORDEN.map((numero, i) => {
    const a0 = i * paso - paso / 2;
    const a1 = a0 + paso;
    return {
      numero,
      d: `M ${punto(52, a0)} L ${punto(96, a0)} A 96 96 0 0 1 ${punto(96, a1)} L ${punto(52, a1)} A 52 52 0 0 0 ${punto(52, a0)} Z`,
      color:
        numero === 0 ? 'var(--ff-felt-700)' : ROJOS.has(numero) ? 'var(--ff-ruby-700)' : '#111',
      x: +(86 * Math.sin(i * paso)).toFixed(2),
      y: +(-86 * Math.cos(i * paso)).toFixed(2),
      giro: +((i * paso * 180) / Math.PI).toFixed(1),
    };
  });
}

/** First screen: title, claim and the two calls to action over the table, with a wheel that turns on scroll. */
@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink],
  templateUrl: './hero.section.html',
  styleUrl: './hero.section.css',
})
export class HeroSection {
  protected readonly hero = HERO;
  protected readonly cta = CTA;
  protected readonly casillas = casillas();
  protected readonly radios = [0, 90, 180, 270];
}
