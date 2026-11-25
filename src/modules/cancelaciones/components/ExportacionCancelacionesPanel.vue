<script setup lang="ts">
import { useConsulta } from '@/shared/composables/useConsulta'
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onMounted, reactive, ref } from 'vue'
import { obtenerMotivosCancelaciones } from '../services/cancelacionService'
import type {
  FiltrosExportacionCancelaciones,
  FormatoCancelaciones,
} from '../services/cancelacionService'

const props = defineProps<{ exportando: boolean }>()
const emit = defineEmits<{
  cancelar: []
  confirmar: [filtros: FiltrosExportacionCancelaciones, formato: FormatoCancelaciones]
}>()
const formato = ref<FormatoCancelaciones>('xlsx')
const sinFiltros: FiltrosExportacionCancelaciones = { origen: '', motivo: '', desde: '', hasta: '' }
const filtros = reactive({ ...sinFiltros })
const motivos = ref<string[]>([])
const {
  cargando: cargandoMotivos,
  error: errorCargaMotivos,
  ejecutar: consultarMotivos,
} = useConsulta<string[]>()
const errorMotivos = computed(() => !!errorCargaMotivos.value)
const errorFechas = ref('')

async function cargarMotivos() {
  const resultado = await consultarMotivos(
    (signal) => obtenerMotivosCancelaciones(signal),
    'No se pudieron cargar los motivos.',
  )
  if (resultado) motivos.value = resultado
}

onMounted(cargarMotivos)

function limpiar() {
  Object.assign(filtros, sinFiltros)
  errorFechas.value = ''
}

function confirmar() {
  if (props.exportando) return
  errorFechas.value = ''
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errorFechas.value = 'La fecha hasta debe ser igual o posterior a la fecha desde.'
    return
  }
  emit('confirmar', { ...filtros }, formato.value)
}
</script>

<template>
  <form
    v-enfocar
    class="exportacion-panel"
    aria-labelledby="titulo-exportacion"
    @submit.prevent="confirmar"
  >
    <h2 id="titulo-exportacion">Exportar cancelaciones</h2>
    <p>Elegí uno o varios filtros opcionales. Sin filtros se exportan todas las cancelaciones.</p>
    <p>Estos filtros son independientes de los del listado. Se incluyen todas las páginas.</p>

    <fieldset :disabled="exportando" class="campos-exportacion">
      <label>
        Formato
        <select v-model="formato" aria-label="Formato de exportación">
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV (.csv)</option>
        </select>
      </label>
      <label>
        Origen
        <select v-model="filtros.origen" aria-label="Origen a exportar">
          <option value="">Todos los orígenes</option>
          <option value="INTENDENCIA">Intendencia</option>
          <option value="SUCIVE">SUCIVE</option>
        </select>
      </label>
      <label>
        Motivo
        <select
          v-model="filtros.motivo"
          aria-label="Motivo a exportar"
          :disabled="cargandoMotivos || errorMotivos"
        >
          <option value="">
            {{ cargandoMotivos ? 'Cargando motivos...' : 'Todos los motivos' }}
          </option>
          <option v-for="motivo in motivos" :key="motivo" :value="motivo">{{ motivo }}</option>
        </select>
      </label>
      <label>
        Desde
        <input v-model="filtros.desde" aria-label="Fecha desde a exportar" type="date" />
      </label>
      <label>
        Hasta
        <input v-model="filtros.hasta" aria-label="Fecha hasta a exportar" type="date" />
      </label>
    </fieldset>

    <p v-if="errorMotivos" class="error" role="alert">
      No se pudieron cargar los motivos.
      <button type="button" :disabled="exportando" @click="cargarMotivos">Reintentar</button>
    </p>
    <p v-if="errorFechas" class="error" role="alert">{{ errorFechas }}</p>
    <div class="botones-exportacion">
      <button type="button" :disabled="exportando" @click="limpiar">Limpiar filtros</button>
      <div>
        <button type="button" :disabled="exportando" @click="emit('cancelar')">Cancelar</button>
        <button type="submit" class="boton-descargar" :disabled="exportando">
          {{
            exportando ? 'Exportando...' : formato === 'csv' ? 'Descargar CSV' : 'Descargar Excel'
          }}
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.exportacion-panel {
  padding: var(--spacing-lg);
  background: var(--color-surface);
}
h2 {
  margin: 0 0 10px;
  font-size: 16px;
}
p {
  margin: 6px 0;
  font-size: var(--texto-base);
  color: var(--color-text-secondary);
}
.campos-exportacion {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
  padding: 0;
  margin: var(--spacing-md) 0;
  border: 0;
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--texto-base);
}
input,
select,
button {
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
}
input,
select {
  width: 100%;
}
.botones-exportacion,
.botones-exportacion > div {
  display: flex;
  gap: 10px;
}
.botones-exportacion {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: var(--spacing-md);
  font-size: var(--texto-base);
}
.boton-descargar {
  color: var(--color-surface);
  background: var(--color-primary);
  border-color: var(--color-primary);
}
button {
  cursor: pointer;
}
button:disabled,
fieldset:disabled {
  opacity: 0.6;
}
button:disabled {
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.error {
  color: var(--color-tardia);
}
@media (max-width: 599px) {
  .campos-exportacion {
    grid-template-columns: 1fr;
  }
}
</style>
