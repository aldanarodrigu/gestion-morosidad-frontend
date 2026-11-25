<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { obtenerFacturas, obtenerFacturasCanceladas } from '../services/facturaService'
import type { FacturaPadron, MontoUnidad } from '../services/facturaService'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
const props = defineProps<
  { numeroPadron: string; cm: string; origen?: string } &
  ({ deudaId: number; cancelacionId?: never } | { deudaId?: never; cancelacionId: number })
>()
const filtros = reactive({ estado: '', vencida: '', incluirConvenios: true })
const facturas = shallowRef<FacturaPadron[]>([])
const pagina = ref(0)
const porPagina = 50
const totalPaginas = computed(() => Math.ceil(facturas.value.length / porPagina))
const visibles = computed(() => facturas.value.slice(pagina.value * porPagina, (pagina.value + 1) * porPagina))
const cargando = ref(false)
const esqueleto = useEsqueleto(() => cargando.value)
const error = ref('')
let controller: AbortController | undefined
async function cargar() {
  controller?.abort()
  const actual = new AbortController()
  controller = actual
  cargando.value = true
  error.value = ''
  facturas.value = []
  pagina.value = 0
  try {
    const respuesta = props.cancelacionId === undefined
      ? await obtenerFacturas(props.deudaId!, { ...filtros }, actual.signal)
      : await obtenerFacturasCanceladas(props.cancelacionId, actual.signal)
    if (!actual.signal.aborted) facturas.value = respuesta.data
  } catch {
    if (!actual.signal.aborted) error.value = 'No se pudieron consultar las facturas en la API externa. Intentá nuevamente.'
  } finally {
    if (controller === actual) cargando.value = false
  }
}
watch(() => [props.deudaId, props.cancelacionId, filtros.estado, filtros.vencida, filtros.incluirConvenios], cargar, { immediate: true })
onScopeDispose(() => controller?.abort())
function monto(m: MontoUnidad) {
  if (m.monto === null) return 'Importe no disponible'
  const [entero, decimales] = m.monto.split('.')
  const valor = `${entero!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${decimales ? ',' + decimales : ''}`
  return `${valor} ${m.moneda || (m.unidad_codigo != null ? '· Unidad ' + m.unidad_codigo : '· Moneda sin identificar')}`
}
const fecha = (f: string | null) => f ? f.split('-').reverse().join('/') : '—'
</script>

