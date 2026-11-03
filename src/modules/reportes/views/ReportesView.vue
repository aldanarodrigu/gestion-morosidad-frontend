<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartBarIcon, BanknotesIcon, UsersIcon, HomeModernIcon } from '@heroicons/vue/24/outline'
import { deudasDemo, segmentosReporte } from '../data/reportesDemo'
import type { SegmentoReporte, OrigenReporte } from '../data/reportesDemo'

const filtros = reactive({ origen: '' as OrigenReporte | '', tipoPadron: '', segmento: '' as SegmentoReporte | '' })
const tiposPadron = [...new Set(deudasDemo.map(d => d.tipoPadron))].sort()
const filtradas = computed(() => deudasDemo.filter(d =>
  (!filtros.origen || d.origen === filtros.origen)
  && (!filtros.tipoPadron || d.tipoPadron === filtros.tipoPadron)
  && (!filtros.segmento || d.segmento === filtros.segmento)))
const total = computed(() => filtradas.value.reduce((s, d) => s + d.importe, 0))
const personas = computed(() => new Set(filtradas.value.map(d => d.persona)).size)
const moneda = new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 })
const importe = (n: number) => moneda.format(n)
const porcentaje = (n: number) => total.value ? (n / total.value * 100) : 0
const porcentajeTexto = (n: number) => `${porcentaje(n).toLocaleString('es-UY', { maximumFractionDigits: 1 })} %`
const porSegmento = computed(() => segmentosReporte.map(segmento => {
  const deudas = filtradas.value.filter(d => d.segmento === segmento.id)
  return { ...segmento, cantidad: deudas.length, importe: deudas.reduce((s, d) => s + d.importe, 0) }
}))
const porTipo = computed(() => tiposPadron.map(tipo => {
  const deudas = filtradas.value.filter(d => d.tipoPadron === tipo)
  return { tipo, cantidad: deudas.length, importe: deudas.reduce((s, d) => s + d.importe, 0) }
}).filter(d => d.cantidad > 0).sort((a, b) => b.importe - a.importe))
const resumen = computed(() => [...new Set(filtradas.value.map(d => `${d.origen}|${d.tipoPadron}`))].sort().map(clave => {
  const deudas = filtradas.value.filter(d => `${d.origen}|${d.tipoPadron}` === clave)
  const primero = deudas[0]!
  return { clave, origen: primero.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia', tipo: primero.tipoPadron,
    cantidad: deudas.length, personas: new Set(deudas.map(d => d.persona)).size,
    importe: deudas.reduce((s, d) => s + d.importe, 0) }
}))
const indicadores = computed(() => [
  { titulo: 'Deuda pendiente', valor: importe(total.value), nota: 'Importe de los padrones incluidos', icono: BanknotesIcon },
  { titulo: 'Contribuyentes', valor: personas.value.toLocaleString('es-UY'), nota: 'Personas distintas en la selección', icono: UsersIcon },
  { titulo: 'Padrones con deuda', valor: filtradas.value.length.toLocaleString('es-UY'), nota: 'Padrones incluidos en el reporte', icono: HomeModernIcon },
])
function limpiar() { filtros.origen = ''; filtros.tipoPadron = ''; filtros.segmento = '' }
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

      <div class="aviso-demo" role="note">
        <ChartBarIcon aria-hidden="true" />
        <div><strong>Vista de ejemplo</strong><p>Los importes y cantidades son ficticios. Podés combinar filtros para explorar esta propuesta visual.</p></div>
      </div>

      <section class="panel" aria-labelledby="estado-titulo">
        <div class="titulo-panel"><h2 id="estado-titulo">Estado actual de la deuda</h2><span class="etiqueta">Deuda pendiente</span></div>
        <div class="filtros">
          <label>Origen
            <select v-model="filtros.origen"><option value="">Todos los orígenes</option><option value="INTENDENCIA">Intendencia</option><option value="SUCIVE">SUCIVE</option></select>
          </label>
          <label>PadTipo
            <select v-model="filtros.tipoPadron"><option value="">Todos los PadTipo</option><option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option></select>
          </label>
          <label>Segmento de mora
            <select v-model="filtros.segmento"><option value="">Todos los segmentos</option><option v-for="s in segmentosReporte" :key="s.id" :value="s.id">{{ s.nombre }}</option></select>
          </label>
          <button type="button" class="limpiar" @click="limpiar">Limpiar filtros</button>
        </div>
        <p class="ayuda">Los filtros se combinan entre sí y se aplican a todo el reporte.</p>
      </section>

      <div class="indicadores" aria-live="polite" aria-atomic="true">
        <article v-for="indicador in indicadores" :key="indicador.titulo" class="panel indicador">
          <div class="encabezado-indicador"><span>{{ indicador.titulo }}</span><component :is="indicador.icono" aria-hidden="true" /></div>
          <strong>{{ indicador.valor }}</strong><p>{{ indicador.nota }}</p>
        </article>
      </div>
      <p v-if="filtradas.length === 0" class="sin-datos" role="status">No hay datos de ejemplo para esta combinación. Probá otros filtros.</p>

      <div class="distribuciones">
        <section class="panel grafico" aria-labelledby="segmento-titulo">
          <header><h2 id="segmento-titulo">Distribución por mora</h2><p>Participación en el importe total seleccionado</p></header>
          <div v-for="s in porSegmento" :key="s.id" class="fila-barra">
            <div class="rotulo"><span><i :style="{ background: s.color }" aria-hidden="true" />{{ s.nombre }}</span><strong>{{ porcentajeTexto(s.importe) }}</strong></div>
            <div class="pista" aria-hidden="true"><div :style="{ width: `${porcentaje(s.importe)}%`, background: s.color }" /></div>
            <div class="detalle-barra"><span>{{ s.cantidad }} padrones</span><span>{{ importe(s.importe) }}</span></div>
          </div>
        </section>
        <section class="panel grafico" aria-labelledby="tipo-titulo">
          <header><h2 id="tipo-titulo">Deuda por PadTipo</h2><p>Tipos de padrón con mayor deuda en la selección</p></header>
          <div v-for="tipo in porTipo" :key="tipo.tipo" class="fila-barra">
            <div class="rotulo"><span>{{ tipo.tipo }}</span><strong>{{ importe(tipo.importe) }}</strong></div>
            <div class="pista" aria-hidden="true"><div :style="{ width: `${porcentaje(tipo.importe)}%` }" /></div>
            <div class="detalle-barra"><span>{{ tipo.cantidad }} padrones</span><span>{{ porcentajeTexto(tipo.importe) }} del total</span></div>
          </div>
          <p class="nota-tipos">Los códigos de esta vista son ilustrativos. La clasificación urbana/rural queda por confirmar.</p>
        </section>
      </div>

      <section class="panel desglose" aria-labelledby="desglose-titulo">
        <header><h2 id="desglose-titulo">Resumen por origen y PadTipo</h2><p>Detalle de los resultados de ejemplo</p></header>
        <div class="tabla-contenedor">
          <table>
            <thead><tr><th scope="col">Origen</th><th scope="col">PadTipo</th><th scope="col" class="numero">Contribuyentes</th><th scope="col" class="numero">Padrones</th><th scope="col" class="numero">Deuda pendiente</th><th scope="col" class="numero">% del total</th></tr></thead>
            <tbody><tr v-for="fila in resumen" :key="fila.clave"><td>{{ fila.origen }}</td><td>{{ fila.tipo }}</td><td class="numero">{{ fila.personas }}</td><td class="numero">{{ fila.cantidad }}</td><td class="numero monto">{{ importe(fila.importe) }}</td><td class="numero">{{ porcentajeTexto(fila.importe) }}</td></tr>
              <tr v-if="!resumen.length"><td colspan="6" class="vacio">Sin resultados para esta combinación.</td></tr>
            </tbody>
            <tfoot><tr><th scope="row" colspan="2">Total de la selección</th><td class="numero">{{ personas }}</td><td class="numero">{{ filtradas.length }}</td><td class="numero monto">{{ importe(total) }}</td><td class="numero">{{ total ? '100 %' : '0 %' }}</td></tr></tfoot>
          </table>
        </div>
        <p class="nota-tabla">Una persona puede aparecer en más de una categoría. El total cuenta contribuyentes distintos.</p>
      </section>

      <section class="panel evolucion" aria-labelledby="evolucion-titulo">
        <div class="icono-evolucion"><ChartBarIcon aria-hidden="true" /></div>
        <div><span class="proximamente">PRÓXIMA ETAPA</span><h2 id="evolucion-titulo">Evolución mensual y recaudación</h2><p>Comparación entre meses, deuda por vencimiento y seguimiento de lo cobrado.</p><p class="nota-evolucion">Se incorporará cuando estén disponibles los cierres mensuales y el historial completo de cobros.</p></div>
      </section>
      <p class="pie">Propuesta inicial · La conexión con datos reales y la exportación del reporte quedan para la siguiente etapa.</p>
    </div>
  </section>
</template>

<style scoped>
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
.distribuciones { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.grafico { padding: 22px; }
.grafico header { margin-bottom: 25px; }
.fila-barra + .fila-barra { margin-top: 22px; }
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
@media (max-width: 900px) { .distribuciones { grid-template-columns: 1fr; } .filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .contenido { width: calc(100% - 28px); margin-top: 18px; } .indicadores { grid-template-columns: 1fr; gap: 12px; } .filtros { grid-template-columns: 1fr; } .titulo-panel { align-items: flex-start; flex-direction: column; } .cabecera { align-items: flex-start; } .indicador > strong { font-size: 27px; } }
</style>
