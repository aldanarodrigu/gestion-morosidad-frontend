<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const cm = route.params.cm
</script>

<template>
  <section class="contribuyente-detail">
    <p class="codigo">{{ cm }}</p>

    <h1>Detalle del contribuyente</h1>

    <p>Acá se mostrará toda la información del contribuyente.</p>
  </section>
</template>

<style scoped>
.contribuyente-detail {
  padding: var(--spacing-lg);
}

.codigo {
  color: var(--color-primary);
  font-weight: 600;
}

h1 {
  margin-top: var(--spacing-sm);
}
</style>
