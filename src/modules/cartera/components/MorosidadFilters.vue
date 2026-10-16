<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue'
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

defineProps<{ exportando?: boolean }>()

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

const opcionesOrden = [
  { value: 'antiguedad', label: 'Antigüedad' },
  { value: 'importe', label: 'Importe' },
  { value: 'nombre', label: 'Nombre' },
] as const
</script>

<template>
  <div class="morosidad-filters">
    <section class="filters" role="search" aria-label="Filtros de cartera">
      <div class="search-box">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar por CM, documento o contribuyente..."
          aria-label="Buscar por CM, documento o contribuyente"
          autocomplete="off"
        />
      </div>

      <div class="filter">
        <select v-model="filters.segmento" aria-label="Segmento">
          <option value="">Todos los segmentos</option>
          <option value="temprana">Mora Temprana</option>
          <option value="inicial">Mora Inicial</option>
          <option value="tardia">Mora Tardía</option>
        </select>
      </div>

      <div class="filter">
        <select v-model="filters.tipoPadron" aria-label="PadTipo" :disabled="cargandoTipos || errorTipos">
          <option value="">{{ cargandoTipos ? 'Cargando PadTipo...' : 'Todos los PadTipo' }}</option>
          <option v-if="filters.tipoPadron && !tiposPadron.includes(filters.tipoPadron)" :value="filters.tipoPadron">
            {{ filters.tipoPadron }}
          </option>
          <option v-for="tipo in tiposPadron" :key="tipo" :value="tipo">{{ tipo }}</option>
        </select>
        <button v-if="errorTipos" type="button" @click="cargarTiposPadron">
          No se pudieron cargar los PadTipo. Reintentar
        </button>
      </div>

      <div class="filter">
        <select v-model="filters.origen" aria-label="Origen">
          <option value="">Origen</option>
          <option value="intendencia">Intendencia</option>
          <option value="sucive">SUCIVE</option>
        </select>
      </div>

      <div class="filter">
        <select v-model="filters.multa" aria-label="Multa">
          <option value="">Multa</option>
          <option value="con">Con multa</option>
          <option value="sin">Sin multa</option>
        </select>
      </div>

      <div class="filter">
        <select v-model="filters.contacto" aria-label="Contacto">
          <option value="">Contacto</option>
          <option value="con">Con contacto</option>
          <option value="sin">Sin contacto</option>
        </select>
      </div>
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

        <button type="button" class="export-button" :disabled="exportando" @click="emit('export')">
          {{ exportando ? 'Exportando...' : 'Exportar Excel' }}
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
  grid-template-columns: 3fr repeat(5, 0.8fr);
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.search-box,
.filter {
  min-width: 0;
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
    grid-template-columns: repeat(3, 1fr);
  }

  .search-box {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .filters {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
