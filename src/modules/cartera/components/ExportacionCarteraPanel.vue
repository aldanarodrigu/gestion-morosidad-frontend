<script setup lang="ts">
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, ref } from 'vue'
import type { FormatoExportacion } from '../services/carteraService'
import type { CarteraFilters } from './MorosidadFilters.vue'

const props = defineProps<{ exportando: boolean; filtros: CarteraFilters }>()
const emit = defineEmits<{ cancelar: []; confirmar: [formato: FormatoExportacion] }>()
const formato = ref<FormatoExportacion>('xlsx')

const segmentos: Record<string, string> = {
  temprana: 'Mora Temprana',
  inicial: 'Mora Inicial',
  tardia: 'Mora Tardía',
}
const origenes: Record<string, string> = { intendencia: 'Intendencia', sucive: 'SUCIVE' }
const contactos: Record<string, string> = { con: 'Con contacto', sin: 'Sin contacto' }

// Resumen de lo que se va a exportar: exactamente los filtros activos del listado.
const filtrosActivos = computed(() => {
  const f = props.filtros
  return [
    f.search.trim() && { etiqueta: 'Búsqueda', valor: `«${f.search.trim()}»` },
    f.segmento && { etiqueta: 'Segmento', valor: segmentos[f.segmento] ?? f.segmento },
    f.tipoPadron && { etiqueta: 'PadTipo', valor: f.tipoPadron },
    f.origen && { etiqueta: 'Origen', valor: origenes[f.origen] ?? f.origen },
    f.contacto && { etiqueta: 'Contacto', valor: contactos[f.contacto] ?? f.contacto },
  ].filter((x): x is { etiqueta: string; valor: string } => !!x)
})
</script>

<template>
  <form
    v-enfocar
    class="exportacion-panel"
    aria-labelledby="titulo-exportacion"
    @submit.prevent="emit('confirmar', formato)"
  >
    <h2 id="titulo-exportacion">Exportar cartera</h2>
    <p>Se exporta lo que ves en el listado, con todas sus páginas.</p>
    <ul v-if="filtrosActivos.length" class="filtros-activos" aria-label="Filtros aplicados">
      <li v-for="f in filtrosActivos" :key="f.etiqueta">
        <strong>{{ f.etiqueta }}:</strong> {{ f.valor }}
      </li>
    </ul>
    <p v-else>Sin filtros: se exporta toda la cartera.</p>
    <fieldset :disabled="exportando" class="campos-exportacion">
      <label>
        Formato
        <select v-model="formato" aria-label="Formato de exportación">
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV (.csv)</option>
        </select>
      </label>
    </fieldset>
    <p v-if="formato === 'csv'">
      CSV incluye una sola tabla con el detalle de todos los padrones filtrados, sin hoja de resumen
      por contribuyente.
    </p>
    <p v-else-if="filtros.agruparPor">
      El archivo incluirá el resumen por contribuyente y el detalle de sus deudas.
    </p>
    <div class="botones-exportacion">
      <button type="button" :disabled="exportando" @click="emit('cancelar')">Cancelar</button>
      <button type="submit" class="boton-descargar" :disabled="exportando">
        {{ exportando ? 'Exportando...' : formato === 'csv' ? 'Descargar CSV' : 'Descargar Excel' }}
      </button>
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
  grid-template-columns: minmax(0, 240px);
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
select,
button {
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
}
select {
  width: 100%;
}
.botones-exportacion {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: var(--spacing-md);
  font-size: var(--texto-base);
}
.filtros-activos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
}
.filtros-activos li {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
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
select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
button:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 599px) {
  .campos-exportacion {
    grid-template-columns: 1fr;
  }
}
</style>
