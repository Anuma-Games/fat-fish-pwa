import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AvisoVersion, RECARGAR_PAGINA } from './aviso-version';

/** Service worker double: the spec decides when a version is ready and records each activation. */
class SwUpdateFalso {
  readonly versionUpdates = new Subject<VersionEvent>();
  activaciones = 0;
  constructor(readonly isEnabled = true) {}
  async activateUpdate(): Promise<boolean> {
    this.activaciones++;
    return true;
  }
}

const listaParaCargar: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'a1b2c3d4e5' },
  latestVersion: { hash: 'f6e5d4c3b2' },
};

describe('AvisoVersion', () => {
  let sw: SwUpdateFalso;
  let recargas: number;

  async function abrir(conServiceWorker = true): Promise<() => Promise<HTMLElement>> {
    sw = new SwUpdateFalso(conServiceWorker);
    recargas = 0;
    await TestBed.configureTestingModule({
      imports: [AvisoVersion],
      providers: [
        { provide: SwUpdate, useValue: sw },
        { provide: RECARGAR_PAGINA, useValue: () => recargas++ },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AvisoVersion);
    await fixture.whenStable();
    return async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
  }

  const boton = (vista: HTMLElement, texto: string) =>
    [...vista.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!;

  it('shows nothing until a new version is ready', async () => {
    const vista = await abrir();
    expect((await vista()).querySelector('[role="alertdialog"]')).toBeNull();

    sw.versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'f6e5d4c3b2' } });
    expect((await vista()).querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('asks whether to load the new version, with "Actualizar" on the right', async () => {
    const vista = await abrir();
    sw.versionUpdates.next(listaParaCargar);
    const dialogo = (await vista()).querySelector('[role="alertdialog"]');

    expect(dialogo?.querySelector('h2')?.textContent).toContain('¿Cargar la versión nueva?');
    const textos = [...dialogo!.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(textos).toEqual(['Ahora no', 'Actualizar']);
  });

  it('"Actualizar" activates the new version and reloads the page', async () => {
    const vista = await abrir();
    sw.versionUpdates.next(listaParaCargar);
    boton(await vista(), 'Actualizar').click();

    await vi.waitFor(() => expect(recargas).toBe(1));
    expect(sw.activaciones).toBe(1);
  });

  it('reloads the page even if the activation fails', async () => {
    const vista = await abrir();
    sw.activateUpdate = () => Promise.reject(new Error('sin red'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    sw.versionUpdates.next(listaParaCargar);
    boton(await vista(), 'Actualizar').click();

    await vi.waitFor(() => expect(recargas).toBe(1));
  });

  it('"Ahora no" closes the dialog without activating or reloading', async () => {
    const vista = await abrir();
    sw.versionUpdates.next(listaParaCargar);
    boton(await vista(), 'Ahora no').click();

    expect((await vista()).querySelector('[role="alertdialog"]')).toBeNull();
    expect(sw.activaciones).toBe(0);
    expect(recargas).toBe(0);
  });

  it('Escape works as "Ahora no"', async () => {
    const vista = await abrir();
    sw.versionUpdates.next(listaParaCargar);
    await vista();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect((await vista()).querySelector('[role="alertdialog"]')).toBeNull();
    expect(recargas).toBe(0);
  });

  it('shows nothing when the service worker is disabled', async () => {
    const vista = await abrir(false);
    sw.versionUpdates.next(listaParaCargar);

    expect((await vista()).querySelector('[role="alertdialog"]')).toBeNull();
  });
});
