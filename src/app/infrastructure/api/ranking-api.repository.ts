import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { EntradaRanking, PaginaRanking } from '../../domain/models/ranking';
import { RankingRepository } from '../../domain/ports/ranking.repository';
import { EntradaRankingDto, RankingDto } from './dto/ranking.dto';

const toEntrada = (dto: EntradaRankingDto): EntradaRanking => ({
  ...dto,
  logradoEn: new Date(dto.logradoEn),
});

@Injectable({ providedIn: 'root' })
export class RankingApiRepository implements RankingRepository {
  private readonly http = inject(HttpClient);

  /** The Service Worker caches each URL, so the same page with the same player ID is available offline. */
  pagina(pagina: number, jugadorId: string | null): Observable<PaginaRanking> {
    let params = new HttpParams().set('pagina', pagina);
    if (jugadorId) {
      params = params.set('jugadorId', jugadorId);
    }
    return this.http.get<RankingDto>(`${API_BASE}/ranking`, { params }).pipe(
      map((dto) => ({
        contenido: dto.pagina.contenido.map(toEntrada),
        pagina: dto.pagina.pagina,
        tamano: dto.pagina.tamano,
        totalElementos: dto.pagina.totalElementos,
        ultima: dto.pagina.ultima,
        miPosicion: dto.miPosicion ? toEntrada(dto.miPosicion) : null,
        generadoEn: new Date(dto.pagina.generadoEn),
      })),
    );
  }
}
