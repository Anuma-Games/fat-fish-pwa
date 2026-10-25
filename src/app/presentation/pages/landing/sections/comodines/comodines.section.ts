import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { COMODINES } from '../../../../../core/config/landing.config';
import { esTelefono, prefiereMenosMovimiento, puedeApuntar } from '../../motion';

/** Depth (px) of the thin layers that make the edge of each card. */
const LAMINAS = [-1.2, -0.6, 0, 0.6, 1.2];
/** How fast the cards catch up with the scroll (0..1 per frame): lower is smoother. */
const SEGUIMIENTO = 0.085;

const limitar = (x: number) => Math.min(1, Math.max(0, x));
const suave = (t: number) => t * t * (3 - 2 * t);
/** Ease out with a small overshoot, so a card settles after turning. */
const asentar = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/**
 * The four wildcards as 3D playing cards. The section is a tall scene whose stage stays on screen:
 * as the visitor scrolls, the deck spreads out and each card lifts, turns over and settles face
 * up, floating gently. The motion follows a smoothed scroll, so it stays fluid with any wheel or
 * trackpad. Without JavaScript or with reduced motion the cards are a plain grid, face up.
 */
@Component({
  selector: 'app-landing-comodines',
  templateUrl: './comodines.section.html',
  styleUrl: './comodines.section.css',
})
export class ComodinesSection {
  protected readonly comodines = COMODINES;
  protected readonly laminas = LAMINAS;

  private readonly escena = viewChild.required<ElementRef<HTMLElement>>('escena');
  private readonly cartas = viewChildren<ElementRef<HTMLElement>>('carta');
  /** Pointer tilt of each card: current and target, in degrees. */
  private readonly inclinacion = COMODINES.map(() => ({ x: 0, y: 0, ax: 0, ay: 0 }));
  private readonly conPuntero = puedeApuntar();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefiereMenosMovimiento() || typeof IntersectionObserver === 'undefined') return;
      const escena = this.escena().nativeElement;
      escena.classList.add('animada');

      let avance = this.medir();
      let visible = false;
      let cuadro = 0;
      const paso = (t: number) => {
        avance += (this.medir() - avance) * SEGUIMIENTO;
        this.pintar(avance, t / 1000);
        cuadro = visible ? requestAnimationFrame(paso) : 0;
      };
      const observador = new IntersectionObserver(([entrada]) => {
        visible = entrada.isIntersecting;
        if (visible && !cuadro) cuadro = requestAnimationFrame(paso);
      });
      observador.observe(escena);
      this.pintar(avance, 0);
      destroyRef.onDestroy(() => {
        observador.disconnect();
        cancelAnimationFrame(cuadro);
      });
    });
  }

  protected apuntar(e: PointerEvent, i: number): void {
    if (!this.conPuntero) return;
    const caja = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.inclinacion[i].ax = ((e.clientX - caja.left) / caja.width - 0.5) * 22;
    this.inclinacion[i].ay = ((e.clientY - caja.top) / caja.height - 0.5) * 22;
  }

  protected soltar(i: number): void {
    this.inclinacion[i].ax = 0;
    this.inclinacion[i].ay = 0;
  }

  /** Progress through the scene: 0 when it reaches the top of the screen, 1 when it ends. */
  private medir(): number {
    const caja = this.escena().nativeElement.getBoundingClientRect();
    const recorrido = caja.height - window.innerHeight;
    return recorrido > 0 ? limitar(-caja.top / recorrido) : 0;
  }

  private pintar(p: number, s: number): void {
    const telefono = esTelefono();
    const cartas = this.cartas();
    const n = cartas.length;
    const cols = telefono ? 2 : n;
    const filas = Math.ceil(n / cols);

    cartas.forEach((ref, i) => {
      const el = ref.nativeElement;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const col = i % cols;
      const fila = Math.floor(i / cols);
      const centro = i - (n - 1) / 2;

      // 1. The stacked deck spreads into a row (2 x 2 on phones)
      const reparto = suave(limitar((p - i * 0.04) / 0.28));
      const finX = (col - (cols - 1) / 2) * w * 1.12;
      const finY = (fila - (filas - 1) / 2) * h * 1.08;
      // 2. Each card in turn lifts, turns over and settles
      const giro = limitar((p - 0.2 - i * 0.11) / 0.3);
      const vuelta = asentar(giro);
      const salto = Math.sin(Math.PI * giro);

      const t = this.inclinacion[i];
      t.x += (t.ax - t.x) * 0.12;
      t.y += (t.ay - t.y) * 0.12;

      const x = finX * reparto + (1 - reparto) * centro * 6;
      const y =
        finY * reparto - (1 - reparto) * i * 3 - salto * h * 0.12 + Math.sin(s * 1.3 + i * 1.7) * 6;
      const z = salto * 140 + (1 - reparto) * i * 2;
      const rotY = 180 * (1 - vuelta) + t.x;
      const rotX = 12 * (1 - reparto) + 8 * salto - t.y + Math.sin(s * 0.9 + i) * 1.5;
      const rotZ = centro * (telefono ? 1.5 : 2.5) * (1 - vuelta * 0.6) + Math.sin(s * 0.7 + i * 2);

      el.style.transform =
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
        `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`;
      // Where the lamp glints on the face, from the angle of the card
      el.style.setProperty('--luz', (mod360(rotY) / 360).toFixed(3));
    });
  }
}

function mod360(a: number): number {
  return ((a % 360) + 360) % 360;
}
