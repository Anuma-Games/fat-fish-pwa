/** POST /api/pwa/encuesta: 201 when stored, 200 with `created: false` when the key was already used. */
export interface EncuestaResponseDto {
  id: string;
  created: boolean;
  enviadaEn: string;
}
