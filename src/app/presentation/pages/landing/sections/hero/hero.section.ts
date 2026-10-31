import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRUPIER, CTA, HERO, RULETA } from '../../../../../core/config/landing.config';
import { Crupier } from '../../crupier';
import { Iman } from '../../iman.directive';
import { prefiereMenosMovimiento } from '../../motion';
import { Rodado, SonidoMesa } from '../../sonido-mesa';
import { VisitDossier } from '../../visit-dossier';
import { iniciarFondo } from './fondo-remolino';

/** European wheel order, from the 0 clockwise. */
const ORDEN = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** Specks of dust floating in the lamp light (fixed positions, so the page looks the same each load). */
const POLVO = Array.from({ length: 16 }, (_, i) => ({
  x: 38 + ((i * 37) % 25),
  y: 18 + ((i * 53) % 70),
  tam: 1 + (i % 3),
  retraso: -((i * 1.7) % 9),
  duracion: 8 + (i % 5) * 2,
}));

/** Chips the swirl drags into the wheel (fixed values, so the page looks the same each load). */
const FICHAS = ['ficha-5', 'ficha-10', 'ficha-25', 'ficha-50', 'ficha-100'];
const ARRASTRADAS = Array.from({ length: 8 }, (_, i) => ({
  ficha: FICHAS[(i * 3) % FICHAS.length],
  tam: 28 + ((i * 7) % 4) * 6,
  vuelta: 26 + ((i * 11) % 5) * 6,
  caida: 18 + ((i * 5) % 4) * 5,
  retraso: -((i * 4.3) % 22),
  // Spread around the wheel instead of all starting on the same side
  desfase: -(i / 8) * (26 + ((i * 11) % 5) * 6),
}));

/** Radii of the ball (on the track and in a pocket) and size of the viewBox. */
const R_PISTA = 111;
const R_BOLSA = 72;
const TAM = 260;
const GRADOS = 360 / ORDEN.length;
/** Faster than this the clicks of the ball would blur into a hiss. */
const MAX_CLICS_S = 34;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** 0 below `a`, 1 above `b`, smooth in between. */
function suaveEntre(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Across a pocket (0 center, 0.5 fret, 1 next center): the ball lingers in the pocket and hops the fret. */
function saltoDeTraste(f: number): number {
  return suaveEntre(0, 1, suaveEntre(0, 1, f));
}

function aleatorio(n: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % n;
}

/** Radius of the ball along a spin (0..1): it leaves the pocket, runs the track, falls and bounces. */
function radioEn(k: number, desde: number): number {
  if (k < 0.1) return desde + (R_PISTA - desde) * (k / 0.1);
  if (k < 0.5) return R_PISTA;
  if (k < 0.75) {
    const u = (k - 0.5) / 0.25;
    return R_PISTA - (R_PISTA - R_BOLSA) * u + 6 * Math.sin(u * Math.PI * 3) * (1 - u);
  }
  return R_BOLSA + 3 * Math.sin((k - 0.75) * 50) * (1 - k);
}

/**
 * First screen: a single lamp over the wheel in a dark room, the Crupier on the other side, the
 * title above and the two calls to action below. The visitor can spin the wheel (click, tap or
 * drag): the ball runs, falls and lands on a real number; nothing is won or lost, the visit dossier
 * only counts the spins. Lights and shadows stay still while the wheel turns under them.
 */
@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink, Iman],
  templateUrl: './hero.section.html',
  styleUrl: './hero.section.css',
})
export class HeroSection {
  protected readonly hero = HERO;
  protected readonly cta = CTA;
  protected readonly ruleta = RULETA;
  protected readonly polvo = POLVO;
  protected readonly arrastradas = ARRASTRADAS;

  protected readonly girando = signal(false);
  protected readonly encendiendo = signal(true);
  protected readonly resultado = signal<{ numero: number; color: string } | null>(null);

  private readonly plano = viewChild.required<ElementRef<HTMLElement>>('plano');
  private readonly fondo = viewChild.required<ElementRef<HTMLCanvasElement>>('fondo');
  private readonly mesa = viewChild.required<ElementRef<HTMLElement>>('mesa');
  private readonly visita = inject(VisitDossier);
  private readonly crupier = inject(Crupier);
  private readonly sonido = inject(SonidoMesa);
  private readonly quieto = prefiereMenosMovimiento();

