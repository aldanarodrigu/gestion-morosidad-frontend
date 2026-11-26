<script setup lang="ts">
import { useFiltrosAutomaticos } from '@/shared/composables/useFiltrosAutomaticos'
import { useAlSalir, useConsulta } from '@/shared/composables/useConsulta'
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import FacturasPadronPanel from '@/modules/contribuyentes/components/FacturasPadronPanel.vue'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import PaginacionTabla from '@/shared/components/PaginacionTabla.vue'
import { descargarArchivo } from '@/shared/utils/descarga'
import {
  fecha,
  importe as formatoImporte,
  numero as formatoNumero,
  origen as nombreOrigen,
} from '@/shared/utils/formato'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import ExportacionCancelacionesPanel from '../components/ExportacionCancelacionesPanel.vue'
import {
  exportarCancelaciones,
  filtrosCancelacionesVacios,
  obtenerCancelaciones,
} from '../services/cancelacionService'
import type {
  FiltrosCancelacion,
  FiltrosExportacionCancelaciones,
  FormatoCancelaciones,
  PaginaCancelaciones,
} from '../services/cancelacionService'

const auth = useAuthStore()
const panelExportacion = ref(false)
const exportando = ref(false)
const errorExportacion = ref('')
const salida = useAlSalir()

const filtros = reactive<FiltrosCancelacion>({ ...filtrosCancelacionesVacios })
let aplicados = { ...filtrosCancelacionesVacios }
const { datos: resultados, cargando, error, ejecutar } = useConsulta<PaginaCancelaciones>()
const errorFechas = ref('')
const detalle = ref<number>()
const esqueleto = useEsqueleto(() => cargando.value)
let ultimaPagina = 0

function cargar(pagina = 0) {
  ultimaPagina = pagina
  detalle.value = undefined
  return ejecutar(
    (signal) => obtenerCancelaciones(aplicados, pagina, signal),
    'No se pudieron cargar las cancelaciones.',
  )
}

const mismosFiltros = (a: FiltrosCancelacion, b: FiltrosCancelacion) =>
  (Object.keys(a) as (keyof FiltrosCancelacion)[]).every((campo) => a[campo] === b[campo])

// Los filtros se aplican solos; si no cambiaron desde la última consulta, no se repite.
function buscar(forzar = false) {
  errorFechas.value = ''
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errorFechas.value = 'La fecha hasta debe ser igual o posterior a la fecha desde.'
    return
  }
  if (!forzar && mismosFiltros(filtros, aplicados) && (resultados.value || cargando.value)) return
  aplicados = { ...filtros }
  void cargar()
}

const { aplicarAhora } = useFiltrosAutomaticos(filtros, ['buscar', 'motivo'], buscar)

