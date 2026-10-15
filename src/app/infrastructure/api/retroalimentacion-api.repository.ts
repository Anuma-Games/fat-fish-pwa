import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { Retroalimentacion } from '../../domain/models/retroalimentacion';
import { RetroalimentacionResponseDto } from './dto/partida.dto';

@Injectable({ providedIn: 'root' })
export class RetroalimentacionApiRepository {
  private readonly http = inject(HttpClient);

  /** The key makes retries safe: the API stores each key only once. */
  enviar(
    datos: Retroalimentacion,
    idempotencyKey: string,
  ): Observable<RetroalimentacionResponseDto> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<RetroalimentacionResponseDto>(`${API_BASE}/retroalimentacion`, datos, {
      headers,
    });
  }
}
