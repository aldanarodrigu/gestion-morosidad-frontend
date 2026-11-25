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
 */
export function useConsulta<T>() {
  const datos = shallowRef<T>()
  const cargando = ref(false)
  const error = ref('')
  let controller: AbortController | undefined

  async function ejecutar(
    consulta: (signal: AbortSignal) => Promise<T>,
    mensajeError: string | ((e: unknown) => string),
    opciones: { limpiar?: boolean } = {},
  ): Promise<T | undefined> {
    controller?.abort()
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
      if (!actual.signal.aborted)
        error.value = typeof mensajeError === 'function' ? mensajeError(e) : mensajeError
      return undefined
    } finally {
      if (controller === actual) cargando.value = false
    }
  }

  function cancelar() {
    controller?.abort()
  }

  onScopeDispose(cancelar)

  return { datos, cargando, error, ejecutar, cancelar }
}

/** Mensaje de error que manda el backend (campo `mensaje`), o el texto por defecto. */
export function mensajeDeError(e: unknown, defecto: string): string {
  const mensaje = (e as { response?: { data?: { mensaje?: unknown } } } | null)?.response?.data
    ?.mensaje
  return typeof mensaje === 'string' && mensaje ? mensaje : defecto
}
