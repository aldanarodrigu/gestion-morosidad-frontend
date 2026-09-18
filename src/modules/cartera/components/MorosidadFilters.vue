<template>
  <div class="morosidad-filters">
    <!-- Filtros principales -->
    <section class="filters">
      <!-- Búsqueda -->
      <div class="search-box">
        <input
          type="text"
          v-model="filters.search"
          placeholder="Buscar por CM, contribuyente, documento..."
        />
      </div>

      <!-- Segmento -->
      <div class="filter">
        <select v-model="filters.segmento">
          <option value="">Segmento</option>
          <option value="temprana">Mora temprana</option>
          <option value="intermedia">Mora intermedia</option>
          <option value="tardia">Mora tardía</option>
        </select>
      </div>

      <!-- Tributo -->
      <div class="filter">
        <select v-model="filters.tributo">
          <option value="">Tributo</option>
          <option value="inmobiliaria">Contribución inmobiliaria</option>
          <option value="patente">Patente</option>
          <option value="rural">Contribución rural</option>
        </select>
      </div>

      <!-- Origen -->
      <div class="filter">
        <select v-model="filters.origen">
          <option value="">Origen</option>
          <option value="intendencia">Intendencia</option>
          <option value="sucive">SUCIVE</option>
        </select>
      </div>

      <!-- Multa -->
      <div class="filter">
        <select v-model="filters.multa">
          <option value="">Multa</option>
          <option value="con">Con multa</option>
          <option value="sin">Sin multa</option>
        </select>
      </div>

      <!-- Contacto -->
      <div class="filter">
        <select v-model="filters.contacto">
          <option value="">Contacto</option>
          <option value="con">Con contacto</option>
          <option value="sin">Sin contacto</option>
        </select>
      </div>
    </section>

    <!-- Opciones de tabla -->
    <section class="table-options">
      <!-- Agrupar -->
      <div class="group-option">
        <span class="option-label">Agrupar por:</span>

        <label class="checkbox-option">
          <input v-model="filters.agruparPor" type="checkbox" />
          <span>Contribuyente</span>
        </label>
      </div>

      <!-- Ordenar y Exportar -->
      <div class="right-options">
        <div class="sort-option">
          <span class="option-label">Ordenar por:</span>

          <button
            type="button"
            class="sort-button"
            :class="{ active: filters.ordenarPor === 'antiguedad' }"
            @click="filters.ordenarPor = 'antiguedad'"
          >
            Antigüedad
          </button>

          <button
            type="button"
            class="sort-button"
            :class="{ active: filters.ordenarPor === 'importe' }"
            @click="filters.ordenarPor = 'importe'"
          >
            Importe
          </button>

          <button
            type="button"
            class="sort-button"
            :class="{ active: filters.ordenarPor === 'nombre' }"
            @click="filters.ordenarPor = 'nombre'"
          >
            Nombre
          </button>
        </div>

        <button type="button" class="export-button">Exportar Excel</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const filters = reactive({
  search: '',
  segmento: '',
  tributo: '',
  origen: '',
  multa: '',
  contacto: '',
  agruparPor: true,
  ordenarPor: 'antiguedad',
})
</script>

<style scoped>
.morosidad-filters {
  width: 100%;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
}

/* Filtros */
.filters {
  display: grid;
  grid-template-columns: 3fr repeat(5, 0.8fr);
  gap: var(--spacing-sm);

  padding: var(--spacing-md) 0;

  background-color: transparent;
  border: none;
  border-radius: 0;
}

.search-box,
.filter {
  min-width: 0;
}

input,
select {
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

input::placeholder {
  color: var(--color-text-secondary);
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.table-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-surface);
  margin-top: var(--spacing-md);
}

.group-option,
.right-options,
.sort-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.option-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Select de agrupación */

.group-option select {
  width: auto;
  min-width: 140px;
}

/* Botones de ordenamiento */

.sort-button {
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
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.sort-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sort-button.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
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

/* Exportar */

.export-button {
  height: 36px;

  padding: 0 var(--spacing-md);

  border: none;
  border-radius: var(--radius-sm);

  background-color: var(--color-primary);
  color: white;

  font-family: inherit;
  font-size: 13px;
  font-weight: 500;

  cursor: pointer;

  transition: background-color 0.2s ease;
}

.export-button:hover {
  background-color: var(--color-primary-dark);
}
</style>
