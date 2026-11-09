import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Conectividad } from '../../../domain/ports/conectividad';
import { OutboxRepository } from '../../../domain/ports/outbox.repository';
import { RetroalimentacionRepository } from '../../../domain/ports/retroalimentacion.repository';
import { SesionRepository } from '../../../domain/ports/sesion.repository';
import { ConectividadFalsa, OutboxEnMemoria, SesionFalsa } from '../../../testing/fakes';
import { RetroalimentacionPage } from './retroalimentacion.page';

describe('RetroalimentacionPage', () => {
  let enviadas: string[];
  let outbox: OutboxEnMemoria;
  let conectividad: ConectividadFalsa;

  beforeEach(async () => {
    enviadas = [];
    outbox = new OutboxEnMemoria();
    conectividad = new ConectividadFalsa();
    await TestBed.configureTestingModule({
      imports: [RetroalimentacionPage],
      providers: [
        provideRouter([]),
        {
          provide: RetroalimentacionRepository,
          useValue: {
            enviar: (_d: unknown, clave: string) => {
              enviadas.push(clave);
              return of({ id: '7', creadaEn: new Date() });
            },
          },
        },
        { provide: OutboxRepository, useValue: outbox },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    }).compileComponents();
  });

  /** Renders the page, types `mensaje` and submits the form. */
  async function enviar(mensaje: string) {
    const fixture = TestBed.createComponent(RetroalimentacionPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const campo = el.querySelector('#mensaje') as HTMLTextAreaElement;
    campo.value = mensaje;
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    return el;
  }

  it('shows only the form, without the outbox table of the test lab', async () => {
    const fixture = TestBed.createComponent(RetroalimentacionPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).not.toContain('laboratorio');
  });

  it('tells the visitor the message reached the server', async () => {
    const el = await enviar('Me gustaría ver mi historial filtrado');
    expect(enviadas).toHaveLength(1);
    expect(el.querySelector('.notice')?.textContent).toContain(
      'Tu mensaje se guardó en el servidor',
    );
  });

  it('keeps the message on the device without connection', async () => {
    conectividad.enLinea.set(false);
    const el = await enviar('La bola se quedó girando en la ronda 3');
    expect(enviadas).toHaveLength(0);
    expect(el.querySelector('.notice')?.textContent).toContain('Guardado en tu dispositivo');
    const [pendiente] = await outbox.todos();
    expect(pendiente.estado).toBe('PENDIENTE');
  });
});
