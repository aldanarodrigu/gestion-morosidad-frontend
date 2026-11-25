<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { obtenerTiposPadron } from '../services/carteraService'

export interface CarteraFilters {
  search: string
  segmento: string
  tipoPadron: string
  origen: string
  multa: string
  contacto: string
  agruparPor: boolean
  ordenarPor: 'antiguedad' | 'importe' | 'nombre'
}

const filters = defineModel<CarteraFilters>({ required: true })

defineProps<{ exportando?: boolean; puedeExportar?: boolean }>()

const emit = defineEmits<{ export: [] }>()

const tiposPadron = ref<string[]>([])
const cargandoTipos = ref(false)
const errorTipos = ref(false)
const tiposController = new AbortController()

async function cargarTiposPadron() {
  cargandoTipos.value = true
  errorTipos.value = false
  try {
    const tipos = await obtenerTiposPadron(tiposController.signal)
    if (!tiposController.signal.aborted) tiposPadron.value = tipos
  } catch {
    if (!tiposController.signal.aborted) errorTipos.value = true
  } finally {
    cargandoTipos.value = false
  }
}

onMounted(cargarTiposPadron)
onScopeDispose(() => tiposController.abort())

// Filtros de la fila superior; agrupar y ordenar son opciones de la tabla y no cuentan.
const CAMPOS_FILTRO = ['search', 'segmento', 'tipoPadron', 'origen', 'multa', 'contacto'] as const

const filtrosActivos = computed(
  () => CAMPOS_FILTRO.filter((campo) => filters.value[campo].trim() !== '').length,
)

function limpiarFiltros() {
  for (const campo of CAMPOS_FILTRO) filters.value[campo] = ''
}

const opcionesOrden = [
  { value: 'antiguedad', label: 'Antigüedad' },
  { value: 'importe', label: 'Importe' },
  { value: 'nombre', label: 'Nombre' },
] as const
</script>

<template>
  <div class="morosidad-filters">
    <section class="filters" role="search" aria-label="Filtros de cartera">
      <label class="campo search-box">
        <span class="etiqueta">Buscar</span>
        <input
          v-model="filters.search"
          type="search"
          placeholder="CM, documento, contribuyente o matrícula"
          autocomplete="off"
        />
      </label>

      <label class="campo">
        <span class="etiqueta">Segmento</span>
        <select v-model="filters.segmento">
          <option value="">Todos</option>
          <option value="temprana">Mora Temprana</option>
          <option value="inicial">Mora Inicial</option>
          <option value="tardia">Mora Tardía</option>
        </select>
      </label>

      <div class="campo">
        <label class="etiqueta" for="filtro-padtipo">PadTipo</label>
        <select id="filtro-padtipo" v-model="filters.tipoPadron" :disabled="cargandoTipos || errorTipos">
          <option value="">{{ cargandoTipos ? 'Cargando...' : 'Todos' }}</option>
          <option v-if="filters.tipoPadron && !tiposPadron.includes(filters.tipoPadron)" :value="filters.tipoPadron">
            {{ filters.tipoPadron }}
          </option>
          <option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option>
        </select>
        <button v-if="errorTipos" type="button" class="reintentar" @click="cargarTiposPadron">
          No se pudieron cargar los PadTipo. Reintentar
        </button>
      </div>

      <label class="campo">
        <span class="etiqueta">Origen</span>
        <select v-model="filters.origen">
          <option value="">Todos</option>
          <option value="intendencia">Intendencia</option>
          <option value="sucive">SUCIVE</option>
        </select>
      </label>

      <label class="campo">
        <span class="etiqueta">Multa</span>
        <select v-model="filters.multa">
          <option value="">Todos</option>
          <option value="con">Con multa</option>
          <option value="sin">Sin multa</option>
        </select>
      </label>

      <label class="campo">
        <span class="etiqueta">Contacto</span>
        <select v-model="filters.contacto">
          <option value="">Todos</option>
          <option value="con">Con contacto</option>
          <option value="sin">Sin contacto</option>
        </select>
      </label>

      <button
        type="button"
        class="limpiar"
        :disabled="filtrosActivos === 0"
        :aria-label="filtrosActivos ? `Limpiar filtros, ${filtrosActivos} activos` : 'Limpiar filtros, ninguno activo'"
        @click="limpiarFiltros"
      >
        Limpiar filtros<template v-if="filtrosActivos"> ({{ filtrosActivos }})</template>
      </button>
    </section>

    <section class="table-options" aria-label="Opciones de la tabla">
      <div class="group-option" role="group" aria-labelledby="agrupar-label">
        <span id="agrupar-label" class="option-label">Agrupar por:</span>

        <label class="checkbox-option">
          <input v-model="filters.agruparPor" type="checkbox" />
          <span>Contribuyente</span>
        </label>
      </div>

      <div class="right-options">
        <div class="sort-option" role="group" aria-labelledby="orden-label">
          <span id="orden-label" class="option-label">Ordenar por:</span>

          <button
            v-for="opcion in opcionesOrden"
            :key="opcion.value"
            type="button"
            class="sort-button"
            :class="{ active: filters.ordenarPor === opcion.value }"
            :aria-pressed="filters.ordenarPor === opcion.value"
            @click="filters.ordenarPor = opcion.value"
          >
            {{ opcion.label }}
          </button>
        </div>

        <button v-if="puedeExportar" type="button" class="export-button" :disabled="exportando" @click="emit('export')">
          {{ exportando ? 'Exportando...' : 'Exportar' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.morosidad-filters {
  width: 100%;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
}

.filters {
  display: grid;
  grid-template-columns: 3fr repeat(5, minmax(0, 1fr)) auto;
  align-items: end;
  gap: var(--spacing-sm) var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.etiqueta {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.reintentar {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.limpiar {
  height: 40px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.limpiar:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.limpiar:disabled {
  color: var(--color-text-light);
  cursor: default;
}

.limpiar:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.filters input,
.filters select {
  width: 100%;
  height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 13px;
}

.filters input::placeholder {
  color: var(--color-text-secondary);
}

.filters input:focus-visible,
.filters select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
  border-color: var(--color-primary);
}

.table-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.group-option,
.right-options,
.sort-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.right-options,
.sort-option {
  flex-wrap: wrap;
}

.option-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.sort-button {
  height: 36px;
  padding: 0 var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.sort-button:hover,
.sort-button.active {
  color: var(--color-primary);
}

.export-button {
  height: 36px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.export-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.export-button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sort-button:focus-visible,
.export-button:focus-visible,
.checkbox-option input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
}

.checkbox-option input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--color-text-secondary);
  cursor: pointer;
}

@media (max-width: 1100px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-box {
    grid-column: 1 / -1;
  }

  .limpiar {
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
