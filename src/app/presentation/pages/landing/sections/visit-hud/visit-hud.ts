import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { esTelefono } from '../../motion';
import { VisitDossier } from '../../visit-dossier';

/**
 * Small floating sheet that fills in while the visitor scrolls. It appears after the first screen
 * and hides from the closing section on, which shows the same data in full. Folded by default on phones.
 */
@Component({
  selector: 'app-landing-visit-hud',
  imports: [DecimalPipe],
  templateUrl: './visit-hud.html',
  styleUrl: './visit-hud.css',
  host: { '[class.visible]': 'visible()', '[attr.inert]': "visible() ? null : ''" },
})
export class VisitHud {
  protected readonly visita = inject(VisitDossier);
  protected readonly abierto = signal(!esTelefono());
  protected readonly visible = computed(
    () => this.visita.fueraDelInicio() && !this.visita.enCierre(),
  );
}
