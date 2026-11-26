import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { LOG_PREFIX } from '../../../core/config/api.config';

/** Reloads the page once the new version is active; the specs replace it. */
export const RECARGAR_PAGINA = new InjectionToken<() => void>('RECARGAR_PAGINA', {
  providedIn: 'root',
  factory: () => {
    const documento = inject(DOCUMENT);
    return () => documento.location.reload();
  },
});

/**
 * New version notice (README 7.4). The service worker downloads a new version in the background,
 * but the page keeps the one it opened with until every tab of the site is closed. When the new
 * version is ready this dialog asks whether to load it now: "Actualizar" activates it and reloads
 * the page; "Ahora no" closes the dialog and the new version applies the next time the app opens.
 * Without the service worker (ng serve) nothing is shown.
 */
@Component({
  selector: 'app-aviso-version',
  templateUrl: './aviso-version.html',
  styleUrl: './aviso-version.css',
  host: { '(document:keydown.escape)': 'ahoraNo()' },
})
export class AvisoVersion {
  private readonly sw = inject(SwUpdate);
  private readonly recargar = inject(RECARGAR_PAGINA);

  protected readonly visible = signal(false);
  protected readonly actualizando = signal(false);

  private readonly actualizar = viewChild<ElementRef<HTMLButtonElement>>('actualizar');

  constructor() {
    if (this.sw.isEnabled) {
      this.sw.versionUpdates
        .pipe(
          filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
          takeUntilDestroyed(inject(DestroyRef)),
        )
        .subscribe((e) => {
          console.info(
            `${LOG_PREFIX} versión nueva lista (${e.latestVersion.hash.slice(0, 8)}), se pregunta si se carga`,
          );
          this.visible.set(true);
        });
    }
    // When the dialog opens, focus goes to the main action
    effect(() => {
      if (this.visible()) setTimeout(() => this.actualizar()?.nativeElement.focus());
    });
  }

  protected async actualizarAhora(): Promise<void> {
    if (this.actualizando()) return;
    this.actualizando.set(true);
    try {
      await this.sw.activateUpdate();
    } catch (error) {
      // The reload still opens the app; if the version could not be activated it keeps the current one
      console.warn(`${LOG_PREFIX} no se pudo activar la versión nueva`, error);
    }
    this.recargar();
  }

  protected ahoraNo(): void {
    if (this.actualizando()) return;
    this.visible.set(false);
  }

  /** Keeps Tab between the two buttons while the dialog is open. */
  protected atrapar(e: Event): void {
    const evento = e as KeyboardEvent;
    const botones = [...(evento.currentTarget as HTMLElement).querySelectorAll('button')];
    const primero = botones[0];
    const ultimo = botones[botones.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }
}
