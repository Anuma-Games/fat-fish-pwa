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
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--ff-space-2);
      margin-top: var(--ff-space-4);
      max-width: 560px;
    }
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      font-family: var(--ff-font-label);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
      color: var(--ff-fog-400);
      text-decoration: none;
      border-bottom: 2px solid var(--ff-line);
    }
    a.active {
      color: var(--ff-cream-100);
      border-bottom-color: var(--ff-gold-400);
    }
    a:focus-visible {
      outline: none;
      color: var(--ff-gold-400);
    }
  `,
})
export class OpinionTabs {
  protected readonly pestanas = [
    { ruta: '/opinion/retroalimentacion', texto: 'Retroalimentación' },
    { ruta: '/opinion/encuesta', texto: 'Encuesta' },
  ];
}