<template>
  <section class="facturas-panel" :aria-label="`Facturas del padrón ${numeroPadron}`">
    <header><h3>{{ cancelacionId === undefined ? "Facturas" : "Facturas canceladas" }} del padrón {{ numeroPadron }}</h3><p>{{ origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }} · CM {{ cm }} · Consulta directa a la API</p></header>
    <div v-if="cancelacionId === undefined" class="filtros-facturas">
      <label>Estado<select v-model="filtros.estado"><option value="">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="CANCELADA">Canceladas (pagadas, según la API)</option></select></label>
      <label>Vencimiento<select v-model="filtros.vencida"><option value="">Todos los vencimientos</option><option value="true">Pendientes vencidas</option><option value="false">No vencidas (incluye pagadas)</option></select></label>
      <label class="check-convenios"><input v-model="filtros.incluirConvenios" type="checkbox" />Incluir convenios vinculados</label>
    </div>
    <AvisoCarga :activo="cargando" texto="Consultando facturas" />
    <template v-if="esqueleto">
      <p class="cantidad" aria-hidden="true"><SkeletonBloque ancho="16em" /></p>
      <div class="tabla-facturas" aria-hidden="true"><table>
        <thead><tr><th scope="col">Factura</th><th scope="col">Tributo</th><th scope="col">Año / cuota</th><th scope="col">Importe / moneda</th><th scope="col">Estado</th><th scope="col">Vencimiento</th></tr></thead>
        <tbody><SkeletonFilas :columnas="6" :filas="6" :con-detalle="[1, 2, 5]" :anchos="['5em', '10em', '4em', '7em', '6em', '6em']" /></tbody>
      </table></div>
    </template>
    <template v-else-if="cargando" />
    <div v-else-if="error" role="alert" class="mensaje"><p>{{ error }}</p><button type="button" @click="cargar">Reintentar</button></div>
    <template v-else>
      <p class="cantidad">{{ facturas.length }} {{ facturas.length === 1 ? 'factura' : 'facturas' }} · Todas las filas de la consulta</p>
      <p v-if="!facturas.length" class="mensaje">No hay facturas para estos filtros.</p>
      <div v-else class="tabla-facturas"><table>
        <thead><tr><th scope="col">Factura</th><th scope="col">Tributo</th><th scope="col">Año / cuota</th><th scope="col">Importe / moneda</th><th scope="col">Estado</th><th scope="col">Vencimiento</th></tr></thead>
        <tbody><tr v-for="(f, indice) in visibles" :key="`${f.factura_id}-${indice}`">
          <td>{{ f.factura_id }}<small v-if="f.convenio_cm != null">Convenio CM {{ f.convenio_cm }}</small></td>
          <td>{{ f.tributo || 'Sin tributo informado' }}<small v-if="f.periodo_desde || f.periodo_hasta">Período: {{ fecha(f.periodo_desde) }} – {{ fecha(f.periodo_hasta) }}</small></td>
          <td>{{ f.anio ?? '—' }}<small>Cuota {{ f.cuota ?? '—' }} / {{ f.total_cuotas ?? '—' }}</small></td>
          <td class="monto"><template v-if="f.montos_por_unidad?.length"><span v-for="(m, i) in f.montos_por_unidad" :key="i" class="unidad">{{ monto(m) }}</span></template><template v-else>{{ monto(f) }}</template></td>
          <td>{{ f.estado === 'CANCELADA' ? 'Cancelada' : f.estado === 'PENDIENTE' ? 'Pendiente' : f.estado || 'Sin informar' }}</td>
          <td>{{ fecha(f.fecha_vencimiento) }}<small>{{ f.vencida === true ? 'Vencida' : f.vencida === false ? 'No vencida / pagada' : 'Vencimiento sin determinar' }}</small></td>
        </tr></tbody>
      </table></div>
      <div v-if="totalPaginas > 1" class="paginas">
        <button type="button" :disabled="pagina === 0" @click="pagina--">Anterior</button>
        <span>Página {{ pagina + 1 }} de {{ totalPaginas }}</span>
        <button type="button" :disabled="pagina + 1 >= totalPaginas" @click="pagina++">Siguiente</button>
      </div>
    </template>
    <p v-if="cancelacionId !== undefined" class="nota">Facturas del CM que la fuente informa como canceladas al momento de la consulta. No hay una asociación con el número de cobro seleccionado.</p>
    <p v-else class="nota">El detalle puede incluir facturas pagadas, aún no vencidas y de convenios. Sus importes no reemplazan el saldo de cartera. Las monedas y unidades se muestran por separado.</p>
  </section>
</template>

<style scoped>
.facturas-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); white-space: normal; }
h3 { font-size: 14px; }
header p, .cantidad, .nota { font-size: 11px; color: var(--color-text-secondary); margin-top: 6px; }
.filtros-facturas { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; margin: 18px 0; }
label { display: flex; flex-direction: column; gap: 6px; color: var(--color-text-secondary); font-size: 12px; }
select, button { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 10px; background: var(--color-surface); color: var(--color-text); font: inherit; }
.check-convenios { flex-direction: row; align-items: center; padding-bottom: 8px; }
input { accent-color: var(--color-primary); }
select:focus-visible, input:focus-visible, button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.tabla-facturas { overflow-x: auto; margin-top: 12px; max-height: 420px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; --esqueleto-celda-padding: 12px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: top; }
th { background: var(--color-background); font-size: 11px; color: var(--color-text-secondary); position: sticky; top: 0; }
small { display: block; margin-top: 4px; font-size: 10px; color: var(--color-text-secondary); }
.monto { white-space: nowrap; font-variant-numeric: tabular-nums; }
.unidad { display: block; }
.mensaje { padding: 15px 0; font-size: 12px; }
.mensaje button { margin-top: 10px; }
.paginas { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 12px; font-size: 12px; }
.nota { margin-top: 16px; line-height: 1.6; }
</style>
