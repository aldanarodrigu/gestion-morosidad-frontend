export const PASSWORD_MIN_CARACTERES = 15
export const PASSWORD_MAX_BYTES = 72

/** Devuelve el mensaje de error si la contraseña no cumple la política, o null si es válida. */
export function validarLongitudPassword(texto: string): string | null {
  if ([...texto].length < PASSWORD_MIN_CARACTERES) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_CARACTERES} caracteres.`
  }
  if (new TextEncoder().encode(texto).length > PASSWORD_MAX_BYTES) {
    return `La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes (los acentos y símbolos ocupan más de uno).`
  }
  return null
}
