<script setup lang="ts">
import { mensajeDeError, useAlSalir, useConsulta } from '@/shared/composables/useConsulta'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
const auth = useAuthStore()
import {
  obtenerReporte,
  obtenerCatalogosReporte,
  exportarReporte,
} from '../services/reporteService'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import EvolucionMensual from '../components/EvolucionMensual.vue'
import { descargarArchivo } from '@/shared/utils/descarga'
import {
  fechaHora,
  importe as formatoImporte,
  numero as formatoNumero,
  porcentaje as formatoPorcentaje,
  origen as nombreOrigen,
} from '@/shared/utils/formato'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import type { FiltrosReporte, ReporteCartera, SegmentoReporte } from '../services/reporteService'
const filtros = reactive<FiltrosReporte>({ origen: '', tipoPadron: '', segmento: '' })
const { datos, cargando, error, ejecutar } = useConsulta<ReporteCartera>()
const tiposPadron = ref<string[]>([])
const segmentosReporte = ref<SegmentoReporte[]>([])
const {
  cargando: cargandoCatalogos,
  error: errorCargaCatalogos,
  ejecutar: consultarCatalogos,
} = useConsulta<Awaited<ReturnType<typeof obtenerCatalogosReporte>>>()
const errorCatalogos = computed(() => !!errorCargaCatalogos.value)
const exportando = ref(false)
const errorExportacion = ref('')
const esqueleto = useEsqueleto(() => cargando.value)
const salida = useAlSalir()
function cargar() {
  return ejecutar(
    (signal) => obtenerReporte({ ...filtros }, signal),
    'No se pudo cargar el reporte. Intentá nuevamente.',
    { limpiar: true },
  )
}
async function cargarCatalogos() {
  const catalogos = await consultarCatalogos(
    (signal) => obtenerCatalogosReporte(signal),
    'No se pudieron cargar los filtros.',
  )
  if (catalogos) {
    tiposPadron.value = catalogos.tipos
    segmentosReporte.value = catalogos.segmentos
  }
}
async function descargar() {
  if (!auth.puedeExportar || exportando.value || cargando.value || !datos.value) return
  exportando.value = true
  errorExportacion.value = ''
  try {
    const archivo = await exportarReporte({ ...filtros }, salida)
    if (salida.aborted) return
    descargarArchivo(archivo, 'reporte-cartera.xlsx')
  } catch (e) {
    if (!salida.aborted)
      errorExportacion.value = mensajeDeError(e, 'No se pudo exportar el reporte. Intentá nuevamente.')
  } finally {
    exportando.value = false
  }
}
watch(() => [filtros.origen, filtros.tipoPadron, filtros.segmento], cargar)
onMounted(() => {
  cargar()
  cargarCatalogos()
})
const total = computed(() => Number(datos.value?.totales.importe ?? 0))
const personas = computed(() => datos.value?.totales.contribuyentes ?? 0)
const padrones = computed(() => datos.value?.totales.padrones ?? 0)
const importe = formatoImporte
const porcentaje = (n: number) => (total.value ? (Number(n) / total.value) * 100 : 0)
const porcentajeTexto = (n: number) => formatoPorcentaje(porcentaje(n))
const porSegmento = computed(() =>
  (datos.value?.porSegmento ?? []).map((s) => ({
    ...s,
    nombre: s.nombre || 'Sin segmento',
    color:
      s.orden === 1
        ? 'var(--color-temprana)'
        : s.orden === 2
          ? 'var(--color-inicial)'
          : s.orden === 3
            ? 'var(--color-tardia)'
            : 'var(--color-text-light)',
  })),
)
const porTipo = computed(() =>
  (datos.value?.porTipo ?? []).map((t) => ({ ...t, tipo: t.tipo ?? 'Sin PadTipo' })),
)
const resumen = computed(() =>
  (datos.value?.resumen ?? []).map((g) => ({
    ...g,
    clave: JSON.stringify([g.origen, g.tipo]),
    origen: g.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia',
    tipo: g.tipo ?? 'Sin PadTipo',
  })),
)
const porOrigen = computed(() => {
  const grupos = new Map<
    string,
    { codigo: string; nombre: string; cantidad: number; importe: number; color: string }
  >()
  for (const fila of datos.value?.resumen ?? []) {
    const grupo = grupos.get(fila.origen) ?? {
      codigo: fila.origen,
      nombre: nombreOrigen(fila.origen),
      cantidad: 0,
      importe: 0,
      color: fila.origen === 'SUCIVE' ? 'var(--color-serie-secundaria)' : 'var(--color-primary)',
    }
    grupo.cantidad += Number(fila.cantidad)
    grupo.importe += Number(fila.importe)
    grupos.set(fila.origen, grupo)
  }
  return [...grupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo))
})
const indicadores = computed(() => [
  {
    titulo: 'Deuda pendiente',
    valor: importe(total.value),
    nota: 'Importe de los padrones incluidos',
  },
  {
    titulo: 'Contribuyentes',
    valor: formatoNumero(personas.value),
    nota: 'Personas distintas por documento; sin documento, por ID',
  },
  {
    titulo: 'Padrones con deuda',
    valor: formatoNumero(padrones.value),
    nota: 'Padrones incluidos en el reporte',
  },
])
const fechaGeneracion = computed(() => (datos.value ? fechaHora(datos.value.generado) : ''))
function limpiar() {
  filtros.origen = ''
  filtros.tipoPadron = ''
  filtros.segmento = ''
}
</script>

