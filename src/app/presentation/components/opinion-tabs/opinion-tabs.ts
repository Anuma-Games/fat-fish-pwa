import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Tabs of the Opinión section (README 8.1): feedback and the anonymous survey. */
@Component({
  selector: 'app-opinion-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Secciones de Opinión">
      @for (t of pestanas; track t.ruta) {
        <a
          [routerLink]="t.ruta"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          {{ t.texto }}
        </a>
      }
    </nav>
  `,
  styles: `
    /* Like the links of the top bar: pixel labels, gold when lit */
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-top: var(--ff-space-6);
      border-bottom: 2px solid var(--ff-line);
    }
    a {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      font-family: var(--ff-font-label);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
      color: var(--ff-fog-400);
      text-decoration: none;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;
    }
    a:hover,
    a:focus-visible {
      outline: none;
      color: var(--ff-gold-400);
    }
    /* Current tab: lit by the lamp, with a gold edge over the line of the table */
    a.active {
      color: var(--ff-cream-100);
      background: linear-gradient(transparent, rgb(232 184 80 / 10%));
    }
    a.active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 3px;
      background: var(--ff-gold-400);
    }
    @media (prefers-reduced-motion: reduce) {
      a {
        transition: none;
      }
    }
  `,
})
export class OpinionTabs {
  protected readonly pestanas = [
    { ruta: '/opinion/retroalimentacion', texto: 'Retroalimentación' },
    { ruta: '/opinion/encuesta', texto: 'Encuesta' },
  ];
}
