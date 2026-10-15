import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { Perfil } from '../../domain/models/perfil';
import { PerfilDto } from './dto/partida.dto';

@Injectable({ providedIn: 'root' })
export class PerfilApiRepository {
  private readonly http = inject(HttpClient);

  perfil(jugadorId: string): Observable<Perfil> {
    const params = new HttpParams().set('id', jugadorId);
    return this.http.get<PerfilDto>(`${API_BASE}/perfil`, { params }).pipe(
      map((dto) => ({
        ...dto,
        creadoEn: new Date(dto.creadoEn),
        ultimaActividad: dto.ultimaActividad ? new Date(dto.ultimaActividad) : null,
        generadoEn: new Date(dto.generadoEn),
      })),
    );
  }
}
