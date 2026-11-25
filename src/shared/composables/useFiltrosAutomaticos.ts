import { onScopeDispose, watch } from 'vue'

/** Demora antes de aplicar lo que se escribe en un campo de texto. */
export const DEMORA_TEXTO_MS = 400

/**
 * Aplica los filtros solos, como en Cartera: los campos de texto esperan a que se deje de escribir;
 * los desplegables y las fechas se aplican al instante. `aplicarAhora` sirve para Enter.
 * `aplicar(forzar)` debe ignorar la llamada si los filtros no cambiaron, salvo que `forzar` sea true
 * (Enter o «Limpiar»: el usuario lo pidió explícitamente).
 */
export function useFiltrosAutomaticos<T extends object>(
  filtros: T,
  camposTexto: readonly (keyof T)[],
  aplicar: (forzar: boolean) => void,
  demora = DEMORA_TEXTO_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const otrosCampos = (Object.keys(filtros) as (keyof T)[]).filter(
    (campo) => !camposTexto.includes(campo),
  )

  function programar(ms: number) {
    clearTimeout(timer)
    timer = setTimeout(() => aplicar(false), ms)
  }

  function aplicarAhora() {
    clearTimeout(timer)
    aplicar(true)
  }

  watch(
    () => camposTexto.map((campo) => filtros[campo]),
    () => programar(demora),
  )
  watch(
    () => otrosCampos.map((campo) => filtros[campo]),
    () => programar(0),
  )
  onScopeDispose(() => clearTimeout(timer))

  return { aplicarAhora }
}
