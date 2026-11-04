<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartBarIcon, BanknotesIcon, UsersIcon, HomeModernIcon } from '@heroicons/vue/24/outline'
import { obtenerReporte, obtenerCatalogosReporte, exportarReporte } from '../services/reporteService'
import type { FiltrosReporte, ReporteCartera, SegmentoReporte } from '../services/reporteService'
const filtros = reactive<FiltrosReporte>({ origen: '', tipoPadron: '', segmento: '' })
const datos = ref<ReporteCartera>()
const cargando = ref(false)
const error = ref('')
const tiposPadron = ref<string[]>([])
const segmentosReporte = ref<SegmentoReporte[]>([])
const cargandoCatalogos = ref(false)
const errorCatalogos = ref(false)
const exportando = ref(false)
const errorExportacion = ref('')
let controller: AbortController | undefined
const catalogosController = new AbortController()
const exportController = new AbortController()
async function cargar() {
 controller?.abort(); const actual = new AbortController(); controller = actual
 cargando.value = true; error.value = ''; datos.value = undefined
 try {
  const reporte = await obtenerReporte({...filtros},actual.signal)
  if (!actual.signal.aborted) datos.value = reporte
 } catch { if (!actual.signal.aborted) error.value = 'No se pudo cargar el reporte. Intentá nuevamente.' }
 finally { if (controller === actual) cargando.value = false }
}
async function cargarCatalogos() {
 cargandoCatalogos.value = true; errorCatalogos.value = false
 try {
  const catalogos = await obtenerCatalogosReporte(catalogosController.signal)
  if (!catalogosController.signal.aborted) { tiposPadron.value = catalogos.tipos; segmentosReporte.value = catalogos.segmentos }
 } catch { if (!catalogosController.signal.aborted) errorCatalogos.value = true }
 finally { cargandoCatalogos.value = false }
}
async function descargar() {
 if (exportando.value || cargando.value || !datos.value) return
 exportando.value = true; errorExportacion.value = ''
 try {
  const archivo = await exportarReporte({...filtros},exportController.signal)
  if (exportController.signal.aborted) return
  const url = URL.createObjectURL(archivo); const enlace = document.createElement('a')
  enlace.href = url; enlace.download = 'reporte-cartera.xlsx'; document.body.appendChild(enlace)
  try { enlace.click() } finally { enlace.remove(); setTimeout(() => URL.revokeObjectURL(url),1000) }
 } catch { if (!exportController.signal.aborted) errorExportacion.value = 'No se pudo exportar el reporte. Intentá nuevamente.' }
 finally { exportando.value = false }
}
watch(() => [filtros.origen,filtros.tipoPadron,filtros.segmento], cargar)
onMounted(() => { cargar(); cargarCatalogos() })
onScopeDispose(() => { controller?.abort(); catalogosController.abort(); exportController.abort() })
const total = computed(() => Number(datos.value?.totales.importe ?? 0))
const personas = computed(() => datos.value?.totales.contribuyentes ?? 0)
const padrones = computed(() => datos.value?.totales.padrones ?? 0)
const importe = (n: number) => new Intl.NumberFormat('es-UY',{style:'currency',currency:'UYU',maximumFractionDigits:2}).format(n)
const porcentaje = (n: number) => total.value ? Number(n) / total.value * 100 : 0
const porcentajeTexto = (n: number) => `${porcentaje(n).toLocaleString('es-UY',{maximumFractionDigits:1})} %`
const porSegmento = computed(() => (datos.value?.porSegmento ?? []).map(s=>({ ...s,nombre:s.nombre || 'Sin segmento',color:s.orden===1?'var(--color-temprana)':s.orden===2?'var(--color-incial)':s.orden===3?'var(--color-tardia)':'var(--color-text-light)' })))
const porTipo = computed(() => (datos.value?.porTipo ?? []).map(t=>({...t,tipo:t.tipo ?? 'Sin PadTipo'})))
const resumen = computed(() => (datos.value?.resumen ?? []).map(g=>({...g,clave:JSON.stringify([g.origen,g.tipo]),origen:g.origen==='SUCIVE'?'SUCIVE':'Intendencia',tipo:g.tipo ?? 'Sin PadTipo'})))
const porOrigen = computed(() => {
 const grupos = new Map<string, { codigo: string; nombre: string; cantidad: number; importe: number; color: string }>()
 for (const fila of datos.value?.resumen ?? []) {
  const grupo = grupos.get(fila.origen) ?? { codigo: fila.origen, nombre: fila.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia', cantidad: 0, importe: 0, color: fila.origen === 'SUCIVE' ? '#6f86b3' : 'var(--color-primary)' }
  grupo.cantidad += Number(fila.cantidad)
  grupo.importe += Number(fila.importe)
  grupos.set(fila.origen, grupo)
 }
 return [...grupos.values()].sort((a,b) => a.codigo.localeCompare(b.codigo))
})
const indicadores = computed(() => [
 {titulo:'Deuda pendiente',valor:importe(total.value),nota:'Importe de los padrones incluidos',icono:BanknotesIcon},
 {titulo:'Contribuyentes',valor:personas.value.toLocaleString('es-UY'),nota:'Personas distintas por documento; sin documento, por ID',icono:UsersIcon},
 {titulo:'Padrones con deuda',valor:padrones.value.toLocaleString('es-UY'),nota:'Padrones incluidos en el reporte',icono:HomeModernIcon},
])
const fechaGeneracion = computed(() => {const [d,h]=datos.value?.generado.split('T') ?? [];return d ? `${d.split('-').reverse().join('/')} ${h?.slice(0,8) ?? ''}` : ''})
function limpiar() {filtros.origen='';filtros.tipoPadron='';filtros.segmento=''}
</script>

<template>
  <section class="reportes" aria-labelledby="reportes-titulo">
    <div class="contenido">
      <header class="cabecera">
        <div>
          <h1 id="reportes-titulo">Reportes</h1>
          <p>Una visión general de la deuda y su distribución</p>
        </div>
        <RouterLink to="/cartera" class="enlace-cartera">Ir a cartera <span aria-hidden="true">→</span></RouterLink>
      </header>

      <p class="origen-datos">Datos de la base local · Se incluyen todas las deudas no canceladas con saldo positivo.</p>

      <section class="panel" aria-labelledby="estado-titulo">
        <div class="titulo-panel"><h2 id="estado-titulo">Estado actual de la deuda</h2><span class="etiqueta">Deuda pendiente</span></div>
        <div class="filtros">
          <label>Origen
            <select v-model="filtros.origen"><option value="">Todos los orígenes</option><option value="INTENDENCIA">Intendencia</option><option value="SUCIVE">SUCIVE</option></select>
          </label>
          <label>PadTipo
            <select v-model="filtros.tipoPadron" :disabled="cargandoCatalogos || errorCatalogos"><option value="">Todos los PadTipo</option><option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option></select>
          </label>
          <label>Segmento de mora
            <select v-model="filtros.segmento" :disabled="cargandoCatalogos || errorCatalogos"><option value="">Todos los segmentos</option><option v-for="s in segmentosReporte" :key="s.id" :value="s.id">{{ s.nombre }}</option></select>
          </label>
          <button type="button" class="limpiar" @click="limpiar">Limpiar filtros</button>
        </div>
        <p class="ayuda">Los filtros se combinan entre sí y se aplican a toda la cartera, no solo a una página.</p>
        <p v-if="errorCatalogos" role="alert" class="ayuda">No se pudieron cargar los filtros. <button type="button" @click="cargarCatalogos">Reintentar filtros</button></p>
      </section>

      <p v-if="cargando" role="status" class="mensaje-reporte">Calculando reporte...</p>
      <div v-else-if="error" role="alert" class="mensaje-reporte"><p>{{ error }}</p><button type="button" @click="cargar">Reintentar</button></div>
      <template v-else-if="datos">
      <div class="acciones-reporte"><span>Reporte generado: {{ fechaGeneracion }}</span><button type="button" :disabled="exportando" @click="descargar">{{ exportando ? 'Exportando...' : 'Exportar Excel' }}</button></div>
      <p v-if="errorExportacion" role="alert" class="error-exportacion">{{ errorExportacion }}</p>
      <div class="indicadores" aria-live="polite" aria-atomic="true">
        <article v-for="indicador in indicadores" :key="indicador.titulo" class="panel indicador">
          <div class="encabezado-indicador"><span>{{ indicador.titulo }}</span><component :is="indicador.icono" aria-hidden="true" /></div>
          <strong>{{ indicador.valor }}</strong><p>{{ indicador.nota }}</p>
        </article>
      </div>
      <p v-if="padrones === 0" class="sin-datos" role="status">No hay deuda pendiente para esta combinación de filtros.</p>

      <div class="distribuciones">
        <div class="columna-distribuciones">
        <section class="panel grafico" aria-labelledby="segmento-titulo">
          <header><h2 id="segmento-titulo">Distribución por mora</h2><p>Participación en el importe total seleccionado</p></header>
          <div class="series-mora">
          <div v-for="s in porSegmento" :key="s.id ?? 'sin-segmento'" class="fila-barra">
            <div class="rotulo"><span><i :style="{ background: s.color }" aria-hidden="true" />{{ s.nombre }}</span><strong>{{ porcentajeTexto(s.importe) }}</strong></div>
            <div class="pista" aria-hidden="true"><div :style="{ width: `${porcentaje(s.importe)}%`, background: s.color }" /></div>
            <div class="detalle-barra"><span>{{ s.cantidad }} padrones</span><span>{{ importe(s.importe) }}</span></div>
          </div>
          </div>
        </section>
        <section class="panel grafico grafico-origen" aria-labelledby="origen-titulo">
          <header><h2 id="origen-titulo">Distribución por origen</h2><p>Participación de cada origen en la deuda seleccionada</p></header>
          <div class="series-origen">
            <div v-for="o in porOrigen" :key="o.codigo" class="fila-barra">
              <div class="rotulo"><span><i :style="{ background: o.color }" aria-hidden="true" />{{ o.nombre }}</span><strong>{{ porcentajeTexto(o.importe) }}</strong></div>
              <div class="pista" aria-hidden="true"><div :style="{ width: `${porcentaje(o.importe)}%`, background: o.color }" /></div>
              <div class="detalle-barra"><span>{{ o.cantidad }} padrones</span><span>{{ importe(o.importe) }}</span></div>
            </div>
          </div>
          <p v-if="!porOrigen.length" class="nota-tipos">No hay deuda pendiente para estos filtros.</p>
        </section>
        </div>
        <div class="columna-tipos">
        <section class="panel grafico grafico-tipos" aria-labelledby="tipo-titulo">
          <header><h2 id="tipo-titulo">Deuda por PadTipo</h2><p>Tipos de padrón con mayor deuda en la selección</p></header>
          <div class="series-tipos" tabindex="0" role="region" aria-label="Tipos de padrón ordenados por deuda, lista desplazable">
          <div v-for="tipo in porTipo" :key="tipo.tipo" class="fila-barra">
            <div class="rotulo"><span>{{ tipo.tipo }}</span><strong>{{ importe(tipo.importe) }}</strong></div>
            <div class="pista" aria-hidden="true"><div :style="{ width: `${porcentaje(tipo.importe)}%` }" /></div>
            <div class="detalle-barra"><span>{{ tipo.cantidad }} padrones</span><span>{{ porcentajeTexto(tipo.importe) }} del total</span></div>
          </div>
          </div>
          <p v-if="porTipo.length > 4" class="nota-tipos">Desplazá la lista para ver todos los PadTipo. El detalle completo también está en la tabla inferior.</p>
          <p class="nota-tipos">La clasificación urbana/rural por PadTipo queda pendiente de confirmar.</p>
        </section>
        </div>
      </div>

      <section class="panel desglose" aria-labelledby="desglose-titulo">
        <header><h2 id="desglose-titulo">Resumen por origen y PadTipo</h2><p>Totales de todas las deudas que cumplen los filtros</p></header>
        <div class="tabla-contenedor">
          <table>
            <thead><tr><th scope="col">Origen</th><th scope="col">PadTipo</th><th scope="col" class="numero">Contribuyentes</th><th scope="col" class="numero">Padrones</th><th scope="col" class="numero">Deuda pendiente</th><th scope="col" class="numero">% del total</th></tr></thead>
            <tbody><tr v-for="fila in resumen" :key="fila.clave"><td>{{ fila.origen }}</td><td>{{ fila.tipo }}</td><td class="numero">{{ fila.personas }}</td><td class="numero">{{ fila.cantidad }}</td><td class="numero monto">{{ importe(fila.importe) }}</td><td class="numero">{{ porcentajeTexto(fila.importe) }}</td></tr>
              <tr v-if="!resumen.length"><td colspan="6" class="vacio">Sin resultados para esta combinación.</td></tr>
            </tbody>
            <tfoot><tr><th scope="row" colspan="2">Total de la selección</th><td class="numero">{{ personas }}</td><td class="numero">{{ padrones }}</td><td class="numero monto">{{ importe(total) }}</td><td class="numero">{{ total ? '100 %' : '0 %' }}</td></tr></tfoot>
          </table>
        </div>
        <p class="nota-tabla">Una persona puede aparecer en más de una categoría. El total cuenta contribuyentes distintos.</p>
      </section>

      </template>
      <section class="panel evolucion" aria-labelledby="evolucion-titulo">
        <div class="icono-evolucion"><ChartBarIcon aria-hidden="true" /></div>
        <div><span class="proximamente">PRÓXIMA ETAPA</span><h2 id="evolucion-titulo">Evolución mensual y recaudación</h2><p>Comparación entre meses, deuda por vencimiento y seguimiento de lo cobrado.</p><p class="nota-evolucion">Se incorporará cuando estén disponibles los cierres mensuales y el historial completo de cobros.</p></div>
      </section>
      <p class="pie">Los reportes consultan la base local. Para incorporar cambios de la Intendencia o SUCIVE, ejecutá la sincronización correspondiente.</p>
    </div>
  </section>
</template>

<style scoped>
.origen-datos { color: var(--color-text-secondary); font-size: 12px; margin-bottom: 18px; }
.mensaje-reporte { padding: 24px 0; color: var(--color-text-secondary); font-size: 13px; }
.acciones-reporte { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 0; font-size: 11px; color: var(--color-text-secondary); }
.acciones-reporte button, .mensaje-reporte button, .ayuda button { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-primary); background: var(--color-surface); font-size: 12px; }
button:disabled, select:disabled { opacity: 0.6; cursor: not-allowed; }
.error-exportacion { font-size: 12px; color: var(--color-tardia); margin-top: 12px; }
.reportes { flex: 1; background: var(--color-background); color: var(--color-text); }
.contenido { width: min(1200px, calc(100% - 48px)); margin: var(--spacing-lg) auto var(--spacing-xl); }
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
h1 { font-size: 20px; } h2 { font-size: 15px; font-weight: 600; }
.cabecera p, header p { margin-top: 5px; color: var(--color-text-secondary); font-size: 13px; }
.enlace-cartera { color: var(--color-primary); font-size: 13px; white-space: nowrap; }
.aviso-demo { display: flex; align-items: center; gap: 12px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid var(--color-border); border-left: 3px solid var(--color-accent); background: var(--color-surface); border-radius: var(--radius-md); font-size: 13px; }
.aviso-demo > svg { width: 24px; height: 24px; flex-shrink: 0; color: var(--color-primary); }
.aviso-demo p { margin-top: 2px; color: var(--color-text-secondary); font-size: 12px; }
.panel { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
.titulo-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--color-border); }
.etiqueta { font-size: 11px; color: var(--color-text-secondary); }
.filtros { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 16px; padding: 20px 22px 12px; align-items: end; }
label { display: flex; flex-direction: column; gap: 7px; font-size: 12px; color: var(--color-text-secondary); }
select, .limpiar { height: 39px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-surface); font-size: 13px; width: 100%; }
.limpiar { color: var(--color-primary); }
select:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.ayuda { padding: 0 22px 18px; color: var(--color-text-secondary); font-size: 12px; }
.indicadores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 20px 0; }
.indicador { padding: 20px 22px; }
.encabezado-indicador { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; color: var(--color-text-secondary); }
.encabezado-indicador svg { width: 21px; height: 21px; color: var(--color-primary); }
.indicador > strong { display: block; margin: 10px 0 6px; color: var(--color-primary); font-size: clamp(21px, 2.4vw, 29px); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
.indicador p { font-size: 11px; color: var(--color-text-secondary); }
.distribuciones { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 20px; margin-bottom: 20px; }
.columna-distribuciones { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.columna-tipos { position: relative; min-width: 0; min-height: 0; }
.grafico-tipos { position: absolute; inset: 0; display: flex; flex-direction: column; min-height: 0; }
.grafico-tipos header, .grafico-tipos .nota-tipos { flex-shrink: 0; }
.grafico { padding: 22px; }
.grafico header { margin-bottom: 25px; }
.series-mora, .series-tipos, .series-origen { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
.series-tipos {
  flex: 1;
  min-height: 0;
  align-content: start;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
  padding-right: 10px;
}
.series-tipos:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 5px; border-radius: var(--radius-sm); }
.fila-barra { min-width: 0; }
.rotulo strong { flex-shrink: 0; }
.rotulo > span { min-width: 0; overflow-wrap: anywhere; }
.rotulo, .detalle-barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.rotulo > span { display: flex; align-items: center; gap: 8px; }
i { display: inline-block; height: 8px; width: 8px; border-radius: 50%; }
.pista { height: 8px; margin: 10px 0 7px; background: var(--color-background); border-radius: 5px; overflow: hidden; }
.pista > div { height: 100%; background: var(--color-primary); border-radius: inherit; }
.detalle-barra { color: var(--color-text-secondary); font-size: 11px; }
.nota-tipos { font-size: 11px; color: var(--color-text-secondary); margin-top: 20px; }
.desglose { overflow: hidden; }
.desglose header { padding: 20px 22px; }
.tabla-contenedor { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 15px 22px; text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
thead { background: var(--color-background); color: var(--color-text-secondary); }
th { font-weight: 500; }
.numero { text-align: right; font-variant-numeric: tabular-nums; }
.monto { font-weight: 600; }
tfoot { background: var(--color-surface-secondary); }
tfoot th, tfoot td { font-weight: 600; }
.nota-tabla { padding: 13px 22px; color: var(--color-text-secondary); font-size: 11px; }
.evolucion { margin-top: 20px; padding: 22px; display: flex; align-items: flex-start; gap: 16px; }
.icono-evolucion { padding: 12px; background: var(--color-background); border-radius: var(--radius-md); color: var(--color-primary); }
.icono-evolucion svg { width: 25px; height: 25px; display: block; }
.proximamente { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: var(--color-text-secondary); }
.evolucion h2 { margin: 4px 0 7px; }
.evolucion p { font-size: 12px; color: var(--color-text-secondary); }
.nota-evolucion { margin-top: 6px; }
.pie { margin-top: 18px; font-size: 11px; color: var(--color-text-secondary); text-align: center; }
.sin-datos { padding: 16px; margin-bottom: 20px; border: 1px dashed var(--color-border); border-radius: var(--radius-md); font-size: 13px; text-align: center; color: var(--color-text-secondary); }
.vacio { text-align: center; color: var(--color-text-secondary); }
@media (max-width: 900px) { .columna-tipos { position: static; } .grafico-tipos { position: static; } .series-tipos { flex: none; max-height: 340px; } .distribuciones { grid-template-columns: 1fr; } .filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .series-mora, .series-tipos { grid-template-columns: minmax(0, 1fr); } .contenido { width: calc(100% - 28px); margin-top: 18px; } .indicadores { grid-template-columns: 1fr; gap: 12px; } .filtros { grid-template-columns: 1fr; } .titulo-panel { align-items: flex-start; flex-direction: column; } .cabecera { align-items: flex-start; } .indicador > strong { font-size: 27px; } }
</style>
