import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BusquedaFacade } from '../../../application/facades/busqueda.facade';
import { HistorialFacade } from '../../../application/facades/historial.facade';
import { JugadorResumen } from '../../../domain/models/jugador-resumen';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';
import { Iman } from '../landing/iman.directive';
import { escribir, prefiereMenosMovimiento } from '../landing/motion';

/** Time the chosen card takes to stand out before the dossier opens. */
const SALIDA_MS = 420;
/** Pause after the last key before searching while the visitor types. */
const ESPERA_MS = 300;

/** Text worth searching while typing: an ID from its first digit, an alias from two letters. */
function buscable(texto: string): boolean {
  return /^\d+$/.test(texto) || texto.length >= 2;
}

/**
 * Access (README 8.1, docs/diagramas/navegacion.mmd): the visitor looks for a dossier by alias or
 * ID. The alias can repeat, so the search lists every match with its ID; picking one opens its
 * dossier at /perfil. The results appear while the visitor types; a submitted search (Enter or the
 * button) with a single match opens that dossier right away.
 *
 * It looks like the landing page: a hanging lamp over the title, the felt of the table around the
 * search, the Crupier answering in typewriter text and the players dealt like cards.
 */
@Component({
  selector: 'app-acceso-page',
  imports: [FormsModule, PixelIcon, Iman],
  templateUrl: './acceso.page.html',
  styleUrl: './acceso.page.css',
})
export class AccesoPage {
  protected readonly busqueda = inject(BusquedaFacade);
  private readonly historial = inject(HistorialFacade);
  private readonly router = inject(Router);
  private readonly quieto = prefiereMenosMovimiento();
  protected readonly texto = signal(this.busqueda.consulta());
  /** Player whose card is leaving toward the dossier. */
  protected readonly elegido = signal<string | null>(null);
  /** The Crupier's line, as far as it has been typed. */
  protected readonly frase = signal('');
  /**
   * Players on screen: the last answer stays while the next one is on its way, so the list does not
   * blink at every key.
   */
  protected readonly mostrados = signal(this.busqueda.resultados());
  /** True after a submit, so coming back to the page does not reopen the last single match. */
  private enviada = false;
  private salida?: ReturnType<typeof setTimeout>;
  private espera?: ReturnType<typeof setTimeout>;

  /** What the Crupier says for each state of the search (nothing when a notice explains it). */
  private readonly linea = computed(() => {
    const n = this.mostrados().length;
    const lista = n === 1 ? '¿Eres tú?' : `Tengo ${n} con ese nombre. ¿Cuál eres tú?`;
    switch (this.busqueda.estado()) {
      case 'INICIAL':
        return this.busqueda.error() ? '' : 'Dime cómo te llaman en la mesa. Ya te conozco.';
      case 'CARGANDO':
        // While typing, the same line as the list on screen, so it is not typed again at every key
        return n > 0 ? lista : 'Déjame revisar los archivos…';
      case 'CON_DATOS':
      case 'DESDE_CACHE':
        return lista;
      case 'VACIO':
        return `No tengo a nadie llamado «${this.busqueda.consulta()}». Revisa el alias o dime tu ID.`;
      default:
        return '';
    }
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    let detener = () => {};
    effect(() => {
      const linea = this.linea();
      untracked(() => {
        detener();
        detener = escribir(linea, (parcial) => this.frase.set(parcial), 28);
      });
    });
    destroyRef.onDestroy(() => {
      detener();
      clearTimeout(this.salida);
      clearTimeout(this.espera);
    });

    effect(() => {
      const resultados = this.busqueda.resultados();
      if (this.busqueda.estado() !== 'CARGANDO') this.mostrados.set(resultados);
    });

    effect(() => {
      const estado = this.busqueda.estado();
      const resultados = this.busqueda.resultados();
      const conLista = estado === 'CON_DATOS' || estado === 'DESDE_CACHE';
      if (this.enviada && conLista && resultados.length === 1) {
        untracked(() => this.elegir(resultados[0]));
      }
    });
  }

  /** Every key: searches once the visitor stops typing for a moment. */
  protected escribiendo(valor: string): void {
    this.texto.set(valor);
    clearTimeout(this.espera);
    this.espera = setTimeout(() => {
      const texto = this.limpio();
      if (texto === '') {
        this.busqueda.limpiar();
      } else if (buscable(texto) && texto !== this.busqueda.consulta()) {
        this.enviada = false;
        this.busqueda.buscar(texto);
      }
    }, ESPERA_MS);
  }

  protected buscar(): void {
    clearTimeout(this.espera);
    this.enviada = true;
    this.elegido.set(null);
    this.busqueda.buscar(this.limpio());
  }

  /** "#1042" is how the ID is written across the app. */
  private limpio(): string {
    return this.texto().replace(/^\s*#/, '').trim().replace(/\s+/g, ' ');
  }

  protected elegir(jugador: JugadorResumen): void {
    if (this.elegido()) return;
    this.enviada = false;
    // The dossier is asked for right before leaving, so /perfil finds it on its way and does not repeat it
    const abrir = () => {
      this.historial.buscar(jugador.jugadorId);
      void this.router.navigate(['/perfil']);
    };
    if (this.quieto) {
      abrir();
      return;
    }
    // The chosen card lifts and the others fold before the dossier opens
    this.elegido.set(jugador.jugadorId);
    this.salida = setTimeout(abrir, SALIDA_MS);
  }
}
