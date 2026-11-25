<script setup lang="ts">
import { onMounted, onScopeDispose, reactive, ref } from 'vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import FacturasPadronPanel from '@/modules/contribuyentes/components/FacturasPadronPanel.vue'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import ExportacionCancelacionesPanel from '../components/ExportacionCancelacionesPanel.vue'
import { exportarCancelaciones, filtrosCancelacionesVacios, obtenerCancelaciones } from '../services/cancelacionService'
import type { FiltrosCancelacion, FiltrosExportacionCancelaciones, FormatoCancelaciones, PaginaCancelaciones } from '../services/cancelacionService'

const auth = useAuthStore()
const panelExportacion = ref(false)
const exportando = ref(false)
const errorExportacion = ref('')
const descarga = new AbortController()

const filtros = reactive<FiltrosCancelacion>({ ...filtrosCancelacionesVacios })
let aplicados = { ...filtrosCancelacionesVacios }
const resultados = ref<PaginaCancelaciones>()
const cargando = ref(false)
const error = ref('')
const errorFechas = ref('')
const detalle = ref<number>()
const esqueleto = useEsqueleto(() => cargando.value)
let controller: AbortController | undefined
let ultimaPagina = 0

async function cargar(pagina = 0) {
  controller?.abort()
  const actual = new AbortController()
  controller = actual
  ultimaPagina = pagina
  cargando.value = true
  error.value = ''
  detalle.value = undefined
  try {
    const respuesta = await obtenerCancelaciones(aplicados, pagina, actual.signal)
    if (!actual.signal.aborted) resultados.value = respuesta
  } catch {
    if (!actual.signal.aborted) error.value = 'No se pudieron cargar las cancelaciones.'
  } finally {
    if (controller === actual) cargando.value = false
  }
}

function buscar() {
  errorFechas.value = ''
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errorFechas.value = 'La fecha hasta debe ser igual o posterior a la fecha desde.'
    return
  }
  aplicados = { ...filtros }
  void cargar()
}

function limpiar() {
  Object.assign(filtros, filtrosCancelacionesVacios)
  buscar()
}

function abrirExportacion() {
  if (!auth.puedeExportar) return
  errorExportacion.value = ''
  panelExportacion.value = true
}

function cerrarExportacion() {
  panelExportacion.value = false
  errorExportacion.value = ''
}

