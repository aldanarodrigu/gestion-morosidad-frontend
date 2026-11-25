<script setup lang="ts">
/** Segmento de mora: texto en negrita con el color del segmento, sin fondo. */
import type { NivelMora } from '@/shared/utils/mora'

defineProps<{ nivel: NivelMora }>()
</script>

<template>
  <span class="etiqueta-mora" :class="nivel || 'sin-segmento'"><slot /></span>
</template>

<style scoped>
.etiqueta-mora {
  font-size: var(--texto-base);
  font-weight: 600;
  white-space: nowrap;
}

.temprana {
  color: var(--color-temprana);
}

.inicial {
  color: var(--color-inicial);
}

.tardia {
  color: var(--color-tardia);
}

.sin-segmento {
  color: var(--color-text-secondary);
}
</style>
