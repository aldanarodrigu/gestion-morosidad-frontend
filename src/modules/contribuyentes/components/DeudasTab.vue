<script setup lang="ts">
import { fecha, importe, origen as nombreOrigen, claseSegmento } from '@/shared/utils/formato'
import { ref } from 'vue'
import FacturasPadronPanel from './FacturasPadronPanel.vue'
import HistorialPadronPanel from './HistorialPadronPanel.vue'
import type { DeudaApi } from '@/modules/cartera/types/cartera'

defineProps<{
  deudas: DeudaApi[]
  deudaSeleccionadaId?: number
}>()

type VistaDetalle = 'saldo' | 'resumen' | 'facturas' | 'historial'
const detalleAbiertoId = ref<number>()
const vistaDetalle = ref<VistaDetalle>('saldo')
function alternarDetalle(id: number) {
  if (detalleAbiertoId.value === id) detalleAbiertoId.value = undefined
  else {
    detalleAbiertoId.value = id
    vistaDetalle.value = 'saldo'
  }
}

const emit = defineEmits<{ seleccionar: [deudaId: number] }>()

const getSegmentoClass = (segmento: string | undefined) => claseSegmento(segmento)

const formatoImporte = importe
const formatoDesglose = (valor: number | null | undefined) =>
  valor == null ? 'Sin informar' : importe(valor)
const formatoFecha = fecha
</script>

