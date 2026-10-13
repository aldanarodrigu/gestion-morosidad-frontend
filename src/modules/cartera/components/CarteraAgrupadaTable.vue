<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import CarteraTable from './CarteraTable.vue'
import type { CarteraGrupo } from '../types/cartera'

const props = defineProps<{ grupos: CarteraGrupo[] }>()
const abiertos = ref(new Set<string>())
watch(
  () => props.grupos,
  () => (abiertos.value = new Set()),
)
function alternar(clave: string) {
  if (abiertos.value.has(clave)) abiertos.value.delete(clave)
  else abiertos.value.add(clave)
}
function importe(valor: number) {
  return valor.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function colorSegmento(orden?: number) {
  return orden === 3 ? 'tardia' : orden === 2 ? 'inicial' : orden === 1 ? 'temprana' : ''
}
</script>

<template>
  <div class="tabla-contenedor">
    <table class="tabla-agrupada" aria-label="Cartera agrupada por documento">
      <thead>
        <tr>
          <th scope="col">Documento</th>
          <th scope="col">Contribuyente</th>
          <th scope="col" class="numero">Deudas</th>
          <th scope="col">Segmento más avanzado</th>
          <th scope="col" class="numero">Días máx. vencido</th>
          <th scope="col" class="numero">Deuda total</th>
          <th scope="col">Detalle</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(grupo, indice) in grupos" :key="grupo.clave">
          <tr class="grupo">
            <td class="documento">{{ grupo.documento || 'Sin documento' }}</td>
            <td class="nombres">
              <p v-for="nombre in grupo.nombres" :key="nombre">{{ nombre }}</p>
            </td>
            <td class="numero">{{ grupo.deudas.length }}</td>
            <td class="segmento" :class="colorSegmento(grupo.segmentoMora?.orden)">
              {{ grupo.segmentoMora?.nombre || 'Sin segmento' }}
            </td>
            <td class="numero">{{ grupo.diasAtrasoMaximos ?? '—' }}</td>
            <td class="numero importe">$ {{ importe(grupo.importeTotal) }}</td>
            <td>
              <button
                type="button"
                class="ver-deudas"
                :aria-expanded="abiertos.has(grupo.clave)"
                :aria-controls="`grupo-deudas-${indice}`"
                :aria-label="`${abiertos.has(grupo.clave) ? 'Ocultar' : 'Ver'} deudas de ${grupo.nombres.join(', ')} (${grupo.documento || 'sin documento'})`"
                @click="alternar(grupo.clave)"
              >
                <component
                  :is="abiertos.has(grupo.clave) ? ChevronDownIcon : ChevronRightIcon"
                  class="icono"
                  aria-hidden="true"
                />
                {{ abiertos.has(grupo.clave) ? 'Ocultar' : 'Ver deudas' }}
              </button>
            </td>
          </tr>
          <tr v-if="abiertos.has(grupo.clave)" :id="`grupo-deudas-${indice}`" class="detalle-grupo">
            <td colspan="7">
              <p class="ayuda">Seleccioná una deuda para consultar o registrar sus gestiones.</p>
              <CarteraTable :cartera="grupo.deudas" />
            </td>
          </tr>
        </template>
        <tr v-if="!grupos.length">
          <td colspan="7" class="vacio">No hay registros para mostrar.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tabla-contenedor {
  width: 100%;
  overflow: auto;
}
.tabla-agrupada {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 14px 16px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
th {
  color: var(--color-text-secondary);
  background: var(--color-surface-secondary);
  font-weight: 600;
  white-space: nowrap;
}
.grupo {
  background: var(--color-surface);
}
.documento {
  color: var(--color-primary);
  font-weight: 600;
  white-space: nowrap;
}
.nombres {
  min-width: 200px;
  font-weight: 500;
}
.numero {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.importe,
.segmento {
  font-weight: 600;
}
.temprana {
  color: var(--color-temprana);
}
.inicial {
  color: var(--color-incial);
}
.tardia {
  color: var(--color-tardia);
}
.ver-deudas {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  white-space: nowrap;
  font-size: 12px;
}
.ver-deudas:hover {
  text-decoration: underline;
}
.ver-deudas:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
.icono {
  width: 16px;
  height: 16px;
}
.detalle-grupo > td {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-background);
}
.ayuda {
  margin-bottom: var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.vacio {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
