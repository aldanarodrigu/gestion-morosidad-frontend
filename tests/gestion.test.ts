import { test } from 'vitest'
import assert from 'node:assert/strict'
import { validarGestion, etiquetaResultado } from '../src/modules/contribuyentes/utils/gestion'
test('permite observación vacía y los siete resultados definidos', () => {
  for (const resultado of [
    'EXITOSA',
    'NO_LOCALIZADO',
    'RECHAZADA',
    'PENDIENTE',
    'RESPONDIO',
    'NO_RESPONDIO',
    'PROXIMO_A_VENIR',
  ]) {
    assert.equal(validarGestion(10, 2, resultado, ''), '')
  }
})
test('rechaza deuda, acción o resultado faltante', () => {
  assert.match(validarGestion(null, 2, 'EXITOSA', ''), /deuda/)
  assert.match(validarGestion(10, null, 'EXITOSA', ''), /acción/)
  assert.match(validarGestion(10, 2, '', ''), /resultado/)
  assert.match(validarGestion(10, 2, 'NO_EXISTE', ''), /resultado/)
})
test('permite 255 caracteres y rechaza 256', () => {
  assert.equal(validarGestion(10, 2, 'EXITOSA', 'a'.repeat(255)), '')
  assert.match(validarGestion(10, 2, 'EXITOSA', 'a'.repeat(256)), /255/)
})
test('traduce resultados para el historial sin inventar valores', () => {
  assert.equal(etiquetaResultado('NO_LOCALIZADO'), 'No localizado')
  assert.equal(etiquetaResultado('EXITOSA'), 'Exitosa')
  assert.equal(etiquetaResultado('OTRO'), 'OTRO')
})
