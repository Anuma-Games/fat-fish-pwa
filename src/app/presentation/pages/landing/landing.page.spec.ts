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

  it('explains how to play without counting rounds or naming conditions', async () => {
    const el = await render();
    expect(el.querySelectorAll('.pasos li').length).toBe(5);
    const texto = el.textContent ?? '';
    expect(texto).not.toMatch(/nueve rondas|9 rondas/i);
    expect(texto).not.toMatch(/Ruina financiera|Aislamiento|Pérdida familiar/);
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
