<script setup lang="ts">
/**
 * Tarjeta o indicador en carga: título, valor grande y nota.
 * El contenedor (borde, fondo, relleno) lo pone la clase que pasa la pantalla,
 * ej. <SkeletonTarjeta class="panel indicador" />, para que mida igual que la tarjeta real.
 * Si se pasa `titulo`, se muestra el texto real en lugar de un bloque.
 */
import SkeletonBloque from './SkeletonBloque.vue'

withDefaults(defineProps<{ titulo?: string; nota?: boolean }>(), { titulo: undefined, nota: true })
</script>

<template>
  <article class="tarjeta-esqueleto" aria-hidden="true">
    <span v-if="titulo" class="titulo-real">{{ titulo }}</span>
    <SkeletonBloque v-else class="titulo" ancho="45%" />
    <SkeletonBloque class="valor" ancho="60%" />
    <SkeletonBloque v-if="nota" class="nota" ancho="80%" />
  </article>
</template>

<style scoped>
.tarjeta-esqueleto {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.titulo,
.titulo-real {
  font-size: 13px;
}

.titulo-real {
  color: var(--color-text-secondary);
}

.valor {
  font-size: var(--esqueleto-valor-tamano, 26px);
  line-height: 1.2;
}

.nota {
  font-size: 12px;
}
</style>
