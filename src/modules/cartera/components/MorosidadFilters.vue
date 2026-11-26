<script setup lang="ts">
import { useConsulta } from '@/shared/composables/useConsulta'
import { computed, onMounted, ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
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
const {
  cargando: cargandoTipos,
  error: errorCargaTipos,
  ejecutar: consultarTipos,
} = useConsulta<string[]>()
const errorTipos = computed(() => !!errorCargaTipos.value)

async function cargarTiposPadron() {
  const tipos = await consultarTipos(
    (signal) => obtenerTiposPadron(signal),
    'No se pudieron cargar los PadTipo.',
  )
  if (tipos) tiposPadron.value = tipos
}

onMounted(cargarTiposPadron)

// Filtros de la fila superior; agrupar y ordenar son opciones de la tabla y no cuentan.
const CAMPOS_FILTRO = ['search', 'segmento', 'tipoPadron', 'origen', 'multa', 'contacto'] as const

const filtrosActivos = computed(
  () => CAMPOS_FILTRO.filter((campo) => filters.value[campo].trim() !== '').length,
)

function limpiarFiltros() {
  for (const campo of CAMPOS_FILTRO) filters.value[campo] = ''
}

type CampoFiltro = (typeof CAMPOS_FILTRO)[number]

const NOMBRES: Record<CampoFiltro, string> = {
  search: 'Búsqueda',
  segmento: 'Segmento',
  tipoPadron: 'PadTipo',
  origen: 'Origen',
  multa: 'Multa',
  contacto: 'Contacto',
}

const VALORES: Partial<Record<CampoFiltro, Record<string, string>>> = {
  segmento: { temprana: 'Mora Temprana', inicial: 'Mora Inicial', tardia: 'Mora Tardía' },
  origen: { intendencia: 'Intendencia', sucive: 'SUCIVE' },
  multa: { con: 'Con multa', sin: 'Sin multa' },
  contacto: { con: 'Con contacto', sin: 'Sin contacto' },
}

// Etiquetas de los filtros aplicados, para verlos de un vistazo y quitarlos de a uno.
const etiquetasActivas = computed(() =>
  CAMPOS_FILTRO.filter((campo) => filters.value[campo].trim() !== '').map((campo) => {
    const valor = filters.value[campo].trim()
    return {
      campo,
      texto: `${NOMBRES[campo]}: ${campo === 'search' ? `«${valor}»` : (VALORES[campo]?.[valor] ?? valor)}`,
    }
  }),
)

function quitarFiltro(campo: CampoFiltro) {
  filters.value[campo] = ''
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
        <select
          id="filtro-padtipo"
          v-model="filters.tipoPadron"
          :disabled="cargandoTipos || errorTipos"
        >
          <option value="">{{ cargandoTipos ? 'Cargando...' : 'Todos' }}</option>
          <option
            v-if="filters.tipoPadron && !tiposPadron.includes(filters.tipoPadron)"
            :value="filters.tipoPadron"
          >
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
        :aria-label="
          filtrosActivos
            ? `Limpiar filtros, ${filtrosActivos} activos`
            : 'Limpiar filtros, ninguno activo'
        "
        @click="limpiarFiltros"
      >
        Limpiar filtros<template v-if="filtrosActivos"> ({{ filtrosActivos }})</template>
      </button>
    </section>

    <ul v-if="etiquetasActivas.length" class="filtros-activos" aria-label="Filtros aplicados">
      <li v-for="etiqueta in etiquetasActivas" :key="etiqueta.campo">
        <span>{{ etiqueta.texto }}</span>
        <button
          type="button"
          class="quitar"
          :aria-label="`Quitar filtro ${etiqueta.texto}`"
          @click="quitarFiltro(etiqueta.campo)"
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      </li>
    </ul>

    <section class="table-options" aria-label="Opciones de la tabla">
      <div class="group-option" role="group" aria-labelledby="agrupar-label">
        <span id="agrupar-label" class="option-label">Agrupar por</span>

        <label class="checkbox-option">
          <input v-model="filters.agruparPor" type="checkbox" />
          <span>Contribuyente</span>
        </label>
      </div>

      <div class="right-options">
        <div class="sort-option" role="group" aria-labelledby="orden-label">
          <span id="orden-label" class="option-label">Ordenar por</span>

          <div class="segmentado">
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
        </div>

        <button
          v-if="puedeExportar"
          type="button"
          class="export-button"
          :disabled="exportando"
          @click="emit('export')"
        >
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
  font-size: var(--texto-sm);
  font-weight: 500;
}

.reintentar {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: var(--texto-sm);
  text-align: left;
  cursor: pointer;
}

.limpiar {
  height: var(--control-alto);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-family: inherit;
  font-size: var(--texto-base);
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
  height: var(--control-alto);
  font-family: inherit;
}

/* Foco, borde y transición: estilo común de campos (main.css) */

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
  font-size: var(--texto-base);
  color: var(--color-text-secondary);
}

/* Ordenar: grupo de botones unidos; el activo queda marcado con fondo */
.segmentado {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.sort-button {
  height: 34px;
  padding: 0 12px;
  border: 0;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--texto-base);
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sort-button + .sort-button {
  border-left: 1px solid var(--color-border);
}

.sort-button:hover {
  color: var(--color-primary);
}

.sort-button.active {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  color: var(--color-primary);
  font-weight: 600;
}

.sort-button:focus-visible {
  outline-offset: -2px;
}

/* Exportar: mismo botón secundario que «Limpiar filtros» */
.export-button {
  height: 34px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-family: inherit;
  font-size: var(--texto-base);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.export-button:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.export-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* Filtros aplicados */
.filtros-activos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: var(--spacing-sm) 0 0;
  padding: 0;
  list-style: none;
}

.filtros-activos li {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 2px 4px 2px 10px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
  color: var(--color-primary);
  font-size: var(--texto-sm);
  font-weight: 500;
}

.filtros-activos span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quitar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.quitar:hover {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.quitar svg {
  width: 14px;
  height: 14px;
}

.sort-button:focus-visible,
.export-button:focus-visible,
.quitar:focus-visible,
.checkbox-option input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  font-size: var(--texto-base);
  cursor: pointer;
}

.checkbox-option input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--color-text-secondary);
  cursor: pointer;
}

@media (max-width: 1279px) {
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

@media (max-width: 599px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
