<script setup lang="ts">
import { ref, reactive, onMounted, onScopeDispose } from 'vue'
import { obtenerConvenios, type FiltrosConvenio, type PaginaConvenios } from '../services/convenioService'
const filtros = reactive<FiltrosConvenio>({ origen: 'INTENDENCIA', cm: '', documento: '', nombre: '', desde: '', hasta: '' })
let aplicados = { ...filtros }
const datos = ref<PaginaConvenios>()
const cargando = ref(false)
const error = ref('')
const detalle = ref<number>()
let controller: AbortController | undefined
async function cargar(pagina = 1) {
 controller?.abort(); const actual = new AbortController(); controller = actual
 cargando.value = true; error.value = ''; datos.value = undefined; detalle.value = undefined
 try { const resultado = await obtenerConvenios(aplicados, pagina, actual.signal); if (!actual.signal.aborted) datos.value = resultado }
 catch (e: unknown) { if (!actual.signal.aborted) { const ex = e as { response?: { data?: { mensaje?: string } } }; error.value = ex.response?.data?.mensaje || 'No se pudieron consultar los convenios. Intentá nuevamente.' } }
 finally { if (controller === actual) cargando.value = false }
}
function buscar() { aplicados = { ...filtros }; void cargar() }
function limpiar() { Object.assign(filtros, { origen: 'INTENDENCIA', cm: '', documento: '', nombre: '', desde: '', hasta: '' }); buscar() }
onMounted(() => cargar())
onScopeDispose(() => controller?.abort())
const importe = (valor: string | null) => valor == null ? '—' : valor
</script>
<template>
 <main class="convenios">
  <header><h1>Convenios</h1><p>Convenios activos con deuda vencida</p></header>
  <form class="panel filtros" @submit.prevent="buscar">
   <label>Origen<select v-model="filtros.origen"><option value="INTENDENCIA">Intendencia</option><option value="SUCIVE">SUCIVE</option></select></label>
   <label>CM<input v-model="filtros.cm" type="text" inputmode="numeric" pattern="[1-9][0-9]*" /></label>
   <label>Documento<input v-model="filtros.documento" maxlength="150" /></label>
   <label>Contribuyente<input v-model="filtros.nombre" maxlength="150" /></label>
   <label>Vencimiento desde<input v-model="filtros.desde" type="date" /></label>
   <label>Vencimiento hasta (excluido)<input v-model="filtros.hasta" type="date" /></label>
   <div class="botones"><button class="primario" :disabled="cargando">Buscar</button><button type="button" @click="limpiar" :disabled="cargando">Limpiar</button></div>
  </form>
  <section class="panel" aria-live="polite" :aria-busy="cargando">
   <p v-if="cargando">Consultando convenios…</p>
   <div v-else-if="error" role="alert" class="error">{{ error }} <button @click="cargar()">Reintentar</button></div>
   <template v-else-if="datos">
    <p class="cantidad">{{ datos.meta.total }} convenios · {{ aplicados.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }}</p>
    <p v-if="!datos.data.length">No se encontraron convenios para esta consulta.</p>
    <div v-else class="tabla"><table><thead><tr><th>Convenio / CM</th><th>Contribuyente</th><th>Cuotas vencidas / totales</th><th>Deuda desde</th><th>Importe neto</th><th>Detalle</th></tr></thead>
     <tbody><template v-for="c in datos.data" :key="c.CM"><tr><td><strong>{{ c.NUMERO_CONVENIO ?? '—' }}</strong><small>CM {{ c.CM }}<template v-if="c.MATRICULA"> · {{ c.MATRICULA }}</template></small></td><td>{{ c.PERSONA || 'Sin nombre informado' }}<small>Documento: {{ c.DOCUMENTO || '—' }}</small></td><td>{{ c.CANT_CUOTAS_VENC ?? '—' }} / {{ c.CANT_CUOTAS_CONVENIOS ?? '—' }}</td><td>{{ c.DEUDA_DESDE || '—' }}</td><td class="numero">{{ importe(c.IMPORTE_DEUDA) }}</td><td><button :aria-expanded="detalle === c.CM" @click="detalle = detalle === c.CM ? undefined : c.CM">{{ detalle === c.CM ? 'Ocultar' : 'Ver detalle' }}</button></td></tr>
     <tr v-if="detalle === c.CM"><td colspan="6"><dl><div><dt>Deuda de facturas</dt><dd>{{ importe(c.DEUDA_FACTURAS) }}</dd></div><div><dt>Saldo a favor</dt><dd>{{ importe(c.SALDO_A_FAVOR) }}</dd></div><div><dt>Crédito descontado</dt><dd>{{ importe(c.CREDITO_DESCONTADO) }}</dd></div><div><dt>Tributos</dt><dd>{{ c.TRIBUTOS_DEUDA || '—' }}</dd></div><div><dt>Último vencimiento</dt><dd>{{ c.ULTIMO_VENCIMIENTO || '—' }}</dd></div><div><dt>Teléfono / correo</dt><dd>{{ c.TELEFONO || '—' }} / {{ c.EMAIL || '—' }}</dd></div><div><dt>Dirección / localidad</dt><dd>{{ [c.DIRECCION, c.NUMERO_PUERTA, c.LOCALIDAD].filter(Boolean).join(' · ') || '—' }}</dd></div></dl></td></tr></template></tbody>
    </table></div>
    <footer><button :disabled="datos.meta.current_page <= 1" @click="cargar(datos.meta.current_page - 1)">Anterior</button><span>Página {{ datos.meta.current_page }} de {{ datos.meta.last_page }} · 20 por página</span><button :disabled="!datos.meta.has_more" @click="cargar(datos.meta.current_page + 1)">Siguiente</button></footer>
   </template>
  </section>
  <p class="nota">Consulta directa de la API. Los importes son nominales de la fuente, sin conversión de monedas. Las cuotas vencidas no incluyen la entrega inicial; el importe puede incluirla.</p>
 </main>
</template>
<style scoped>
.convenios{max-width:1440px;margin:auto;padding:28px;display:grid;gap:20px}header p,.nota,small,dt,.cantidad{color:var(--color-text-secondary)}header p{margin-top:6px}.panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm)}.filtros{display:flex;flex-wrap:wrap;gap:16px;align-items:end}label{display:grid;gap:6px;font-size:13px;flex:1 1 170px}input,select,button{border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:9px 12px;background:var(--color-surface);color:var(--color-text)}input,select{width:100%}button{color:var(--color-primary)}button:disabled{opacity:.5;cursor:default}.primario{background:var(--color-primary);color:white}.botones{display:flex;gap:8px}.tabla{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;background:var(--color-background);color:var(--color-text-secondary);font-weight:500}th,td{padding:16px;border-bottom:1px solid var(--color-border)}small{display:block;margin-top:5px}.numero{font-variant-numeric:tabular-nums;white-space:nowrap}.cantidad{margin-bottom:16px}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:4px 0}dt{font-size:12px}dd{margin:4px 0;overflow-wrap:anywhere}footer{display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:20px;font-size:13px}.error{color:var(--color-tardia)}.nota{font-size:12px}@media(max-width:650px){.convenios{padding:16px}.panel{padding:16px}footer{flex-wrap:wrap}}
</style>
