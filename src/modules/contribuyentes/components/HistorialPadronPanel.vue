<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue'
import { obtenerHistorial, type RelacionPadron } from '../services/historialService'
const props = defineProps<{ deudaId: number; cm: string; origen?: string }>()
const filas = ref<RelacionPadron[]>([])
const cargando = ref(false)
const error = ref('')
let controller: AbortController | undefined
async function cargar() {
 controller?.abort(); const actual = new AbortController(); controller = actual
 cargando.value = true; error.value = ''; filas.value = []
 try { const resultado = await obtenerHistorial(props.deudaId, actual.signal); if (!actual.signal.aborted) filas.value = resultado.data }
 catch (e: unknown) { if (!actual.signal.aborted) { const ex = e as { response?: { data?: { mensaje?: string } } }; error.value = ex.response?.data?.mensaje || 'No se pudo consultar el historial. Intentá nuevamente.' } }
 finally { if (controller === actual) cargando.value = false }
}
watch(() => props.deudaId, cargar, { immediate: true })
onScopeDispose(() => controller?.abort())
const grupos = computed(() => [
 { nombre: 'Relaciones actuales', filas: filas.value.filter(f => f.SITUACION_REGISTRO === 'ACTIVO') },
 { nombre: 'Relaciones históricas', filas: filas.value.filter(f => f.SITUACION_REGISTRO === 'NO ACTIVO - SOLO HISTORICO') },
 { nombre: 'Situación sin clasificar', filas: filas.value.filter(f => !['ACTIVO','NO ACTIVO - SOLO HISTORICO'].includes(f.SITUACION_REGISTRO || '')) },
].filter(g => g.filas.length))
</script>
<template>
 <section class="historial-panel" aria-live="polite" :aria-busy="cargando">
  <header><h3>Personas vinculadas al padrón</h3><p>{{ origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }} · CM {{ cm }}</p></header>
  <p v-if="cargando" class="mensaje">Consultando historial…</p>
  <div v-else-if="error" role="alert" class="error">{{ error }} <button type="button" @click="cargar">Reintentar</button></div>
  <p v-else-if="!filas.length" class="mensaje">No hay relaciones registradas para este padrón.</p>
  <template v-else>
   <section v-for="grupo in grupos" :key="grupo.nombre" class="grupo">
    <h4>{{ grupo.nombre }} ({{ grupo.filas.length }})</h4>
    <div class="tabla"><table><thead><tr><th>Padrón / CM</th><th>Persona</th><th>Relación</th><th>Situación</th><th>Contactos disponibles</th></tr></thead>
     <tbody><tr v-for="(r,i) in grupo.filas" :key="i">
      <td>{{ r.NRO_PADRON || '—' }}<small>CM {{ r.CM_PADRON }} · {{ r.TIPO_PADRON || 'Sin tipo' }}</small></td>
      <td>{{ r.NOMBRE || 'Sin nombre informado' }}<small>Documento: {{ r.DOCUMENTO || 'Sin informar' }}</small><small v-if="r.COD_CONTRIBUYENTE != null">Código: {{ r.COD_CONTRIBUYENTE }}</small></td>
      <td>{{ r.DESCRIPCION_RELACION || 'Sin informar' }}</td><td>{{ r.SITUACION_REGISTRO || 'Sin informar' }}</td>
      <td><span>{{ r.TELEFONO || 'Teléfono sin informar' }}</span><small>{{ r.EMAIL || 'Correo sin informar' }}</small></td>
     </tr></tbody>
    </table></div>
   </section>
  </template>
  <p class="nota">Los contactos son los disponibles actualmente en la fuente. Las relaciones registradas no acreditan por sí solas titularidad ni obligación de pago.</p>
 </section>
</template>
<style scoped>
.historial-panel{padding:18px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);white-space:normal}h3{font-size:14px}header p,.nota,small{font-size:11px;color:var(--color-text-secondary);margin-top:6px}.grupo{margin-top:18px}h4{font-size:12px;margin-bottom:10px}.tabla{overflow:auto;max-height:360px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--color-border)}th{position:sticky;top:0;background:var(--color-background);color:var(--color-text-secondary);font-weight:500}small{display:block}.mensaje,.error{padding:16px 0;font-size:12px}.error{color:var(--color-tardia)}button{padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-primary);font:inherit}button:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}.nota{margin-top:16px}
</style>