<template>
  <PaginaLayout>
    <template #barra>
      <div class="filtros grilla-formulario" role="group" aria-label="Filtros del reporte">
        <label class="campo-form"
          >Origen
          <select v-model="filtros.origen">
            <option value="">Todos</option>
            <option value="INTENDENCIA">Intendencia</option>
            <option value="SUCIVE">SUCIVE</option>
          </select>
        </label>
        <label class="campo-form"
          >PadTipo
          <select v-model="filtros.tipoPadron" :disabled="cargandoCatalogos || errorCatalogos">
            <option value="">Todos</option>
            <option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option>
          </select>
        </label>
        <label class="campo-form"
          >Segmento de mora
          <select v-model="filtros.segmento" :disabled="cargandoCatalogos || errorCatalogos">
            <option value="">Todos</option>
            <option v-for="s in segmentosReporte" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </label>
        <div class="acciones-formulario">
          <button type="button" class="limpiar boton boton-control" @click="limpiar">
            Limpiar filtros
          </button>
        </div>
      </div>
      <p class="ayuda ayuda-texto">
        Deuda pendiente de la base local: todas las deudas no canceladas con saldo positivo. Los
        filtros se combinan entre sí y se aplican a toda la cartera.
        <RouterLink to="/cartera" class="enlace-cartera">Ir a cartera</RouterLink>
      </p>
      <p v-if="errorCatalogos" role="alert" class="ayuda ayuda-texto">
        {{ errorCargaCatalogos }}
        <button type="button" class="boton" @click="cargarCatalogos">Reintentar filtros</button>
      </p>
    </template>

    <template v-if="(datos || esqueleto) && !(error && !cargando)" #totales>
      <div class="acciones-reporte" :aria-busy="!datos || undefined">
        <span v-if="datos">Reporte generado: {{ fechaGeneracion }}</span
        ><SkeletonBloque v-else ancho="14em" />
        <button
          v-if="auth.puedeExportar"
          type="button"
          class="boton"
          :disabled="exportando || !datos"
          @click="descargar"
        >
          {{ exportando ? 'Exportando...' : 'Exportar Excel' }}
        </button>
      </div>
      <p v-if="errorExportacion" role="alert" class="error-exportacion">{{ errorExportacion }}</p>
    </template>

    <AvisoCarga :activo="cargando" texto="Calculando reporte" />
    <div v-if="error && !cargando" role="alert" class="mensaje-reporte">
      <p>{{ error }}</p>
      <button type="button" class="boton" @click="cargar">Reintentar</button>
    </div>
    <!-- Mientras carga se dibuja la misma estructura con bloques en lugar de los valores -->
    <template v-else-if="datos || esqueleto">
      <div class="indicadores" aria-live="polite" aria-atomic="true">
        <article v-for="indicador in indicadores" :key="indicador.titulo" class="panel indicador">
          <div class="encabezado-indicador">
            <span>{{ indicador.titulo }}</span>
          </div>
          <strong
            ><template v-if="datos">{{ indicador.valor }}</template
            ><SkeletonBloque v-else ancho="60%"
          /></strong>
          <p>{{ indicador.nota }}</p>
        </article>
      </div>
      <p v-if="datos && padrones === 0" class="sin-datos" role="status">
        No hay deuda pendiente para esta combinación de filtros.
      </p>

      <div class="distribuciones">
        <div class="columna-distribuciones">
          <section class="panel grafico" aria-labelledby="segmento-titulo">
            <header>
              <h2 id="segmento-titulo">Distribución por mora</h2>
              <p>Participación en el importe total seleccionado</p>
            </header>
            <div class="series-mora">
              <template v-if="!datos"
                ><div v-for="n in 3" :key="n" class="fila-barra" aria-hidden="true">
                  <div class="rotulo">
                    <SkeletonBloque ancho="8em" /><SkeletonBloque ancho="3em" />
                  </div>
                  <div class="pista" />
                  <div class="detalle-barra">
                    <SkeletonBloque ancho="6em" /><SkeletonBloque ancho="7em" />
                  </div></div
              ></template>
              <div v-for="s in porSegmento" :key="s.id ?? 'sin-segmento'" class="fila-barra">
                <div class="rotulo">
                  <span
                    ><i :style="{ background: s.color }" aria-hidden="true" />{{ s.nombre }}</span
                  ><strong>{{ porcentajeTexto(s.importe) }}</strong>
                </div>
                <div class="pista" aria-hidden="true">
                  <div :style="{ width: `${porcentaje(s.importe)}%`, background: s.color }" />
                </div>
                <div class="detalle-barra">
                  <span>{{ formatoNumero(s.cantidad) }} padrones</span
                  ><span>{{ importe(s.importe) }}</span>
                </div>
              </div>
            </div>
          </section>
          <section class="panel grafico grafico-origen" aria-labelledby="origen-titulo">
            <header>
              <h2 id="origen-titulo">Distribución por origen</h2>
              <p>Participación de cada origen en la deuda seleccionada</p>
            </header>
            <div class="series-origen">
              <template v-if="!datos"
                ><div v-for="n in 2" :key="n" class="fila-barra" aria-hidden="true">
                  <div class="rotulo">
                    <SkeletonBloque ancho="7em" /><SkeletonBloque ancho="3em" />
                  </div>
                  <div class="pista" />
                  <div class="detalle-barra">
                    <SkeletonBloque ancho="6em" /><SkeletonBloque ancho="7em" />
                  </div></div
              ></template>
              <div v-for="o in porOrigen" :key="o.codigo" class="fila-barra">
                <div class="rotulo">
                  <span
                    ><i :style="{ background: o.color }" aria-hidden="true" />{{ o.nombre }}</span
                  ><strong>{{ porcentajeTexto(o.importe) }}</strong>
                </div>
                <div class="pista" aria-hidden="true">
                  <div :style="{ width: `${porcentaje(o.importe)}%`, background: o.color }" />
                </div>
                <div class="detalle-barra">
                  <span>{{ formatoNumero(o.cantidad) }} padrones</span
                  ><span>{{ importe(o.importe) }}</span>
                </div>
              </div>
            </div>
            <p v-if="datos && !porOrigen.length" class="nota-tipos">
              No hay deuda pendiente para estos filtros.
            </p>
          </section>
        </div>
        <div class="columna-tipos">
          <section class="panel grafico grafico-tipos" aria-labelledby="tipo-titulo">
            <header>
              <h2 id="tipo-titulo">Deuda por PadTipo</h2>
              <p>Tipos de padrón con mayor deuda en la selección</p>
            </header>
            <div class="series-tipos">
              <template v-if="!datos"
                ><div v-for="n in 4" :key="n" class="fila-barra" aria-hidden="true">
                  <div class="rotulo">
                    <SkeletonBloque ancho="5em" /><SkeletonBloque ancho="7em" />
                  </div>
                  <div class="pista" />
                  <div class="detalle-barra">
                    <SkeletonBloque ancho="6em" /><SkeletonBloque ancho="6em" />
                  </div></div
              ></template>
              <div v-for="tipo in porTipo" :key="tipo.tipo" class="fila-barra">
                <div class="rotulo">
                  <span>{{ tipo.tipo }}</span
                  ><strong>{{ importe(tipo.importe) }}</strong>
                </div>
                <div class="pista" aria-hidden="true">
                  <div :style="{ width: `${porcentaje(tipo.importe)}%` }" />
                </div>
                <div class="detalle-barra">
                  <span>{{ formatoNumero(tipo.cantidad) }} padrones</span
                  ><span>{{ porcentajeTexto(tipo.importe) }} del total</span>
                </div>
              </div>
            </div>
            <p class="nota-tipos">
              La clasificación urbana/rural por PadTipo queda pendiente de confirmar.
            </p>
          </section>
        </div>
      </div>

      <section class="panel desglose" aria-labelledby="desglose-titulo">
        <header>
          <h2 id="desglose-titulo">Resumen por origen y PadTipo</h2>
          <p>Totales de todas las deudas que cumplen los filtros</p>
        </header>
        <div class="tabla-contenedor tabla-contenedor-datos">
          <table class="tabla-datos tabla-a-ras">
            <thead>
              <tr>
                <th scope="col">Origen</th>
                <th scope="col">PadTipo</th>
                <th scope="col" class="numero">Contribuyentes</th>
                <th scope="col" class="numero">Padrones</th>
                <th scope="col" class="numero">Deuda pendiente</th>
                <th scope="col" class="numero">% del total</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonFilas
                v-if="!datos"
                :columnas="6"
                :filas="6"
                :derecha="[2, 3, 4, 5]"
                :anchos="['6em', '4em', '3em', '3em', '8em', '3em']"
                relleno-extremos="var(--pagina-margen)"
              />
              <tr v-for="fila in resumen" :key="fila.clave">
                <td>{{ fila.origen }}</td>
                <td>{{ fila.tipo }}</td>
                <td class="numero">{{ formatoNumero(fila.personas) }}</td>
                <td class="numero">{{ formatoNumero(fila.cantidad) }}</td>
                <td class="numero monto">{{ importe(fila.importe) }}</td>
                <td class="numero">{{ porcentajeTexto(fila.importe) }}</td>
              </tr>
              <tr v-if="datos && !resumen.length">
                <td colspan="6" class="vacio">Sin resultados para esta combinación.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="2">Total de la selección</th>
                <template v-if="datos"
                  ><td class="numero">{{ formatoNumero(personas) }}</td>
                  <td class="numero">{{ formatoNumero(padrones) }}</td>
                  <td class="numero monto">{{ importe(total) }}</td>
                  <td class="numero">{{ total ? '100 %' : '0 %' }}</td></template
                ><template v-else
                  ><td v-for="n in 4" :key="n" class="numero">
                    <SkeletonBloque ancho="5em" class="derecha" /></td
                ></template>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="nota-tabla">
          Una persona puede aparecer en más de una categoría. El total cuenta contribuyentes
          distintos.
        </p>
      </section>
    </template>
    <EvolucionMensual v-if="datos?.evolucionMensual?.length" :filas="datos.evolucionMensual" />
    <p class="pie">
      Los reportes consultan la base local. Para incorporar cambios de la Intendencia o SUCIVE,
      ejecutá la sincronización correspondiente.
    </p>
  </PaginaLayout>
