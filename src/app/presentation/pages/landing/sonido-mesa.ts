import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Sound of the ball rolling during one spin. */
export interface Rodado {
  /**
   * `velocidad` goes from 1 (just thrown) to 0 (stopped); `entreTrastes` from 0 (on the track) to
   * 1 (down among the frets), where the roll gets quieter and the clicks take over.
   */
  actualizar(velocidad: number, entreTrastes: number): void;
  detener(): void;
}

const SILENCIO: Rodado = { actualizar: () => {}, detener: () => {} };

/**
 * Optional sound of the room, made with the Web Audio API (no audio files): the hum of the lamp,
 * a low room tone, the ball rolling and clicking, its fall into the pocket and the lamp
 * switching on. Nothing plays until the
 * visitor turns it on with the button in the nav.
 */
@Injectable()
export class SonidoMesa {
  readonly activo = signal(false);

  private ctx?: AudioContext;
  private salida?: GainNode;
  private ruido?: AudioBuffer;

  constructor() {
    inject(DestroyRef).onDestroy(() => void this.ctx?.close());
  }

  async alternar(): Promise<void> {
    if (this.activo()) {
      this.activo.set(false);
      this.salida?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.15);
      return;
    }
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) this.montar();
    await this.ctx!.resume();
    this.activo.set(true);
    this.salida!.gain.setTargetAtTime(0.7, this.ctx!.currentTime, 0.3);
    this.encendido();
  }

  /**
   * Short click of the ball against a fret; `fuerza` between 0 and 1, `retraso` in seconds from
   * now (spins schedule several clicks inside one frame), `tono` the center of the click in Hz.
   */
  clic(fuerza = 1, retraso = 0, tono = 3000): void {
    if (!this.activo() || !this.ctx) return;
    const t = this.ctx.currentTime + retraso;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.ruido!;
    const filtro = new BiquadFilterNode(this.ctx, { type: 'bandpass', frequency: tono, Q: 5 });
    const gan = new GainNode(this.ctx, { gain: 0 });
    gan.gain.setValueAtTime(0.32 * fuerza, t);
    gan.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    fuente.connect(filtro).connect(gan).connect(this.salida!);
    fuente.start(t, Math.random(), 0.05);
  }

  /**
   * Low wooden rumble of the wheel under the clicks of the ball, during a whole spin. It only
   * gives body to the sound; the ball itself is heard through the clicks (`clic`).
   */
  rodar(): Rodado {
    if (!this.activo() || !this.ctx) return SILENCIO;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const fuente = new AudioBufferSourceNode(ctx, { buffer: this.ruido!, loop: true });
    const filtro = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 320, Q: 0.7 });
    const gan = new GainNode(ctx, { gain: 0 });
    fuente.connect(filtro).connect(gan).connect(this.salida!);
    fuente.start(t, Math.random());
    let detenido = false;
    return {
      actualizar: (velocidad, entreTrastes) => {
        if (detenido) return;
        const ahora = ctx.currentTime;
        gan.gain.setTargetAtTime(0.08 * velocidad * (1 - 0.5 * entreTrastes), ahora, 0.1);
        filtro.frequency.setTargetAtTime(180 + 200 * velocidad, ahora, 0.1);
      },
      detener: () => {
        if (detenido) return;
        detenido = true;
        const ahora = ctx.currentTime;
        gan.gain.setTargetAtTime(0, ahora, 0.08);
        fuente.stop(ahora + 0.5);
      },
    };
  }

  /** The ball settling in its pocket: a dull knock on wood and a last click. */
  caida(): void {
    if (!this.activo() || !this.ctx) return;
    const t = this.ctx.currentTime;
    const golpe = new OscillatorNode(this.ctx, { type: 'triangle', frequency: 190 });
    golpe.frequency.exponentialRampToValueAtTime(85, t + 0.12);
    const gan = new GainNode(this.ctx, { gain: 0 });
    gan.gain.setValueAtTime(0.22, t);
    gan.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    golpe.connect(gan).connect(this.salida!);
    golpe.start(t);
    golpe.stop(t + 0.22);
    this.clic(0.5, 0, 2200);
  }

  /** The lamp switching on: a relay click and a short buzz. */
  encendido(): void {
    if (!this.activo() || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.clic(0.8);
    const zumbido = new OscillatorNode(this.ctx, { type: 'sawtooth', frequency: 120 });
    const filtro = new BiquadFilterNode(this.ctx, { type: 'bandpass', frequency: 1800, Q: 2 });
    const gan = new GainNode(this.ctx, { gain: 0 });
    gan.gain.setValueAtTime(0.05, t + 0.02);
    gan.gain.setValueAtTime(0.01, t + 0.12);
    gan.gain.setValueAtTime(0.05, t + 0.2);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    zumbido.connect(filtro).connect(gan).connect(this.salida!);
    zumbido.start(t);
    zumbido.stop(t + 0.75);
  }

  private montar(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.salida = new GainNode(ctx, { gain: 0 });
    this.salida.connect(ctx.destination);

    // Two seconds of white noise, reused by the room tone and the clicks
    this.ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const datos = this.ruido.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;

    // Room tone: filtered noise
    const cuarto = new AudioBufferSourceNode(ctx, { buffer: this.ruido, loop: true });
    cuarto
      .connect(new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 380 }))
      .connect(new GainNode(ctx, { gain: 0.05 }))
      .connect(this.salida);
    cuarto.start();

    // Mains hum of the lamp
    for (const [frecuencia, volumen] of [
      [60, 0.03],
      [120, 0.012],
    ]) {
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: frecuencia });
      osc.connect(new GainNode(ctx, { gain: volumen })).connect(this.salida);
      osc.start();
    }
  }
}
