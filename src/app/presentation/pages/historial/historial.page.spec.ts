import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { Pagina, Partida } from '../../../domain/models/partida';
import { Perfil } from '../../../domain/models/perfil';
import { Conectividad } from '../../../domain/ports/conectividad';
import { PartidaRepository } from '../../../domain/ports/partida.repository';
import { PerfilRepository } from '../../../domain/ports/perfil.repository';
import { SesionRepository } from '../../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa } from '../../../testing/fakes';
import { expedienteGuard } from './expediente.guard';
import { HistorialPage } from './historial.page';

const generadoEn = new Date('2026-10-15T00:00:00Z');

const perfil = (jugadorId: string): Perfil => ({
  jugadorId,
  alias: 'Tiburon',
  creadoEn: generadoEn,
  ultimaActividad: null,
  estadisticas: {
    partidasTotales: 3,
    partidasGanadas: 1,
    totalInvertido: 100,
    totalPerdido: 50,
    rachaDerrotasMax: 1,
    tiempoJugadoSeg: 600,
  },
  generadoEn,
});

const sinPartidas: Pagina<Partida> = {
  contenido: [],
  pagina: 0,
  tamano: 10,
  totalElementos: 0,
  ultima: true,
  generadoEn,
};

@Component({ template: 'Buscador' })
class AccesoFalso {}

describe('Expediente (/perfil)', () => {
  let sesion: SesionFalsa;
  let consultados: string[];

  beforeEach(() => {
    sesion = new SesionFalsa();
    consultados = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'perfil', component: HistorialPage, canActivate: [expedienteGuard] },
          { path: 'acceso', component: AccesoFalso },
        ]),
        {
          provide: PerfilRepository,
          useValue: {
            perfil: (id: string) => {
              consultados.push(id);
              return of(perfil(id));
            },
          },
        },
        { provide: PartidaRepository, useValue: { historial: () => of(sinPartidas) } },
        { provide: Conectividad, useValue: new ConectividadFalsa() },
        { provide: SesionRepository, useValue: sesion },
      ],
    });
  });

  it('sends a visitor who has not looked up anyone to the search', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/perfil');
    expect(TestBed.inject(Router).url).toBe('/acceso');
    expect(harness.routeNativeElement?.textContent).toContain('Buscador');
    expect(consultados).toEqual([]);
  });

  it('opens the dossier of the player consulted last time, without a search of its own', async () => {
    sesion.id = '6';
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/perfil');
    const el = harness.routeNativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/perfil');
    expect(consultados).toEqual(['6']);
    expect(el.querySelector('.alias')?.textContent).toContain('Tiburon');
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('a.otro')?.getAttribute('href')).toBe('/acceso');
  });
});
