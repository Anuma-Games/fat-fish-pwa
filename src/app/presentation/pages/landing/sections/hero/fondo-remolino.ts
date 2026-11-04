/**
 * Background of the hero: the same swirl of green, red and gold paint as the game's start menu
 * (fat-fish-game, Assets/Art/MainMenu/MenuSwirl.shader), drawn with WebGL at low resolution and
 * shown pixelated, one pixel every PIXEL css px like the game (1920 / 384). Its eye is the wheel,
 * and it lies on the plane of the table (squashed like the tilted wheel), so the paint drains into it.
 */

const PIXEL = 5;
/** Cosine of the tilt of the wheel (56deg in hero.section.css): the swirl lies on the same plane. */
const APLANADO = Math.cos((56 * Math.PI) / 180);

const VERTICES = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

/**
 * Fragment shader of the game, with three changes: the center is the wheel (c) and not the middle
 * of the screen, the plane is squashed by APLANADO, and while the color is changing (heat between 0
 * and 1) the 10 color levels are dithered (Bayer 4x4), so the change to red is gradual instead of
 * jumping level by level; at rest the paint keeps the flat levels of the game.
 * It asks for highp where the phone has it: with mediump (16 bits on many phones) the time `t`
 * loses precision after a few minutes and the swirl starts to shake.
 */
