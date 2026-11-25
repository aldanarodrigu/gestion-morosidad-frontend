<script setup lang="ts">
/**
 * Detalle o formulario en carga: las etiquetas son texto real y los valores, bloques.
 * - tipo "valor": valor de texto (para listas de datos tipo <dl>).
 * - tipo "campo": rectángulo con la forma de un input o select (alto: --esqueleto-campo-alto).
 */
import SkeletonBloque from './SkeletonBloque.vue'

withDefaults(
  defineProps<{ etiquetas: string[]; tipo?: 'valor' | 'campo'; columnas?: number }>(),
  { tipo: 'valor', columnas: 1 },
)
</script>

<template>
  <div class="detalle-esqueleto" :style="{ '--columnas': columnas }" aria-hidden="true">
    <div v-for="(etiqueta, i) in etiquetas" :key="etiqueta" class="campo">
      <span class="etiqueta">{{ etiqueta }}</span>
      <SkeletonBloque v-if="tipo === 'campo'" forma="rect" alto="var(--esqueleto-campo-alto, 38px)" />
      <SkeletonBloque v-else class="valor" :ancho="['60%', '45%', '70%'][i % 3]" />
    </div>
  </div>
</template>

<style scoped>
.detalle-esqueleto {
  display: grid;
  grid-template-columns: repeat(var(--columnas), minmax(0, 1fr));
  gap: 14px;
}

.campo {
  display: grid;
  gap: 6px;
}

.etiqueta {
  font-size: var(--esqueleto-etiqueta-tamano, 13px);
  color: var(--color-text-secondary);
}

.valor {
  font-size: 14px;
}

@media (max-width: 640px) {
  .detalle-esqueleto {
    grid-template-columns: 1fr;
  }
}
</style>
