<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import EtiquetaMora from '@/shared/components/EtiquetaMora.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { formatoImporte, formatoNumero } from '@/shared/utils/formato'
import { nivelMoraPorOrden } from '@/shared/utils/mora'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import CarteraTable from './CarteraTable.vue'
import type { CarteraGrupo } from '../types/cartera'

const props = withDefaults(
  defineProps<{ grupos: CarteraGrupo[]; cargando?: boolean; filasEsqueleto?: number }>(),
  { cargando: false, filasEsqueleto: 20 },
)
const esqueleto = useEsqueleto(() => props.cargando)
const abiertos = ref(new Set<string>())
watch(
  () => props.grupos,
  () => (abiertos.value = new Set()),
)
function alternar(clave: string) {
  if (abiertos.value.has(clave)) abiertos.value.delete(clave)
  else abiertos.value.add(clave)
}
</script>

<template>
  <div class="tabla-contenedor" :aria-busy="cargando || undefined">
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
        <SkeletonFilas
          v-if="esqueleto"
          :columnas="7"
          :filas="filasEsqueleto"
          relleno-extremos="var(--spacing-lg)"
          :derecha="[2, 4, 5]"
          :anchos="['7em', '12em', '2em', '8em', '3em', '7em', '6em']"
        />
        <template v-else>
          <template v-for="(grupo, indice) in grupos" :key="grupo.clave">
            <tr class="grupo">
              <td class="documento">{{ grupo.documento || 'Sin documento' }}</td>
              <td class="nombres">
                <p v-for="nombre in grupo.nombres" :key="nombre">{{ nombre }}</p>
              </td>
              <td class="numero">{{ formatoNumero(grupo.deudas.length) }}</td>
              <td>
                <EtiquetaMora :nivel="nivelMoraPorOrden(grupo.segmentoMora?.orden)">
                  {{ grupo.segmentoMora?.nombre || 'Sin segmento' }}
                </EtiquetaMora>
              </td>
              <td class="numero">
                {{ grupo.diasAtrasoMaximos == null ? '—' : formatoNumero(grupo.diasAtrasoMaximos) }}
              </td>
              <td class="numero importe">{{ formatoImporte(grupo.importeTotal) }}</td>
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
            <tr
              v-if="abiertos.has(grupo.clave)"
              :id="`grupo-deudas-${indice}`"
              class="detalle-grupo"
            >
              <td colspan="7">
                <p class="ayuda">Seleccioná una deuda para consultar o registrar sus gestiones.</p>
                <CarteraTable :cartera="grupo.deudas" />
              </td>
            </tr>
          </template>
        </template>
        <tr v-if="!grupos.length && !cargando">
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
  font-size: var(--texto-base);
  --esqueleto-celda-padding: 12px 16px;
}
th,
td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
th {
  padding-block: 10px;
  color: var(--color-text-secondary);
  background: var(--color-background);
  font-size: var(--texto-sm);
  font-weight: 600;
  white-space: nowrap;
}
/* Primera y última columna alineadas con el resto de la pantalla */
.grupo > td:first-child,
thead th:first-child {
  padding-left: var(--spacing-lg);
}
.grupo > td:last-child,
thead th:last-child {
  padding-right: var(--spacing-lg);
}
.grupo {
  background: var(--color-surface);
  transition: background-color 0.15s ease;
}
.grupo:hover {
  background: var(--color-surface-secondary);
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
.importe {
  font-weight: 600;
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
  font-size: var(--texto-sm);
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
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
.vacio {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
