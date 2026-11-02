import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { JugadorResumen } from '../../domain/models/jugador-resumen';
import { JugadorRepository } from '../../domain/ports/jugador.repository';
import { JugadorResumenDto } from './dto/jugador.dto';

@Injectable({ providedIn: 'root' })
export class JugadorApiRepository implements JugadorRepository {
  private readonly http = inject(HttpClient);

  buscar(texto: string): Observable<JugadorResumen[]> {
    const params = new HttpParams().set('busqueda', texto);
    return this.http
      .get<JugadorResumenDto[]>(`${API_BASE}/jugadores`, { params })
      .pipe(map((dtos) => dtos.map(({ jugadorId, alias }) => ({ jugadorId, alias }))));
  }
}