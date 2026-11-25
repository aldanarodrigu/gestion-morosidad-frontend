/**
 * Última dirección de la Cartera (con búsqueda, filtros, tamaño y página), para que «Volver»
 * desde la ficha del contribuyente la restaure. Se guarda por pestaña en sessionStorage, así
 * sobrevive a recargar la ficha; si el almacenamiento no está disponible, queda en memoria.
 */
const CLAVE = 'cartera:ultima-ruta'
const RUTA_BASE = '/cartera'

let enMemoria = RUTA_BASE

// Solo rutas de la propia Cartera: evita volver a una dirección ajena si el valor fue alterado.
function esRutaCartera(ruta: string | null): ruta is string {
  return !!ruta && (ruta === RUTA_BASE || ruta.startsWith(`${RUTA_BASE}?`))
}

export function recordarRutaCartera(ruta: string) {
  if (!esRutaCartera(ruta)) return
  enMemoria = ruta
  try {
    sessionStorage.setItem(CLAVE, ruta)
  } catch {
    // Almacenamiento bloqueado (modo privado, etc.): alcanza con la copia en memoria.
  }
}

export function rutaCarteraGuardada(): string {
  try {
    const guardada = sessionStorage.getItem(CLAVE)
    if (esRutaCartera(guardada)) return guardada
  } catch {
    // Sin acceso al almacenamiento: se usa la copia en memoria.
  }
  return enMemoria
}
