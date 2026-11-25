import { onScopeDispose, ref, watch } from 'vue'

/** Demora antes de mostrar el esqueleto: las cargas más rápidas no lo llegan a mostrar. */
export const DEMORA_ESQUELETO_MS = 250

/**
 * Devuelve `true` solo si la carga dura más que `demora`, para que el esqueleto
 * no parpadee en respuestas rápidas. Se apaga apenas termina la carga.
 */
export function useEsqueleto(cargando: () => boolean, demora = DEMORA_ESQUELETO_MS) {
  const mostrar = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    cargando,
    (activo) => {
      clearTimeout(timer)
      if (!activo) {
        mostrar.value = false
        return
      }
      if (mostrar.value) return
      timer = setTimeout(() => (mostrar.value = true), demora)
    },
    { immediate: true },
  )

  onScopeDispose(() => clearTimeout(timer))
  return mostrar
}
