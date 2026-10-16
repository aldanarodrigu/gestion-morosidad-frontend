<script setup lang="ts">
import { onMounted, onScopeDispose, reactive, ref } from 'vue'
import { obtenerTiposPadron } from '../services/carteraService'
import type { FiltrosCarteraApi } from '../services/carteraService'

defineProps<{ exportando: boolean; agrupada: boolean }>()
const emit = defineEmits<{ cancelar: []; confirmar: [filtros: FiltrosCarteraApi] }>()
const filtros = reactive({ segmento: '', tipoPadron: '', origen: '' })
const tiposPadron = ref<string[]>([])
const cargandoTipos = ref(false)
const errorTipos = ref(false)
const controller = new AbortController()

async function cargarTipos() {
  cargandoTipos.value = true
  errorTipos.value = false
  try {
    const tipos = await obtenerTiposPadron(controller.signal)
    if (!controller.signal.aborted) tiposPadron.value = tipos
  } catch {
    if (!controller.signal.aborted) errorTipos.value = true
  } finally {
    cargandoTipos.value = false
  }
}

function limpiar() {
  filtros.segmento = ''
  filtros.tipoPadron = ''
  filtros.origen = ''
}
onMounted(cargarTipos)
onScopeDispose(() => controller.abort())
</script>

<template>
  <form class="exportacion-panel" aria-labelledby="titulo-exportacion" @submit.prevent="emit('confirmar', { ...filtros })">
    <h2 id="titulo-exportacion">Exportar cartera a Excel</h2>
    <p>Elegí uno o varios filtros opcionales. Sin filtros se exporta toda la cartera.</p>
    <p>Estos filtros son independientes de los del listado. Se incluyen todas las páginas.</p>
    <fieldset :disabled="exportando" class="campos-exportacion">
      <label>
        Segmento de mora
        <select v-model="filtros.segmento" aria-label="Segmento de mora a exportar">
          <option value="">Todos los segmentos</option>
          <option value="temprana">Mora Temprana</option>
          <option value="inicial">Mora Inicial</option>
          <option value="tardia">Mora Tardía</option>
        </select>
      </label>
      <label>
        PadTipo
        <select v-model="filtros.tipoPadron" aria-label="PadTipo a exportar" :disabled="cargandoTipos || errorTipos">
          <option value="">{{ cargandoTipos ? 'Cargando PadTipo...' : 'Todos los PadTipo' }}</option>
          <option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option>
        </select>
        <span v-if="errorTipos" class="error-tipos" role="alert">
          No se pudieron cargar los PadTipo.
          <button type="button" @click="cargarTipos">Reintentar</button>
        </span>
      </label>
      <label>
        Origen
        <select v-model="filtros.origen" aria-label="Origen a exportar">
          <option value="">Todos los orígenes</option>
          <option value="intendencia">Intendencia</option>
          <option value="sucive">SUCIVE</option>
        </select>
      </label>
    </fieldset>
    <p v-if="agrupada">El archivo incluirá el resumen por contribuyente y el detalle de sus deudas.</p>
    <div class="botones-exportacion">
      <button type="button" :disabled="exportando" @click="limpiar">Limpiar filtros</button>
      <div>
        <button type="button" :disabled="exportando" @click="emit('cancelar')">Cancelar</button>
        <button type="submit" class="boton-descargar" :disabled="exportando">
          {{ exportando ? 'Exportando...' : 'Descargar Excel' }}
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.exportacion-panel {
  margin: 0 var(--spacing-lg) var(--spacing-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
}
h2 { margin: 0 0 10px; font-size: 16px; }
p { margin: 6px 0; font-size: 13px; color: var(--color-text-secondary); }
.campos-exportacion {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
  padding: 0;
  margin: var(--spacing-md) 0;
  border: 0;
}
label { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
select, button {
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
}
select { width: 100%; }
.botones-exportacion, .botones-exportacion > div { display: flex; gap: 10px; }
.botones-exportacion { justify-content: space-between; flex-wrap: wrap; margin-top: var(--spacing-md); font-size: 13px; }
.boton-descargar { color: var(--color-surface); background: var(--color-primary); border-color: var(--color-primary); }
button { cursor: pointer; }
button:disabled, select:disabled { opacity: 0.6; cursor: not-allowed; }
button:focus-visible, select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.error-tipos { font-size: 12px; }
@media (max-width: 640px) { .campos-exportacion { grid-template-columns: 1fr; } }
</style>
