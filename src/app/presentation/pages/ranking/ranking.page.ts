import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RankingFacade } from '../../../application/facades/ranking.facade';
import { PixelIcon } from '../../components/pixel-icon/pixel-icon';

/**
 * World ranking (/ranking): the top 50 in 5 pages of 10, with the visitor's own position fixed
 * at the bottom of the screen when the visitor consulted a profile before. Without connection
 * it shows the copy saved by the Service Worker with its date.
 */
@Component({
  selector: 'app-ranking-page',
  imports: [DatePipe, DecimalPipe, RouterLink, PixelIcon],
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
}