</template>

<style scoped>
.ayuda {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}
.enlace-cartera {
  color: var(--color-primary);
  font-weight: 500;
  white-space: nowrap;
}
.enlace-cartera:hover {
  text-decoration: underline;
}
.acciones-reporte {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.error-exportacion {
  flex-basis: 100%;
  color: var(--color-tardia);
}
.mensaje-reporte {
  display: grid;
  justify-items: start;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}
select:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

/* Indicadores */
.indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
}
.indicador {
  padding: 20px var(--pagina-margen);
}
.encabezado-indicador {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: var(--texto-base);
  color: var(--color-text-secondary);
}
.indicador > strong {
  display: block;
  margin: 10px 0 6px;
  color: var(--color-primary);
  font-size: clamp(21px, 2.2vw, 28px);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}
.indicador p {
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
}

/* Distribuciones: tres columnas en pantallas anchas, dos en notebooks chicas, una en tablet vertical */
.distribuciones {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: var(--spacing-md);
}
.columna-distribuciones,
.columna-tipos {
  display: contents;
}
.grafico {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 20px var(--pagina-margen);
}
.grafico header {
  margin-bottom: 20px;
}
.grafico h2 {
  font-size: var(--titulo-panel);
  font-weight: 600;
}
.grafico header p,
.desglose header p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}
.series-mora,
.series-tipos,
.series-origen {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 20px;
}
.fila-barra {
  min-width: 0;
}
.rotulo strong {
  flex-shrink: 0;
}
.rotulo,
.detalle-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--texto-sm);
}
.rotulo > span {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
i {
  display: inline-block;
  height: 8px;
  width: 8px;
  border-radius: 50%;
}
.pista {
  height: 8px;
  margin: 10px 0 7px;
  background: var(--color-background);
  border-radius: 5px;
  overflow: hidden;
}
.pista > div {
  height: 100%;
  background: var(--color-primary);
  border-radius: inherit;
}
.detalle-barra {
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.nota-tipos {
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
  margin-top: 16px;
}

/* Resumen por origen y PadTipo */
.desglose {
  overflow: hidden;
}
.desglose header {
  padding: 20px var(--pagina-margen);
}
.desglose h2 {
  font-size: var(--titulo-panel);
  font-weight: 600;
}
.desglose .tabla-datos > thead > tr > th,
.desglose .tabla-datos > tbody > tr > td {
  white-space: nowrap;
}
.derecha {
  margin-inline-start: auto;
}
.monto {
  font-weight: 600;
}
.desglose tfoot {
  background: var(--color-surface-secondary);
}
.nota-tabla {
  padding: 12px var(--pagina-margen);
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}

.pie {
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
  text-align: center;
}
.sin-datos {
  padding: 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--texto-base);
  text-align: center;
  color: var(--color-text-secondary);
}
.vacio {
  text-align: center;
  color: var(--color-text-secondary);
}

@media (max-width: 1279px) {
  .distribuciones {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .distribuciones,
  .indicadores {
    grid-template-columns: 1fr;
  }
}
</style>
