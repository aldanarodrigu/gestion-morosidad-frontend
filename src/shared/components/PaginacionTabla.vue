<script setup lang="ts">
/**
 * Paginación de tablas: filas por página, rango visible, Anterior/Siguiente e «Ir a página».
 * Trabaja con páginas desde 0, como la API; al usuario se le muestran desde 1.
 */
import { computed, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    pagina: number
    totalPaginas: number
    totalElementos: number
    tamanio: number
    tamanios?: readonly number[]
    deshabilitado?: boolean
    /** Nombre de lo que se lista, para el rango: «deudas», «contribuyentes»... */
    elementos?: string
  }>(),
  { tamanios: () => [20, 50, 100], deshabilitado: false, elementos: 'registros' },
)

const emit = defineEmits<{ cambiarPagina: [pagina: number]; cambiarTamanio: [tamanio: number] }>()

const id = useId()
const destino = ref<number | ''>('')

const desde = computed(() => (props.totalElementos ? props.pagina * props.tamanio + 1 : 0))
const hasta = computed(() => Math.min((props.pagina + 1) * props.tamanio, props.totalElementos))
const numero = (n: number) => n.toLocaleString('es-UY')

// Un número fuera de rango se lleva a la primera o la última página en lugar de fallar.
function irAPagina() {
  if (destino.value === '' || !Number.isFinite(destino.value)) return
  const pagina = Math.min(Math.max(Math.trunc(destino.value), 1), props.totalPaginas) - 1
  destino.value = ''
  if (pagina !== props.pagina) emit('cambiarPagina', pagina)
}
</script>

<template>
  <nav class="paginacion" aria-label="Paginación">
    <label class="tamanio">
      Filas por página
      <select
        :value="tamanio"
        :disabled="deshabilitado"
        @change="emit('cambiarTamanio', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="t in tamanios" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>

    <span class="rango" aria-live="polite">
      {{ numero(desde) }}–{{ numero(hasta) }} de {{ numero(totalElementos) }} {{ elementos }}
    </span>

    <div v-if="totalPaginas > 1" class="navegacion">
      <button type="button" :disabled="pagina === 0 || deshabilitado" @click="emit('cambiarPagina', pagina - 1)">
        Anterior
      </button>
      <span class="actual">Página {{ numero(pagina + 1) }} de {{ numero(totalPaginas) }}</span>
      <button
        type="button"
        :disabled="pagina + 1 >= totalPaginas || deshabilitado"
        @click="emit('cambiarPagina', pagina + 1)"
      >
        Siguiente
      </button>

      <form class="ir" @submit.prevent="irAPagina">
        <label :for="`${id}-ir`">Ir a página</label>
        <input
          :id="`${id}-ir`"
          v-model.number="destino"
          type="number"
          inputmode="numeric"
          min="1"
          :max="totalPaginas"
          :placeholder="String(pagina + 1)"
          :disabled="deshabilitado"
        />
        <button type="submit" :disabled="deshabilitado || destino === ''">Ir</button>
      </form>
    </div>
  </nav>
</template>

<style scoped>
.paginacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px 20px;
  padding: 16px;
  font-size: 13px;
  color: var(--color-text);
}

.tamanio,
.ir {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
}

.rango {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.navegacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.actual {
  font-variant-numeric: tabular-nums;
}

select,
input,
button {
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
}

select {
  padding: 0 6px;
}

input {
  width: 72px;
  padding: 0 8px;
  font-variant-numeric: tabular-nums;
}

button {
  padding: 0 10px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

button:hover:not(:disabled) {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
}

button:disabled,
select:disabled,
input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

select:focus-visible,
input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .paginacion {
    justify-content: flex-start;
  }
}
</style>
