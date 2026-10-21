import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { Pagina, Partida } from '../../domain/models/partida';
import { PartidaRepository } from '../../domain/ports/partida.repository';
import { PaginaDto, PartidaDto } from './dto/partida.dto';

@Injectable({ providedIn: 'root' })
export class PartidaApiRepository implements PartidaRepository {
  private readonly http = inject(HttpClient);

  historial(jugadorId: string, pagina = 0, tamano = 10): Observable<Pagina<Partida>> {
    const params = new HttpParams()
      .set('id', jugadorId)
      .set('pagina', pagina)
      .set('tamano', tamano);
    return this.http.get<PaginaDto<PartidaDto>>(`${API_BASE}/partidas`, { params }).pipe(
      map((dto) => ({
        contenido: dto.contenido.map((p) => ({ ...p, creadaEn: new Date(p.creadaEn) })),
        pagina: dto.pagina,
        tamano: dto.tamano,
        totalElementos: dto.totalElementos,
        ultima: dto.ultima,
        generadoEn: new Date(dto.generadoEn),
      })),
    );
  }
}
