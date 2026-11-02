import { Encuesta, validarEncuesta } from './encuesta';

const valida: Encuesta = { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5 };

describe('validarEncuesta', () => {
  it('accepts three scales and no comment', () => {
    expect(validarEncuesta(valida)).toBeNull();
  });

  it('rejects a scale outside 1 to 5', () => {
    expect(validarEncuesta({ ...valida, cambioOpinion: 6 as never })).toContain('del 1 al 5');
    expect(validarEncuesta({ ...valida, claridadMensaje: 0 as never })).toContain('del 1 al 5');
  });

  it('rejects a comment of more than 500 characters', () => {
    expect(validarEncuesta({ ...valida, comentario: 'a'.repeat(501) })).toContain('500');
    expect(validarEncuesta({ ...valida, comentario: 'a'.repeat(500) })).toBeNull();
  });
});