const FRAGMENTOS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;uniform vec2 c;uniform float t;uniform float spin;uniform float heat;
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float bayer(vec2 a){return b2(.5*a)*.25+b2(a);}
void main(){
  float L=length(r);
  vec2 uv=(gl_FragCoord.xy-c)/L;
  uv.y/=APLANADO;
  float d=length(uv);
  float a=atan(uv.y,uv.x)+spin-(7.5+2.5*heat)*d;
  uv=vec2(cos(a),sin(a))*d*30.;
  float tt=t*.55;
  for(int i=0;i<5;i++){
    float fi=float(i);
    float pu=uv.x;
    uv.x+=.9*sin(uv.y*.75+tt*.43+fi*1.71);
    uv.y+=.9*cos(pu*.65-tt*.37+fi*2.33);
    uv.x-=.8*cos(uv.x*.31+uv.y*.47+fi);
    uv.y-=.8*sin(uv.x*.43-uv.y*.29);
  }
  float p=length(uv)*.045;
  float band=.5+.5*sin(p*20.106+tt*.6);
  float band2=.5+.5*sin(uv.x*.33-uv.y*.27+tt*.3);
  vec3 c1=mix(vec3(.035,.15,.12),vec3(.22,.02,.02),heat);
  vec3 c2=mix(vec3(.11,.43,.22),vec3(.13,.40,.20),heat);
  vec3 c3=mix(vec3(.74,.15,.10),vec3(.95,.22,.12),heat);
  vec3 c4=vec3(.95,.72,.28);
  float k=smoothstep(.35,.65,band);
  vec3 col=mix(c1,c2,k);
  float r3=clamp((band2-.70)/.12,0.,1.)*clamp((band-.2)/.3,0.,1.);
  col=mix(col,c3,r3);
  float e=clamp(1.-abs(band-.5)/.06,0.,1.)*.6;
  col+=e*(c4-col)*.55;
  float tramado=min(1.,heat*(1.-heat)*12.);
  col=floor(col*10.+mix(0.,bayer(gl_FragCoord.xy),tramado))/10.;
  gl_FragColor=vec4(col,1.);
}`;

export interface OpcionesFondo {
  /** Element whose size the canvas covers (the hero). */
  contenedor: HTMLElement;
  /** Element at the eye of the swirl (the wheel). */
  centro: HTMLElement;
  /** Draw a single still frame (reduced motion). */
  quieto: boolean;
  /** True while the wheel is spinning: the paint turns red and swirls faster, as in the game. */
  girando: () => boolean;
  /** Called when the heat (0 green .. 1 red) changes by a visible step. */
  alCalor?: (calor: number) => void;
}

/**
 * Starts the background on `canvas`. Returns the function that stops it, or null when the browser
 * has no WebGL (the hero then keeps its plain dark background).
 */
export function iniciarFondo(canvas: HTMLCanvasElement, op: OpcionesFondo): (() => void) | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const programa = crearPrograma(gl);
  if (!programa) return null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(programa, 'p');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = {
    r: gl.getUniformLocation(programa, 'r'),
    c: gl.getUniformLocation(programa, 'c'),
    t: gl.getUniformLocation(programa, 't'),
    spin: gl.getUniformLocation(programa, 'spin'),
    heat: gl.getUniformLocation(programa, 'heat'),
  };

  // Same starting point and pace as MainMenuController in the game
  let tiempo = 6;
  let giro = 0;
  let calor = 0;

  const dibujar = () => {
    gl!.uniform1f(u.t, tiempo);
    gl!.uniform1f(u.spin, giro);
    gl!.uniform1f(u.heat, Math.min(1, calor));
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  };

  // One shader pixel every PIXEL css px, whatever the size of the hero; the eye follows the wheel
  const ajustar = () => {
    const caja = canvas.getBoundingClientRect();
    const ancho = Math.max(1, Math.ceil(caja.width / PIXEL));
    const alto = Math.max(1, Math.ceil(caja.height / PIXEL));
    if (canvas.width !== ancho || canvas.height !== alto) {
      canvas.width = ancho;
      canvas.height = alto;
      gl!.viewport(0, 0, ancho, alto);
      gl!.uniform2f(u.r, ancho, alto);
    }
    const ojo = op.centro.getBoundingClientRect();
    gl!.uniform2f(
      u.c,
      (ojo.left + ojo.width / 2 - caja.left) / PIXEL,
      (caja.bottom - ojo.top - ojo.height / 2) / PIXEL,
    );
    dibujar();
  };
  ajustar();
  const tamano = new ResizeObserver(ajustar);
  tamano.observe(op.contenedor);

  if (op.quieto) {
    return () => {
      tamano.disconnect();
      liberar(gl!);
    };
  }

  // The swirl runs only while both hold: the hero is on screen and the tab is in front
  let enPantalla = true;
  let pestanaVisible = document.visibilityState === 'visible';
  let visible = pestanaVisible;
  let cuadro = 0;
  let avisado = 0;
  let ultimo = performance.now();
  const paso = (ahora: number) => {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    const girando = op.girando();
    // Color and speed both follow the heat, so neither jumps when a spin starts or ends
    calor += ((girando ? 1 : 0) - calor) * Math.min(1, dt * 1.2);
    // An angle: wrapping it keeps the number small without changing the picture
    giro = (giro + dt * (0.12 + 1.28 * calor)) % (2 * Math.PI);
    tiempo += dt * (1 + 2 * calor);
    if (Math.abs(calor - avisado) > 0.02) {
      avisado = calor;
      op.alCalor?.(calor);
    }
    dibujar();
    cuadro = visible ? requestAnimationFrame(paso) : 0;
  };
  const arrancar = () => {
    if (cuadro || !visible) return;
    ultimo = performance.now();
    cuadro = requestAnimationFrame(paso);
  };

  // Each event updates its own flag, so coming back to the tab with the hero scrolled away does
  // not wake the swirl up
  const pantalla = new IntersectionObserver(([entrada]) => {
    enPantalla = entrada.isIntersecting;
    visible = enPantalla && pestanaVisible;
    arrancar();
  });
  pantalla.observe(op.contenedor);
  const alCambiarPestana = () => {
    pestanaVisible = document.visibilityState === 'visible';
    visible = enPantalla && pestanaVisible;
    arrancar();
  };
  document.addEventListener('visibilitychange', alCambiarPestana);
  arrancar();

  return () => {
    cancelAnimationFrame(cuadro);
    tamano.disconnect();
    pantalla.disconnect();
    document.removeEventListener('visibilitychange', alCambiarPestana);
    liberar(gl!);
  };
}

/**
 * Gives the GPU context back right away. Browsers keep only about 16 WebGL contexts and wait for the
 * garbage collector to free the rest, so going back and forth to the landing page would pile them up.
 */
function liberar(gl: WebGLRenderingContext): void {
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

function crearPrograma(gl: WebGLRenderingContext): WebGLProgram | null {
  const compilar = (tipo: number, fuente: string) => {
    const s = gl.createShader(tipo)!;
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    return s;
  };
  const programa = gl.createProgram()!;
  gl.attachShader(programa, compilar(gl.VERTEX_SHADER, VERTICES));
  gl.attachShader(
    programa,
    compilar(gl.FRAGMENT_SHADER, FRAGMENTOS.replaceAll('APLANADO', APLANADO.toFixed(3))),
  );
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return null;
  gl.useProgram(programa);
  return programa;
}