async function exportar(filtrosExportacion: FiltrosExportacionCancelaciones, formato: FormatoCancelaciones) {
  if (!auth.puedeExportar || exportando.value) return
  exportando.value = true
  errorExportacion.value = ''
  try {
    const archivo = await exportarCancelaciones(filtrosExportacion, formato, descarga.signal)
    if (descarga.signal.aborted) return
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'cancelaciones.' + formato
    document.body.appendChild(enlace)
    try {
      enlace.click()
      cerrarExportacion()
    } finally {
      enlace.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } catch {
    if (!descarga.signal.aborted) errorExportacion.value = 'No se pudo exportar. Intentá nuevamente.'
  } finally {
    exportando.value = false
  }
}

const formatoImporte = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha = (dia: string) => dia.split('-').reverse().join('/')

onMounted(() => cargar())
onScopeDispose(() => {
  controller?.abort()
  descarga.abort()
})
</script>

<template>
  <main class="cancelaciones">
    <header>
      <h1>Cancelaciones</h1>
      <p>Cobros y cancelaciones de padrones registrados durante la sincronización.</p>
    </header>

    <form class="panel" @submit.prevent="buscar">
      <div class="filtros">
        <label>
          Buscar
          <input v-model="filtros.buscar" placeholder="CM, padrón, cobro, documento o nombre" maxlength="255" />
        </label>
        <label>
          Origen
          <select v-model="filtros.origen">
            <option value="">Todos los orígenes</option>
            <option value="INTENDENCIA">Intendencia</option>
            <option value="SUCIVE">SUCIVE</option>
          </select>
        </label>
        <label>Motivo<input v-model="filtros.motivo" placeholder="Ej. PAGO" maxlength="60" /></label>
        <label>Desde<input v-model="filtros.desde" type="date" /></label>
        <label>Hasta<input v-model="filtros.hasta" type="date" /></label>
        <div class="botones">
          <button type="submit" class="primario">Buscar</button>
          <button type="button" @click="limpiar">Limpiar</button>
          <button v-if="auth.puedeExportar" type="button" :disabled="exportando" @click="abrirExportacion">
            {{ exportando ? 'Exportando...' : 'Exportar Excel' }}
          </button>
        </div>
      </div>
      <p v-if="errorFechas" class="error" role="alert">{{ errorFechas }}</p>
    </form>

    <ExportacionCancelacionesPanel v-if="auth.puedeExportar && panelExportacion"
      class="panel" :exportando="exportando" @cancelar="cerrarExportacion" @confirmar="exportar" />
    <p v-if="exportando" class="nota" role="status">Preparando archivo con todas las filas filtradas...</p>
    <p v-if="errorExportacion" class="error" role="alert">{{ errorExportacion }}</p>

    <section class="panel" aria-label="Cancelaciones registradas" :aria-busy="cargando">
      <AvisoCarga :activo="cargando" texto="Cargando cancelaciones" />
      <div v-if="error && !cargando" class="error" role="alert">
        {{ error }}
        <button type="button" @click="cargar(ultimaPagina)">Reintentar</button>
      </div>
      <template v-else-if="resultados || esqueleto">
        <p v-if="resultados?.totalElementos === 0 && !esqueleto">No hay cancelaciones registradas para esta consulta.</p>
        <template v-else>
          <p class="nota">
            <SkeletonBloque v-if="!resultados" ancho="min(560px, 100%)" />
            <template v-else>{{ resultados.totalElementos }} registros. El importe corresponde al cobro completo, que puede estar asociado a más de un padrón.</template>
          </p>
          <div class="tabla">
            <table>
              <thead>
                <tr>
                  <th scope="col">Padrón / CM</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Contribuyente</th>
                  <th scope="col">N.º de cobro</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Motivo</th>
                  <th scope="col" class="numero">Importe del cobro</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonFilas
                  v-if="esqueleto"
                  :columnas="8"
                  :filas="20"
                  :con-detalle="[0, 2]"
                  :derecha="[6]"
                  :anchos="['6em', '6em', '11em', '6em', '6em', '5em', '7em', '7em']"
                />
                <template v-else>
                <template v-for="c in resultados?.contenido ?? []" :key="c.id">
                  <tr>
                    <td><strong>{{ c.numeroPadron || '—' }}</strong><small>CM {{ c.cm }}</small></td>
                    <td>{{ c.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }}</td>
                    <td>{{ c.persona || 'Sin nombre informado' }}<small v-if="c.documento">{{ c.documento }}</small></td>
                    <td>{{ c.numeroCobro }}</td>
                    <td>{{ fecha(c.fechaCobro) }}</td>
                    <td>{{ c.motivo || 'Sin informar' }}</td>
                    <td class="numero">{{ c.importeTotal == null ? '—' : formatoImporte.format(c.importeTotal) }}</td>
                    <td>
                      <button type="button" :aria-expanded="detalle === c.id"
                        @click="detalle = detalle === c.id ? undefined : c.id">
                        {{ detalle === c.id ? 'Ocultar facturas' : 'Ver facturas' }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="detalle === c.id">
                    <td colspan="8">
                      <FacturasPadronPanel :cancelacion-id="c.id" :numero-padron="c.numeroPadron || '—'"
                        :cm="c.cm" :origen="c.origen" />
                    </td>
                  </tr>
                </template>
                </template>
              </tbody>
            </table>
          </div>
          <footer v-if="resultados && resultados.totalPaginas > 1">
            <button type="button" :disabled="resultados.pagina === 0" @click="cargar(resultados.pagina - 1)">Anterior</button>
            <span>Página {{ resultados.pagina + 1 }} de {{ resultados.totalPaginas }}</span>
            <button type="button" :disabled="resultados.pagina + 1 >= resultados.totalPaginas"
              @click="cargar(resultados.pagina + 1)">Siguiente</button>
          </footer>
        </template>
      </template>
    </section>
  </main>
</template>

<style scoped>
.cancelaciones {
  width: min(1440px, 100%);
  padding: 28px;
  margin-inline: auto;
  display: grid;
  gap: 20px;
}
header p, .nota, small { color: var(--color-text-secondary); }
header p { margin-top: 6px; }
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  min-width: 0;
}
.filtros, .botones, footer { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
label { display: grid; gap: 6px; font-size: 13px; flex: 1 1 120px; min-width: 0; }
.filtros > label:first-child { flex-basis: 280px; }
input, select, button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
}
button { color: var(--color-primary); }
button:disabled { opacity: .5; cursor: default; }
.primario { background: var(--color-primary); color: white; }
.nota { font-size: 13px; margin-bottom: 12px; }
.tabla { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; --esqueleto-celda-padding: 12px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--color-border); }
th { background: var(--color-background); color: var(--color-text-secondary); font-weight: 500; }
small { display: block; margin-top: 4px; }
.numero { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
footer { justify-content: flex-end; align-items: center; margin-top: 16px; font-size: 13px; }
.error { color: var(--color-tardia); margin-top: 8px; }
@media (max-width: 650px) {
  .cancelaciones, .panel { padding: 16px; }
}
</style>
