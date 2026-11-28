import { onScopeDispose, ref, shallowRef } from 'vue'

/**
 * Consulta al backend con cancelación: cada ejecución cancela la anterior, solo la última
 * actualiza los datos y el estado, y al desmontar la pantalla se cancela lo pendiente.
 *
 *   const { datos, cargando, error, ejecutar } = useConsulta<Pagina>()
 *   ejecutar((signal) => obtenerPagina(filtros, signal), 'No se pudo cargar.')
 *
 * `ejecutar` devuelve el resultado (o undefined si falló o quedó cancelada) para que la pantalla
 * pueda completar su propio estado.
 *
 * `vigente()` devuelve la señal de la consulta actual. Sirve para acciones que dependen de ella
 * (por ejemplo, guardar y recargar): si mientras tanto empezó otra consulta o se salió de la
 * pantalla, la señal queda cancelada y el resultado de la acción se descarta.
 */
export function useConsulta<T>() {
  const datos = shallowRef<T>()
  const cargando = ref(false)
  const error = ref('')
  // Arranca con un control propio para que `vigente()` siempre tenga una señal válida.
  let controller = new AbortController()

  async function ejecutar(
    consulta: (signal: AbortSignal) => Promise<T>,
    mensajeError: string | ((e: unknown) => string),
    opciones: { limpiar?: boolean } = {},
  ): Promise<T | undefined> {
    controller.abort()
    const actual = new AbortController()
    controller = actual
    cargando.value = true
    error.value = ''
    if (opciones.limpiar) datos.value = undefined
    try {
      const resultado = await consulta(actual.signal)
      if (actual.signal.aborted) return undefined
      datos.value = resultado
      return resultado
    } catch (e) {
      if (!actual.signal.aborted) {
        if (esSesionVencida(e)) error.value = MENSAJE_SESION_VENCIDA
        else error.value = typeof mensajeError === 'function' ? mensajeError(e) : mensajeError
      }
      return undefined
    } finally {
      if (controller === actual) cargando.value = false
    }
  }

  function vigente(): AbortSignal {
    return controller.signal
  }

  /** Cancela la consulta en curso y deja el estado sin carga (cuando no hay nada que pedir). */
  function detener() {
    controller.abort()
    controller = new AbortController()
    cargando.value = false
    error.value = ''
  }

  function cancelar() {
    controller.abort()
  }

  onScopeDispose(cancelar)

  return { datos, cargando, error, ejecutar, vigente, detener, cancelar }
}

/**
 * Señal que se cancela al salir de la pantalla. Para acciones sueltas (descargas, guardados,
 * consultas periódicas) que no deben seguir ni mostrar resultados después de salir.
 */
export function useAlSalir(): AbortSignal {
  const controller = new AbortController()
  onScopeDispose(() => controller.abort())
  return controller.signal
}

export const MENSAJE_SESION_VENCIDA =
  'Tu sesión venció y no se completó la operación. Volvé a ingresar e intentá de nuevo.'

function esSesionVencida(e: unknown): boolean {
  return (e as { response?: { status?: unknown } } | null)?.response?.status === 401
}

/** Mensaje de error que manda el backend (campo `mensaje`), o el texto por defecto. */
export function mensajeDeError(e: unknown, defecto: string): string {
  if (esSesionVencida(e)) return MENSAJE_SESION_VENCIDA
  const mensaje = (e as { response?: { data?: { mensaje?: unknown } } } | null)?.response?.data
    ?.mensaje
  return typeof mensaje === 'string' && mensaje ? mensaje : defecto
}
