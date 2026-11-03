<script setup lang="ts">
import { ref } from 'vue'
import FacturasPadronPanel from './FacturasPadronPanel.vue'
import type { DeudaApi } from '@/modules/cartera/types/cartera'

defineProps<{
  deudas: DeudaApi[]
  deudaSeleccionadaId?: number
}>()

const facturasAbiertasId = ref<number>()

const emit = defineEmits<{ seleccionar: [deudaId: number] }>()

const getSegmentoClass = (segmento: string | undefined) => {
  switch (segmento?.toLowerCase()) {
    case 'mora tardía':
      return 'tardia'
    case 'mora inicial':
      return 'inicial'
    case 'mora temprana':
      return 'temprana'
    default:
      return ''
  }
}

const formatoImporte = (importe: number) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
  }).format(importe)

const formatoFecha = (fecha: string | null) => {
  if (!fecha) return '—'

  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}
</script>

<template>
  <section class="deudas">
    <p v-if="deudas.length === 0" class="vacio">No hay padrones para mostrar.</p>

    <div v-else class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th scope="col" class="col-left">Padrón</th>
            <th scope="col" class="col-left">Origen</th>
            <th scope="col" class="col-left">PadTipo</th>
            <th scope="col" class="col-left">Tributos</th>
            <th scope="col" class="col-left">Desde</th>
            <th scope="col" class="col-right">Días vencido</th>
            <th scope="col" class="col-left">Segmento</th>
            <th scope="col" class="col-right">Importe</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="deuda in deudas" :key="deuda.id">
          <tr
            :class="{ seleccionada: deuda.id === deudaSeleccionadaId }"
          >
            <td class="col-left">
              <button
                type="button"
                class="enlace-padron"
                :aria-label="`Ver gestiones del padrón ${deuda.padron.numeroPadron || 'sin número'}, CM ${deuda.padron.cm}, ${deuda.padron.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia'}`"
                :aria-current="deuda.id === deudaSeleccionadaId ? 'true' : undefined"
                @click="emit('seleccionar', deuda.id)"
              >{{ deuda.padron.numeroPadron || '—' }}</button>
              <span class="secundario">CM: {{ deuda.padron.cm }}</span>
            </td>

            <td class="col-left">{{ deuda.padron.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }}</td>
            <td class="col-left">{{ deuda.padron.tipoPadron || '—' }}</td>

            <td class="col-left">
              <span v-for="tributo in deuda.tributos" :key="tributo.id" class="tributo">
                {{ tributo.descripcion || tributo.codigo }}
              </span>
            </td>

            <td class="col-left">{{ formatoFecha(deuda.deudaDesde) }}</td>

            <td class="col-right num dias">{{ deuda.diasAtraso ?? '—' }}</td>

            <td class="col-left">
              <span class="segmento" :class="getSegmentoClass(deuda.segmentoMora?.nombre)">
                {{ deuda.segmentoMora?.nombre ?? 'Sin segmento' }}
              </span>
            </td>

            <td class="col-right num importe">
              {{ formatoImporte(deuda.importe) }}
            </td>
            <td><button type="button" class="enlace-facturas"
              :aria-label="`${facturasAbiertasId === deuda.id ? 'Ocultar' : 'Ver'} facturas del padrón ${deuda.padron.numeroPadron}, CM ${deuda.padron.cm}`"
              :aria-expanded="facturasAbiertasId === deuda.id"
              :aria-controls="`facturas-${deuda.id}`"
              @click="facturasAbiertasId = facturasAbiertasId === deuda.id ? undefined : deuda.id"
            >{{ facturasAbiertasId === deuda.id ? 'Ocultar facturas' : 'Ver facturas' }}</button>
              <RouterLink class="enlace-evolucion"
                :to="{ name: 'comparar-cartera', query: { cm: deuda.padron.cm, origen: deuda.padron.origen ?? 'INTENDENCIA' } }"
                :aria-label="`Ver evolución del CM ${deuda.padron.cm}, ${deuda.padron.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia'}`"
              >Ver evolución</RouterLink>
            </td>
          </tr>
          <tr v-if="facturasAbiertasId === deuda.id" :id="`facturas-${deuda.id}`" class="fila-facturas">
            <td colspan="9"><FacturasPadronPanel :key="deuda.id" :deuda-id="deuda.id" :numero-padron="deuda.padron.numeroPadron" :cm="deuda.padron.cm" :origen="deuda.padron.origen" /></td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.deudas {
  width: 100%;
  min-width: 0;
}

.tabla-contenedor {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

thead {
  background: var(--color-background);
}

th,
td {
  padding: 11px 14px;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}

th {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

tbody tr {
  background: var(--color-surface);
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: var(--color-surface-secondary);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr.seleccionada {
  background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
}
tbody tr.seleccionada td:first-child {
  box-shadow: inset 2px 0 0 var(--color-primary);
}
.enlace-padron {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.enlace-padron:hover { text-decoration: underline; }
.enlace-padron:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 2px;
}

.enlace-facturas { padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 12px; }
.enlace-evolucion { display: block; margin-top: 7px; color: var(--color-primary); font-size: 12px; }
.enlace-evolucion:hover { text-decoration: underline; }
.enlace-evolucion:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.enlace-facturas:hover { text-decoration: underline; }
.enlace-facturas:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }
.fila-facturas > td { padding: 14px; background: var(--color-background); white-space: normal; }

.col-left {
  text-align: left;
}

.col-right {
  text-align: right;
}

.num {
  font-variant-numeric: tabular-nums;
}

.dias {
  color: var(--color-text);
  font-weight: 500;
}

.secundario {
  display: block;
  margin-top: 3px;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.tributo {
  display: inline-block;
  margin: 1px 3px 1px 0;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.segmento {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.segmento.temprana {
  color: var(--color-temprana);
}

.segmento.inicial {
  color: var(--color-incial);
}

.segmento.tardia {
  color: var(--color-tardia);
}

.importe {
  color: var(--color-text);
  font-weight: 600;
}

.vacio {
  padding: 24px 16px;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 600px) {
  th,
  td {
    padding: 10px 12px;
  }
}
</style>