  /** Ball angle in the frame of the wheel head (degrees, clockwise from the top) and its radius. */
  private fi = 0;
  private radio = R_PISTA;
  /** Among the pockets: how far the ball is from its smooth path (degrees) and how high it hops (0..1). */
  private desvio = 0;
  private altura = 0;
  /** Extra turn of the wheel head given by the spins. */
  private impulso = 0;
  private enBolsa = false;
  private visible = true;
  private cuadro = 0;
  private arrastre?: { x: number; t: number };
  private ignorarClic = false;
  private apagado?: ReturnType<typeof setTimeout>;
  /** Fraction of a click carried from one frame to the next during a spin. */
  private clicsPendientes = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    afterNextRender(() => {
      this.pintar();
      this.encender();
      const detenerFondo = iniciarFondo(this.fondo().nativeElement, {
        contenedor: host,
        centro: this.mesa().nativeElement,
        quieto: this.quieto,
        girando: () => this.girando(),
        // The swirl lights the rim of the wheel and the Crupier with its own color (hero.section.css)
        alCalor: (calor) => host.style.setProperty('--calor', calor.toFixed(2)),
      });
      destroyRef.onDestroy(() => detenerFondo?.());
      let observador: IntersectionObserver | undefined;
      if (!this.quieto && typeof IntersectionObserver !== 'undefined') {
        observador = new IntersectionObserver(([entrada]) => {
          this.visible = entrada.isIntersecting;
          if (this.visible) this.reposo();
        });
        observador.observe(host);
      }
      this.reposo();
      destroyRef.onDestroy(() => {
        observador?.disconnect();
        cancelAnimationFrame(this.cuadro);
        clearTimeout(this.apagado);
      });
    });

