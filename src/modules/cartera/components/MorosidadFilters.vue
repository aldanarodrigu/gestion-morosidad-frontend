<script setup lang="ts">
export interface CarteraFilters {
  search: string
  segmento: string
  tributo: string
  origen: string
  multa: string
  contacto: string
  agruparPor: boolean
  ordenarPor: 'antiguedad' | 'importe' | 'nombre'
}

const filters = defineModel<CarteraFilters>({ required: true })

const emit = defineEmits<{ export: [] }>()

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
        <select v-model="filters.tributo" aria-label="Tributo">
          <option value="">Todos los tributos</option>
          <option value="101">101 - CIR</option>
          <option value="201">201 - CIU</option>
          <option value="301">301 - CIU</option>
          <option value="801">801 - Impuesto Ley 12.700</option>
          <option value="802">802 - Impuesto Ley 12.700</option>
          <option value="2401">2401 - CIU</option>
          <option value="3101">3101 - CIU</option>
          <option value="3801">3801 - CIU</option>
          <option value="3802">3802 - CIR</option>
          <option value="7502">7502 - Hogar estudiantil</option>
          <option value="7503">7503 - Hogar estudiantil</option>
          <option value="10206">10206 - Instituciones Piscina Fraternidad</option>
          <option value="35701">35701 - Impuesto Ley 12.700</option>
          <option value="2800">2800</option>
          <option value="2806">2806</option>
        </select>
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

        <button type="button" class="export-button" @click="emit('export')">Exportar Excel</button>
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

.export-button:hover {
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
