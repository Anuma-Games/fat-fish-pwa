import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing.page';

describe('LandingPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('lets the visitor spin the wheel and lands on a real number', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.mesa') as HTMLButtonElement).click();
    await esperar(60);
    await fixture.whenStable();
    const texto = el.querySelector('.resultado')?.textContent ?? '';
    expect(texto).toMatch(/Salió el (\d+), (rojo|negro|verde)\./);
    const numero = Number(texto.match(/\d+/)?.[0]);
    expect(numero).toBeGreaterThanOrEqual(0);
    expect(numero).toBeLessThanOrEqual(36);
    expect(el.querySelector('.ficha dl')?.textContent).toContain('1 vez');
  });

  it('"Otra ronda" counts a restart in the visit dossier', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const otra = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Otra ronda'),
    );
    otra!.click();
    await fixture.whenStable();
    expect(el.querySelector('.ficha dl')?.textContent).toMatch(/Volviste a empezar\s*1 vez/);
  });

  it('opens the side menu from the hamburger and closes it with Escape', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const boton = el.querySelector('.hamburguesa') as HTMLButtonElement;
    const panel = el.querySelector('#lp-menu') as HTMLElement;
    expect(panel.hasAttribute('inert')).toBe(true);
    boton.click();
    await fixture.whenStable();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('explains how to play without counting rounds or naming conditions', async () => {
    const el = await render();
    expect(el.querySelectorAll('.pasos li').length).toBe(5);
    const texto = el.textContent ?? '';
    expect(texto).not.toMatch(/nueve rondas|9 rondas/i);
    expect(texto).not.toMatch(/Ruina financiera|Aislamiento|Pérdida familiar/);
  });

  it('uses words for the general public: no "PWA", no university, no middle dot', async () => {
    const el = await render();
    const texto = el.textContent ?? '';
    expect(texto).not.toMatch(/PWA/);
    expect(texto).not.toMatch(/UTCH|Universidad|IDGS101N/);
    expect(texto).not.toContain('·');
    expect(texto).not.toContain('150 × 1.5');
  });

  it('links the side menu to Expediente and Opinión', async () => {
    const el = await render();
    const rutas = [...el.querySelectorAll('#lp-menu a')].map((a) => a.getAttribute('href'));
    expect(rutas).toContain('/perfil');
    expect(rutas).toContain('/opinion/retroalimentacion');
  });

  it('has no video', async () => {
    const el = await render();
    expect(el.querySelector('video')).toBeNull();
  });

  it('shows the sample dossier complete before any animation', async () => {
    const el = await render();
    const valores = [...el.querySelectorAll('.archivo dd')].map((d) => d.textContent?.trim());
    expect(valores).toContain('$8,800');
    expect(valores).toContain('Automóvil');
  });

  it('only offers the itch.io demo, without a Steam link', async () => {
    const el = await render();
    expect(el.textContent).not.toContain('Steam');
  });
});
