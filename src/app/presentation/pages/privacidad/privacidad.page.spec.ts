import { TestBed } from '@angular/core/testing';
import { PrivacidadPage } from './privacidad.page';

describe('PrivacidadPage', () => {
  async function abrir(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [PrivacidadPage] }).compileComponents();
    const fixture = TestBed.createComponent(PrivacidadPage);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the title and the nine sections of the notice', async () => {
    const pagina = await abrir();
    expect(pagina.querySelector('h1')?.textContent).toContain('Aviso de privacidad');
    expect(pagina.querySelectorAll('section h2').length).toBe(9);
  });

  it('links the contact email in the responsible and rights sections', async () => {
    const pagina = await abrir();
    const enlaces = Array.from(pagina.querySelectorAll('a[href^="mailto:"]'));
    expect(enlaces.length).toBe(2);
    for (const enlace of enlaces) {
      expect(enlace.getAttribute('href')).toBe('mailto:anumagames@gmail.com');
    }
  });

  it('names the data processed, the guest mode and the anonymous forms', async () => {
    const texto = (await abrir()).textContent ?? '';
    expect(texto).toContain('BCrypt');
    expect(texto).toContain('Si juegas como invitado, no se envía nada');
    expect(texto).toContain('anónimas');
    expect(texto).toContain('Derechos ARCO');
    expect(texto).toContain('15 años o más');
  });

  it('tells that the API uses the IP only in memory to limit requests', async () => {
    const texto = (await abrir()).textContent ?? '';
    expect(texto).toContain('La API usa tu IP solo en memoria');
    expect(texto).toContain('No la guarda en la base de datos');
  });
});