    // "Otra ronda" brings the visitor back here: the lamp switches on again
    let previo = this.visita.encendidos();
    effect(() => {
      const n = this.visita.encendidos();
      if (n === previo) return;
      previo = n;
      untracked(() => {
        this.encender();
        this.crupier.decir(CRUPIER.otraRonda);
      });
    });
  }

  protected alClic(): void {
    if (this.ignorarClic) return;
    this.girar(1);
  }

  protected arrastreInicio(e: PointerEvent): void {
    this.arrastre = { x: e.clientX, t: performance.now() };
  }

  /** A sideways drag spins the wheel; a faster drag, a longer spin. */
  protected arrastreFin(e: PointerEvent): void {
    const a = this.arrastre;
    this.arrastre = undefined;
    if (!a) return;
    const dx = e.clientX - a.x;
    if (Math.abs(dx) < 24) return;
    const velocidad = Math.abs(dx) / Math.max(1, performance.now() - a.t);
    this.ignorarClic = true;
    setTimeout(() => (this.ignorarClic = false), 80);
    this.girar(Math.min(1.5, Math.max(0.3, velocidad)));
  }

  private girar(fuerza: number): void {
    if (this.girando()) return;
    const k = aleatorio(ORDEN.length);
    const desde = this.fi;
    const delta = -((5 + Math.round(3 * fuerza)) * 360 + mod(desde - k * GRADOS, 360));
    const impulsoDesde = this.impulso;
    const radioDesde = this.radio;
    const duracion = this.quieto ? 0 : 4200 + 1600 * fuerza;
    const inicio = performance.now();
    this.clicsPendientes = 0;
    let fiPrevio = desde;
    let tPrevio = inicio;
    let radioPrevio = radioDesde;
    let radioAntes = radioDesde;

    this.girando.set(true);
    this.enBolsa = false;
    // The roll sounds from the first frame and follows the speed of the ball
    const rodado = this.sonido.rodar();

    const paso = (t: number) => {
      const k01 = duracion ? Math.min(1, (t - inicio) / duracion) : 1;
      const suave = 1 - Math.pow(1 - k01, 3);
      this.fi = desde + delta * suave;
      this.impulso = impulsoDesde + 600 * suave;
      this.radio = radioEn(k01, radioDesde);
      // Once it falls among the frets the ball goes from pocket to pocket, hopping each fret
      const enBolsas = suaveEntre(0.55, 0.75, k01);
      const x = (this.fi - (desde + delta)) / GRADOS;
      const f = x - Math.floor(x);
      this.desvio = (saltoDeTraste(f) - f) * GRADOS * enBolsas;
      this.altura = enBolsas * Math.pow(Math.sin(Math.PI * f), 4) * Math.min(1, (1 - k01) * 4);
      this.pintar();
      this.sonar(rodado, k01, fiPrevio, (t - tPrevio) / 1000, radioAntes, radioPrevio);
      radioAntes = radioPrevio;
      radioPrevio = this.radio;
      fiPrevio = this.fi;
      tPrevio = t;
      if (k01 < 1) {
        requestAnimationFrame(paso);
      } else {
        rodado.detener();
        this.sonido.caida();
        this.terminar(k);
      }
    };
    requestAnimationFrame(paso);
  }

  /**
   * Sound of one frame of a spin: the ball is heard as clicks the whole time. On the track they are
   * fast, light and high; among the frets they get louder, deeper and further apart until the ball
   * stops. Clicks are spread inside the frame on the audio clock, at most MAX_CLICS_S per second.
   */
  private sonar(
    rodado: Rodado,
    k01: number,
    fiPrevio: number,
    dt: number,
    radioAntes: number,
    radioPrevio: number,
  ): void {
    const velocidad = Math.pow(1 - k01, 2);
    const entreTrastes = suaveEntre(0.45, 0.72, k01);
    rodado.actualizar(velocidad, entreTrastes);

    // Frets passed per second, from the angular speed of the ball
    const ritmo = (fiPrevio - this.fi) / Math.max(dt, 0.001) / GRADOS;
    // The cap also slows with the ball, so the rattle decelerates from the very first frame
    this.clicsPendientes += Math.min(ritmo, MAX_CLICS_S * (0.35 + 0.65 * velocidad)) * dt;
    const n = Math.floor(this.clicsPendientes);
    this.clicsPendientes -= n;
    const fuerza = 0.28 + 0.72 * entreTrastes;
    const tono = 3600 - 900 * entreTrastes;
    for (let j = 0; j < n; j++) {
      const cuando = ((j + 0.5 + (Math.random() - 0.5) * 0.5) / n) * dt;
      this.sonido.clic(fuerza * (0.7 + 0.3 * Math.random()), cuando, tono);
    }
    // Each bounce touches down with a deeper knock
    if (k01 > 0.5 && radioPrevio < radioAntes && this.radio > radioPrevio) {
      this.sonido.clic(0.5 + 0.4 * entreTrastes, 0, 1700);
    }
  }

  private terminar(k: number): void {
    this.fi = mod(this.fi, 360);
    this.radio = R_BOLSA;
    this.desvio = 0;
    this.altura = 0;
    this.pintar();
    this.enBolsa = true;
    this.girando.set(false);

    const numero = ORDEN[k];
    const color = numero === 0 ? 'cero' : ROJOS.has(numero) ? 'rojo' : 'negro';
    this.resultado.set({ numero, color: RULETA.colores[color] });
    this.visita.registrarGiro();
    const n = this.visita.girosRuleta();
    this.crupier.decir(
      n === 1 ? CRUPIER.primerGiro : CRUPIER.giros[(n - 2) % CRUPIER.giros.length],
    );
  }

  /** Before the first spin the ball idles slowly around the track. */
  private reposo(): void {
    if (this.cuadro || this.quieto) return;
    let ultimo = performance.now();
    const paso = (t: number) => {
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      if (!this.girando() && !this.enBolsa) {
        this.fi -= 24 * dt;
        this.pintar();
      }
      this.cuadro = this.visible ? requestAnimationFrame(paso) : 0;
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  /** Flickers the lamp on (on load and after "Otra ronda"). */
  private encender(): void {
    this.encendiendo.set(false);
    clearTimeout(this.apagado);
    this.sonido.encendido();
    // Next frame, so the CSS animation starts again; the class goes away once it has played
    requestAnimationFrame(() => {
      this.encendiendo.set(true);
      this.apagado = setTimeout(() => this.encendiendo.set(false), 1700);
    });
  }

  private pintar(): void {
    const el = this.plano().nativeElement;
    el.style.setProperty('--fi', `${(this.fi + this.desvio).toFixed(2)}deg`);
    el.style.setProperty('--rb', `${((this.radio / TAM) * 100).toFixed(2)}%`);
    // Down in a pocket the ball is smaller and in the shade; over a fret, higher and in the light
    const hondo = Math.min(1, Math.max(0, (R_PISTA - this.radio) / (R_PISTA - R_BOLSA)));
    el.style.setProperty('--hondo', hondo.toFixed(2));
    el.style.setProperty('--alt', this.altura.toFixed(2));
    el.style.setProperty('--jw', `${this.impulso.toFixed(2)}deg`);
  }
}
