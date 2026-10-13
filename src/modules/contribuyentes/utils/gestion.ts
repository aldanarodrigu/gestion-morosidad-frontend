export const resultadosGestion = [
  { value: 'EXITOSA', label: 'Exitosa' },
  { value: 'NO_LOCALIZADO', label: 'No localizado' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESPONDIO', label: 'Respondió' },
  { value: 'NO_RESPONDIO', label: 'No respondió' },
  { value: 'PROXIMO_A_VENIR', label: 'Próximo a venir' },
] as const
export type ResultadoGestion = (typeof resultadosGestion)[number]['value']
export function etiquetaResultado(valor: string): string {
  return resultadosGestion.find((r) => r.value === valor)?.label ?? valor
}
export function validarGestion(
  deudaId: number | null,
  accionId: number | null,
  resultado: string,
  observacion: string,
): string {
  if (!deudaId || deudaId <= 0) return 'Seleccioná una deuda.'
  if (!accionId || accionId <= 0) return 'Seleccioná una acción.'
  if (!resultadosGestion.some((r) => r.value === resultado)) return 'Seleccioná un resultado.'
  if (observacion.length > 255) return 'La observación no puede superar los 255 caracteres.'
  return ''
}