<template>
  <section class="deudas">
    <p v-if="deudas.length === 0" class="vacio">No hay padrones para mostrar.</p>

    <div v-else class="tabla-contenedor">
      <table class="tabla-datos">
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
            <tr :class="{ seleccionada: deuda.id === deudaSeleccionadaId }">
              <td class="col-left">
                <button
                  type="button"
                  class="enlace-padron"
                  :aria-label="`Ver gestiones del padrón ${deuda.padron.numeroPadron || 'sin número'}, CM ${deuda.padron.cm}, ${nombreOrigen(deuda.padron.origen)}`"
                  :aria-current="deuda.id === deudaSeleccionadaId ? 'true' : undefined"
                  @click="emit('seleccionar', deuda.id)"
                >
                  {{ deuda.padron.numeroPadron || '—' }}
                </button>
                <span class="dato-secundario">CM: {{ deuda.padron.cm }}</span>
                <span v-if="deuda.padron.matricula" class="dato-secundario"
                  >Matrícula: {{ deuda.padron.matricula }}</span
                >
              </td>

              <td class="col-left">{{ nombreOrigen(deuda.padron.origen) }}</td>
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
              <td class="col-detalle">
                <button
                  type="button"
                  class="boton-detalle"
                  :aria-label="`${detalleAbiertoId === deuda.id ? 'Ocultar' : 'Ver'} detalle del padrón ${deuda.padron.numeroPadron}, CM ${deuda.padron.cm}`"
                  :aria-expanded="detalleAbiertoId === deuda.id"
                  :aria-controls="`detalle-${deuda.id}`"
                  @click="alternarDetalle(deuda.id)"
                >
                  {{ detalleAbiertoId === deuda.id ? 'Ocultar detalle' : 'Ver detalle'
                  }}<span aria-hidden="true">{{ detalleAbiertoId === deuda.id ? '⌃' : '⌄' }}</span>
                </button>
              </td>
            </tr>
            <tr
              v-if="detalleAbiertoId === deuda.id"
              :id="`detalle-${deuda.id}`"
              class="fila-detalle"
            >
              <td colspan="9">
                <section class="panel-detalle" :aria-label="`Detalle del CM ${deuda.padron.cm}`">
                  <header class="cabecera-detalle">
                    <div>
                      <h3>Detalle del padrón {{ deuda.padron.numeroPadron || '—' }}</h3>
                      <p>
                        {{ nombreOrigen(deuda.padron.origen) }} · CM {{ deuda.padron.cm
                        }}<template v-if="deuda.padron.matricula">
                          · {{ deuda.padron.matricula }}</template
                        >
                      </p>
                    </div>
                    <RouterLink
                      class="enlace-evolucion"
                      :to="{
                        name: 'comparar-cartera',
                        query: {
                          cm: deuda.padron.cm,
                          origen: deuda.padron.origen ?? 'INTENDENCIA',
                        },
                      }"
                      :aria-label="`Ver evolución del CM ${deuda.padron.cm}, ${nombreOrigen(deuda.padron.origen)}`"
                      >Ver evolución</RouterLink
                    >
                  </header>
                  <div class="opciones-detalle" role="group" aria-label="Información del padrón">
                    <button
                      type="button"
                      class="opcion-saldo"
                      :aria-pressed="vistaDetalle === 'saldo'"
                      @click="vistaDetalle = 'saldo'"
                    >
                      Desglose del saldo
                    </button>
                    <button
                      type="button"
                      class="opcion-resumen"
                      :aria-pressed="vistaDetalle === 'resumen'"
                      @click="vistaDetalle = 'resumen'"
                    >
                      Facturas y años de deuda
                    </button>
                    <button
                      type="button"
                      class="enlace-facturas"
                      :aria-pressed="vistaDetalle === 'facturas'"
                      @click="vistaDetalle = 'facturas'"
                    >
                      Facturas individuales
                    </button>
                    <button
                      type="button"
                      class="enlace-historial"
                      :aria-pressed="vistaDetalle === 'historial'"
                      @click="vistaDetalle = 'historial'"
                    >
                      Personas vinculadas
                    </button>
                  </div>
                  <div v-if="vistaDetalle === 'saldo'" class="contenido-detalle desglose-saldo">
                    <h4>Desglose del saldo</h4>
                    <dl>
                      <div>
                        <dt>Deuda de facturas</dt>
                        <dd>{{ formatoDesglose(deuda.deudaFacturas) }}</dd>
                      </div>
                      <div>
                        <dt>Saldo a favor</dt>
                        <dd>{{ formatoDesglose(deuda.saldoAFavor) }}</dd>
                      </div>
                      <div>
                        <dt>Crédito descontado</dt>
                        <dd>{{ formatoDesglose(deuda.creditoDescontado) }}</dd>
                      </div>
                      <div>
                        <dt>Deuda neta</dt>
                        <dd>{{ formatoDesglose(deuda.importe) }}</dd>
                      </div>
                    </dl>
                  </div>
                  <div
                    v-else-if="vistaDetalle === 'resumen'"
                    class="contenido-detalle facturas-anios"
                  >
                    <h4>Facturas y años de deuda</h4>
                    <dl>
                      <div>
                        <dt>Facturas vencidas consideradas</dt>
                        <dd>{{ deuda.cantidadFacturasVencidas ?? 'Sin informar' }}</dd>
                      </div>
                      <div>
                        <dt>Facturas con importe positivo</dt>
                        <dd>{{ deuda.cantidadFacturasConDeuda ?? 'Sin informar' }}</dd>
                      </div>
                      <div>
                        <dt>Año de facturación desde</dt>
                        <dd>{{ deuda.anioDesde ?? 'Sin informar' }}</dd>
                      </div>
                      <div>
                        <dt>Año de facturación hasta</dt>
                        <dd>{{ deuda.anioHasta ?? 'Sin informar' }}</dd>
                      </div>
                      <div>
                        <dt>Cantidad de años con deuda</dt>
                        <dd>{{ deuda.cantidadAniosDeuda ?? 'Sin informar' }}</dd>
                      </div>
                      <div>
                        <dt>Años con deuda</dt>
                        <dd>{{ deuda.aniosDeuda || 'Sin informar' }}</dd>
                      </div>
                    </dl>
                    <p class="aclaracion-facturas">
                      Los contadores corresponden a facturas pendientes y vencidas. El importe
                      positivo se considera antes de aplicar el saldo a favor.
                    </p>
                  </div>
                  <div v-else-if="vistaDetalle === 'facturas'" class="contenido-externo">
                    <FacturasPadronPanel
                      :key="deuda.id"
                      :deuda-id="deuda.id"
                      :numero-padron="deuda.padron.numeroPadron"
                      :cm="deuda.padron.cm"
                      :origen="deuda.padron.origen"
                    />
                  </div>
                  <div v-else class="contenido-externo">
                    <HistorialPadronPanel
                      :key="deuda.id"
                      :deuda-id="deuda.id"
                      :cm="deuda.padron.cm"
                      :origen="deuda.padron.origen"
                    />
                  </div>
                </section>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.col-detalle {
  text-align: center;
}
.boton-detalle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font: inherit;
  font-size: var(--texto-sm);
  white-space: nowrap;
}
.boton-detalle[aria-expanded='true'] {
  border-color: var(--color-primary);
}
.fila-detalle > td {
  padding: 16px;
  background: var(--color-background);
  white-space: normal;
}
.panel-detalle {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  overflow: hidden;
}
.cabecera-detalle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 18px 20px;
}
.cabecera-detalle h3 {
  font-size: 14px;
}
.cabecera-detalle p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.opciones-detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
}
.opciones-detalle button {
  padding: 12px 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--texto-sm);
}
.opciones-detalle button[aria-pressed='true'] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
.boton-detalle:focus-visible,
.opciones-detalle button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.contenido-detalle {
  padding: 20px;
}
.contenido-detalle h4 {
  font-size: var(--texto-base);
  margin-bottom: 18px;
}
.contenido-detalle dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin: 0;
}
.contenido-detalle dt {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
.contenido-detalle dd {
  margin: 6px 0 0;
  font-size: var(--titulo-panel);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.contenido-externo {
  padding: 16px;
}
.aclaracion-facturas {
  margin-top: 18px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
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

/* Tabla: estilo común .tabla-datos (main.css) */
table {
  white-space: nowrap;
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
.enlace-padron:hover {
  text-decoration: underline;
}
.enlace-padron:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 2px;
}

.enlace-evolucion {
  color: var(--color-primary);
  font-size: var(--texto-sm);
}
.enlace-evolucion:hover {
  text-decoration: underline;
}
.enlace-evolucion:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
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

.dato-secundario {
  display: block;
  margin-top: 3px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}

.tributo {
  display: inline-block;
  margin: 1px 3px 1px 0;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
  font-weight: 500;
}

.segmento {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  font-weight: 600;
}

.segmento.temprana {
  color: var(--color-temprana);
}

.segmento.inicial {
  color: var(--color-inicial);
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
  font-size: var(--texto-base);
  text-align: center;
}

@media (max-width: 599px) {
  th,
  td {
    padding: 10px 12px;
  }
}
</style>