function limpiar() {
  Object.assign(filtros, filtrosCancelacionesVacios)
  aplicarAhora()
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

async function exportar(
  filtrosExportacion: FiltrosExportacionCancelaciones,
  formato: FormatoCancelaciones,
) {
  if (!auth.puedeExportar || exportando.value) return
  exportando.value = true
  errorExportacion.value = ''
  try {
    const archivo = await exportarCancelaciones(filtrosExportacion, formato, salida)
    if (salida.aborted) return
    descargarArchivo(archivo, `cancelaciones.${formato}`)
    cerrarExportacion()
  } catch {
    if (!salida.aborted) errorExportacion.value = 'No se pudo exportar. Intentá nuevamente.'
  } finally {
    exportando.value = false
  }
}

onMounted(() => cargar())
</script>

<template>
  <PaginaLayout a-ras>
    <template #barra>
      <form
        class="filtros-form"
        aria-label="Filtros de cancelaciones"
        @submit.prevent="aplicarAhora"
      >
        <div class="filtros grilla-formulario">
          <label class="campo-form campo-ancho">
            Buscar
            <input
              v-model="filtros.buscar"
              placeholder="CM, padrón, cobro, documento o nombre"
              maxlength="255"
            />
          </label>
          <label class="campo-form">
            Origen
            <select v-model="filtros.origen">
              <option value="">Todos</option>
              <option value="INTENDENCIA">Intendencia</option>
              <option value="SUCIVE">SUCIVE</option>
            </select>
          </label>
          <label class="campo-form"
            >Motivo<input v-model="filtros.motivo" placeholder="Ej. PAGO" maxlength="60"
          /></label>
          <label class="campo-form">Desde<input v-model="filtros.desde" type="date" /></label>
          <label class="campo-form">Hasta<input v-model="filtros.hasta" type="date" /></label>
          <div class="acciones-formulario">
            <button type="button" class="boton boton-control" @click="limpiar">Limpiar</button>
            <button
              v-if="auth.puedeExportar"
              type="button"
              class="boton boton-control"
              :disabled="exportando"
              @click="abrirExportacion"
            >
              {{ exportando ? 'Exportando...' : 'Exportar' }}
            </button>
          </div>
        </div>
        <p v-if="errorFechas" class="error-texto" role="alert">{{ errorFechas }}</p>
      </form>
      <p class="ayuda-texto">
        Cobros y cancelaciones de padrones registrados durante la sincronización.
      </p>
      <ExportacionCancelacionesPanel
        v-if="auth.puedeExportar && panelExportacion"
        class="panel"
        :exportando="exportando"
        @cancelar="cerrarExportacion"
        @confirmar="exportar"
      />
      <p v-if="exportando" class="ayuda-texto" role="status">
        Preparando archivo con todas las filas filtradas...
      </p>
      <p v-if="errorExportacion" class="error-texto" role="alert">{{ errorExportacion }}</p>
    </template>

    <template v-if="resultados && resultados.totalElementos > 0" #totales>
      <strong class="total">{{ formatoNumero(resultados.totalElementos) }} cancelaciones</strong>
      <span
        >El importe corresponde al cobro completo, que puede estar asociado a más de un
        padrón.</span
      >
    </template>

    <section class="resultados" aria-label="Cancelaciones registradas" :aria-busy="cargando">
      <AvisoCarga :activo="cargando" texto="Cargando cancelaciones" />
      <div v-if="error && !cargando" class="mensaje-pagina error" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="boton" @click="cargar(ultimaPagina)">Reintentar</button>
      </div>
      <template v-else-if="resultados || esqueleto">
        <p v-if="resultados?.totalElementos === 0 && !esqueleto" class="mensaje-pagina">
          No hay cancelaciones registradas para esta consulta.
        </p>
        <template v-else>
          <div class="tabla-contenedor-datos">
            <table class="tabla-datos tabla-a-ras">
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
                  relleno-extremos="var(--pagina-margen)"
                />
                <template v-else>
                  <template v-for="c in resultados?.contenido ?? []" :key="c.id">
                    <tr>
                      <td>
                        <strong>{{ c.numeroPadron || '—' }}</strong
                        ><small>CM {{ c.cm }}</small>
                      </td>
                      <td>{{ nombreOrigen(c.origen) }}</td>
                      <td>
                        {{ c.persona || 'Sin nombre informado'
                        }}<small v-if="c.documento">{{ c.documento }}</small>
                      </td>
                      <td>{{ c.numeroCobro }}</td>
                      <td>{{ fecha(c.fechaCobro) }}</td>
                      <td>{{ c.motivo || 'Sin informar' }}</td>
                      <td class="numero importe">
                        {{ c.importeTotal == null ? '—' : formatoImporte(c.importeTotal) }}
                      </td>
                      <td>
                        <button
                          type="button"
                          class="enlace"
                          :aria-expanded="detalle === c.id"
                          @click="detalle = detalle === c.id ? undefined : c.id"
                        >
                          {{ detalle === c.id ? 'Ocultar facturas' : 'Ver facturas' }}
                        </button>
                      </td>
                    </tr>
                    <tr v-if="detalle === c.id" class="fila-detalle">
                      <td colspan="8">
                        <FacturasPadronPanel
                          :cancelacion-id="c.id"
                          :numero-padron="c.numeroPadron || '—'"
                          :cm="c.cm"
                          :origen="c.origen"
                        />
                      </td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
          <PaginacionTabla
            v-if="resultados && resultados.totalPaginas > 1"
            :pagina="resultados.pagina"
            :total-paginas="resultados.totalPaginas"
            :total-elementos="resultados.totalElementos"
            :tamanio="20"
            :tamanios="[20]"
            elementos="cancelaciones"
            :deshabilitado="cargando"
            @cambiar-pagina="cargar"
          />
        </template>
      </template>
    </section>
  </PaginaLayout>
</template>

<style scoped>
.filtros-form {
  display: grid;
  gap: var(--spacing-sm);
}

.error-texto {
  color: var(--color-tardia);
  font-size: var(--texto-sm);
}

.total {
  color: var(--color-text);
  font-size: var(--texto-base);
}

.importe {
  font-weight: 600;
}

.enlace {
  white-space: nowrap;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--texto-sm);
  font-weight: 600;
  cursor: pointer;
}

.enlace:hover {
  text-decoration: underline;
}

.enlace:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.fila-detalle > td {
  padding: var(--spacing-md) var(--pagina-margen);
  background: var(--color-background);
}

.mensaje-pagina button {
  margin-top: var(--spacing-sm);
}
</style>
