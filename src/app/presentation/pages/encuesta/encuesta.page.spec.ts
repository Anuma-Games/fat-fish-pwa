import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Encuesta, RespuestaEncuesta } from '../../../domain/models/encuesta';
import { Conectividad } from '../../../domain/ports/conectividad';
import { EncuestaRepository } from '../../../domain/ports/encuesta.repository';
import { OutboxRepository } from '../../../domain/ports/outbox.repository';
import { SesionRepository } from '../../../domain/ports/sesion.repository';
import { ConectividadFalsa, OutboxEnMemoria, SesionFalsa } from '../../../testing/fakes';
import { EncuestaPage } from './encuesta.page';

describe('EncuestaPage', () => {
  let enviadas: Encuesta[];
  let outbox: OutboxEnMemoria;
  let conectividad: ConectividadFalsa;

  beforeEach(async () => {
    enviadas = [];
    outbox = new OutboxEnMemoria();
    conectividad = new ConectividadFalsa();
    await TestBed.configureTestingModule({
      imports: [EncuestaPage],
      providers: [
        provideRouter([]),
        {
          provide: EncuestaRepository,
          useValue: {
            enviar: (d: Encuesta): Observable<RespuestaEncuesta> => {
              enviadas.push(d);
              return of({ id: '9', enviadaEn: new Date() });
            },
          },
        },
        { provide: OutboxRepository, useValue: outbox },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(EncuestaPage);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /** Clicks the value `n` of each question, in order. */
  function responder(el: HTMLElement, ...valores: number[]) {
    const grupos = el.querySelectorAll('.escala');
    valores.forEach((n, i) => (grupos[i].querySelectorAll('button')[n - 1] as HTMLElement).click());
  }

  async function enviar(fixture: { whenStable(): Promise<unknown> }, el: HTMLElement) {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  }

  it('shows the three questions from 1 to 5 and never asks for the alias or the ID', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.escala')).toHaveLength(3);
    expect(el.querySelectorAll('.escala [role="radio"]')).toHaveLength(15);
    expect(el.querySelectorAll('input')).toHaveLength(0);
    expect(el.textContent).not.toMatch(/alias/i);
  });

  it('does not send while a question is unanswered and marks it', async () => {
    const { fixture, el } = await render();
    responder(el, 4, 3);
    await enviar(fixture, el);
    expect(enviadas).toHaveLength(0);
    expect(el.querySelector('.notice.error')?.textContent).toContain('Responde las tres preguntas');
    expect(el.querySelectorAll('.pregunta.faltante')).toHaveLength(1);
  });

  it('sends the answers with the comment and clears the form', async () => {
    const { fixture, el } = await render();
    responder(el, 4, 3, 5);
    const campo = el.querySelector('#comentario') as HTMLTextAreaElement;
    campo.value = ' Me hizo pensar ';
    campo.dispatchEvent(new Event('input'));
    await enviar(fixture, el);
    expect(enviadas).toEqual([
      { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5, comentario: 'Me hizo pensar' },
    ]);
    expect(el.querySelector('.notice.ok')?.textContent).toContain('se guardaron en el servidor');
    expect(el.querySelectorAll('.escala .selected')).toHaveLength(0);
  });

  it('saves the answers on the device without connection', async () => {
    conectividad.enLinea.set(false);
    const { fixture, el } = await render();
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain(
      'Guardar para enviar después',
    );
    responder(el, 2, 2, 2);
    await enviar(fixture, el);
    expect(enviadas).toHaveLength(0);
    expect(el.querySelector('.notice.ok')?.textContent).toContain('Guardado en tu dispositivo');
    expect(el.querySelector('.notice.offline')?.textContent).toContain('Una respuesta espera');
    const [guardada] = await outbox.todos();
    expect(guardada).toMatchObject({ tipo: 'encuesta', estado: 'PENDIENTE' });
  });

  it('updates the notice when the queued answers are sent after reconnecting', async () => {
    conectividad.enLinea.set(false);
    const { fixture, el } = await render();
    responder(el, 2, 2, 2);
    await enviar(fixture, el);
    expect(el.querySelector('.notice.ok')?.textContent).toContain('Guardado en tu dispositivo');

    conectividad.enLinea.set(true);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();

    expect(enviadas).toHaveLength(1);
    expect(el.querySelector('.notice.ok')?.textContent).toContain('ya se guardaron en el servidor');
    expect(el.querySelector('.notice.offline')).toBeNull();
    expect(el.textContent).not.toContain('Se enviará cuando vuelva la conexión');
  });
});
