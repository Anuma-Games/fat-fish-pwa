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

/** European wheel order, from the 0 clockwise. */
const ORDEN = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** Radii of the wheel in its -130..130 viewBox. */
const R = {
  cono: 60,
  fondo: 88,
  numeros: 102,
  texto: 95,
};

const PASO = (Math.PI * 2) / ORDEN.length;
const punto = (r: number, a: number) =>
  `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
const anillo = (r0: number, r1: number, a0: number, a1: number) =>
  `M ${punto(r0, a0)} L ${punto(r1, a0)} A ${r1} ${r1} 0 0 1 ${punto(r1, a1)} ` +
  `L ${punto(r0, a1)} A ${r0} ${r0} 0 0 0 ${punto(r0, a0)} Z`;

interface Casilla {
  numero: number;
  /** Pocket where the ball lands, and the band with the number above it. */
  bolsa: string;
  banda: string;
  color: 'cero' | 'rojo' | 'negro';
  separador: string;
  x: number;
  y: number;
  giro: number;
}

/** Pockets of the wheel: colored bands, numbers and the gold frets between them. */
function casillas(): Casilla[] {
  return ORDEN.map((numero, i) => {
    const a0 = i * PASO - PASO / 2;
    const a1 = a0 + PASO;
    const medio = i * PASO;
    return {
      numero,
      bolsa: anillo(R.cono, R.fondo, a0, a1),
      banda: anillo(R.fondo, R.numeros, a0, a1),
      color: numero === 0 ? 'cero' : ROJOS.has(numero) ? 'rojo' : 'negro',
      separador: `M ${punto(R.cono, a0)} L ${punto(R.numeros, a0)}`,
      x: +(R.texto * Math.sin(medio)).toFixed(2),
      y: +(-R.texto * Math.cos(medio)).toFixed(2),
      giro: +((medio * 180) / Math.PI).toFixed(1),
    };
  });
}

/** Gold diamonds on the ball track, as on a real bowl. */
const ROMBOS = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5);

/** Specks of dust floating in the lamp light (fixed positions, so the page looks the same each load). */
const POLVO = Array.from({ length: 16 }, (_, i) => ({
  x: 38 + ((i * 37) % 25),
  y: 18 + ((i * 53) % 70),
  tam: 1 + (i % 3),
  retraso: -((i * 1.7) % 9),
  duracion: 8 + (i % 5) * 2,
}));

/** Radii of the ball (on the track and in a pocket) and size of the viewBox. */
const R_PISTA = 111;
const R_BOLSA = 75;
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
  protected readonly casillas = casillas();
  protected readonly rombos = ROMBOS;
  protected readonly polvo = POLVO;
  protected readonly radiosCono = Array.from({ length: 8 }, (_, i) => i * 45);

  protected readonly girando = signal(false);
  protected readonly encendiendo = signal(true);
  protected readonly resultado = signal<{ numero: number; color: string } | null>(null);

  private readonly plano = viewChild.required<ElementRef<HTMLElement>>('plano');
  private readonly visita = inject(VisitDossier);
  private readonly crupier = inject(Crupier);
  private readonly sonido = inject(SonidoMesa);
  private readonly quieto = prefiereMenosMovimiento();

  /** Ball angle in the frame of the wheel head (degrees, clockwise from the top) and its radius. */
  private fi = 0;
  private radio = R_PISTA;
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
    el.style.setProperty('--fi', `${this.fi.toFixed(2)}deg`);
    el.style.setProperty('--rb', `${((this.radio / TAM) * 100).toFixed(2)}%`);
    el.style.setProperty('--jw', `${this.impulso.toFixed(2)}deg`);
  }
}
