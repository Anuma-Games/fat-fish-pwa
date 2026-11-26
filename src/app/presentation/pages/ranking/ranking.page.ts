import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RankingFacade } from '../../../application/facades/ranking.facade';
import { CabeceraPagina } from '../../components/cabecera-pagina/cabecera-pagina';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

/** Chips of the game for the podium: the most valuable one for the first place. */
const FICHAS_PODIO = ['ficha-100', 'ficha-50', 'ficha-25'];

/**
 * World ranking (/ranking): the top 50 in 5 pages of 10, with the visitor's own position fixed
 * at the bottom of the screen when the visitor consulted a profile before. Without connection
 * it shows the copy saved by the Service Worker with its date.
 *
 * Each page of 10 is dealt on the table like cards, and the first three places wear the chips of
 * the game.
 */
@Component({
  selector: 'app-ranking-page',
  imports: [DatePipe, DecimalPipe, RouterLink, PixelIcon, CabeceraPagina],
  templateUrl: './ranking.page.html',
  styleUrl: './ranking.page.css',
})
export class RankingPage {
  protected readonly facade = inject(RankingFacade);

  /** Page numbers for the pager, 0-based. */
  protected readonly paginas = computed(() =>
    Array.from({ length: this.facade.totalPaginas() }, (_, i) => i),
  );

  constructor() {
    this.facade.cargar();
  }

  /** Image of the chip of a podium place (1 to 3), for the `--ficha` of its position. */
  protected ficha(posicion: number): string {
    return `url(img/landing/fichas/${FICHAS_PODIO[posicion - 1]}.png)`;
  }
}
