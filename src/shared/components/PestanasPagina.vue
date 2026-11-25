<script setup lang="ts">
/**
 * Pestañas de pantalla (patrón tablist accesible): flechas, Inicio y Fin para moverse.
 * Cada pestaña controla el panel con id `${idBase}-panel-${id}`; la pantalla dibuja los paneles.
 */
import { nextTick, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    pestanas: readonly { id: string; etiqueta: string }[]
    idBase: string
    etiqueta: string
    /** banda: apoyadas en el borde de la banda blanca superior. panel: encabezado de un panel. */
    variante?: 'banda' | 'panel'
  }>(),
  { variante: 'banda' },
)
const activa = defineModel<string>({ required: true })

const lista = ref<HTMLElement | null>(null)

async function navegar(evento: KeyboardEvent, indice: number) {
  const total = props.pestanas.length
  const destinos: Record<string, number> = {
    ArrowRight: (indice + 1) % total,
    ArrowLeft: (indice + total - 1) % total,
    Home: 0,
    End: total - 1,
  }
  const destino = destinos[evento.key]
  if (destino === undefined) return
  evento.preventDefault()
  activa.value = props.pestanas[destino]!.id
  await nextTick()
  lista.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[destino]?.focus()
}
</script>

<template>
  <div
    ref="lista"
    class="pestanas"
    :class="`pestanas-${variante}`"
    role="tablist"
    :aria-label="etiqueta"
  >
    <button
      v-for="(pestana, indice) in pestanas"
      :id="`${idBase}-tab-${pestana.id}`"
      :key="pestana.id"
      type="button"
      role="tab"
      :aria-selected="activa === pestana.id"
      :aria-controls="`${idBase}-panel-${pestana.id}`"
      :tabindex="activa === pestana.id ? 0 : -1"
      :class="{ activa: activa === pestana.id }"
      @click="activa = pestana.id"
      @keydown="navegar($event, indice)"
    >
      {{ pestana.etiqueta }}
    </button>
  </div>
</template>

<style scoped>
.pestanas {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}

/* Las pestañas se apoyan sobre el borde inferior de la banda blanca */
.pestanas.pestanas-banda {
  margin-bottom: calc(-1 * var(--pagina-margen) - 1px);
}

.pestanas.pestanas-panel {
  padding: 0 var(--pagina-margen);
  border-bottom: 1px solid var(--color-border);
}

.pestanas.pestanas-panel button {
  padding-top: 14px;
  margin-bottom: -1px;
}

.pestanas::-webkit-scrollbar {
  display: none;
}

button {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

button:first-child {
  padding-left: 0;
}

button:hover {
  color: var(--color-primary);
}

button.activa {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -3px;
}
</style>
