import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { JugadorResumen } from '../../domain/models/jugador-resumen';
import { Conectividad } from '../../domain/ports/conectividad';
import { JugadorRepository } from '../../domain/ports/jugador.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa } from '../../testing/fakes';
import { BusquedaFacade, validarBusqueda } from './busqueda.facade';

describe('BusquedaFacade', () => {
  const pezgordo: JugadorResumen = { jugadorId: '1042', alias: 'pezgordo' };
  let respuesta: Observable<JugadorResumen[]>;
  let consultas: string[];
  let conectividad: ConectividadFalsa;
  let facade: BusquedaFacade;

  beforeEach(() => {
    consultas = [];
    respuesta = of([pezgordo]);
    conectividad = new ConectividadFalsa();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: JugadorRepository,
          useValue: {
            buscar: (texto: string) => {
              consultas.push(texto);
              return respuesta;
            },
          },
        },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    });
    facade = TestBed.inject(BusquedaFacade);
  });

  it('validates the text before asking the API', () => {
    expect(validarBusqueda('1042')).toBeNull();
    expect(validarBusqueda('pe')).toBeNull();
    expect(validarBusqueda('a'.repeat(24))).toBeNull();
    expect(validarBusqueda('a'.repeat(25))).toContain('hasta 24');
  });

  it('lists the players found, with normalised text', () => {
    facade.buscar('  pezgordo  ');
    expect(consultas).toEqual(['pezgordo']);
    expect(facade.estado()).toBe('CON_DATOS');
    expect(facade.resultados()).toEqual([pezgordo]);
  });

  it('does not call the API for an invalid text', () => {
    facade.buscar('a'.repeat(25));
    expect(consultas).toEqual([]);
    expect(facade.estado()).toBe('INICIAL');
    expect(facade.error()).toContain('hasta 24');
  });

  it('reports VACIO when nobody matches', () => {
    respuesta = of([]);
    facade.buscar('nadie');
    expect(facade.estado()).toBe('VACIO');
  });

  it('reports DESDE_CACHE when the list arrives without connection', () => {
    conectividad.enLinea.set(false);
    facade.buscar('pezgordo');
    expect(facade.estado()).toBe('DESDE_CACHE');
  });

  it('reports SIN_RED on a network failure and ERROR on a server failure', () => {
    respuesta = throwError(() => new HttpErrorResponse({ status: 504 }));
    facade.buscar('pezgordo');
    expect(facade.estado()).toBe('SIN_RED');
    respuesta = throwError(() => new HttpErrorResponse({ status: 500 }));
    facade.buscar('pezgordo');
    expect(facade.estado()).toBe('ERROR');
    expect(facade.error()).toBeTruthy();
  });

  it('ignores the answer of a search that a newer one replaced', () => {
    const lenta = new Subject<JugadorResumen[]>();
    respuesta = lenta;
    facade.buscar('pezgordo');
    respuesta = of([{ jugadorId: '2', alias: 'ruletero' }]);
    facade.buscar('ruletero');
    lenta.next([pezgordo]);
    expect(facade.resultados().map((j) => j.alias)).toEqual(['ruletero']);
  });

  it('goes back to INICIAL with limpiar()', () => {
    facade.buscar('pezgordo');
    facade.limpiar();
    expect(facade.estado()).toBe('INICIAL');
    expect(facade.resultados()).toEqual([]);
    expect(facade.consulta()).toBe('');
  });
});
