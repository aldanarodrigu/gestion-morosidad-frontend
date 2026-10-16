<script setup lang="ts">
import type { DeudaApi } from '@/modules/cartera/types/cartera'

defineProps<{
  deudas: DeudaApi[]
}>()

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
          </tr>
        </thead>

        <tbody>
          <tr v-for="deuda in deudas" :key="deuda.id">
            <td class="col-left">
              <strong>{{ deuda.padron.numeroPadron || '—' }}</strong>
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
          </tr>
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
