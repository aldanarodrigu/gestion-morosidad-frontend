<script setup lang="ts">
/**
 * Estructura común de pantalla, tomada de Cartera:
 *  - #barra: banda blanca de borde a borde con filtros, acciones o pestañas.
 *  - #totales: línea de totales sobre el fondo gris (opcional).
 *  - contenido: ancho completo con márgenes de --pagina-margen.
 * Sin título grande: la pantalla activa la indica el navbar.
 *
 * `aRas`: el contenido va de borde a borde, sin márgenes (tablas como la de Cartera).
 */
withDefaults(defineProps<{ aRas?: boolean }>(), { aRas: false })
</script>

<template>
  <div class="pagina">
    <div v-if="$slots.barra" class="pagina-barra">
      <slot name="barra" />
    </div>
    <div v-if="$slots.totales" class="pagina-totales">
      <slot name="totales" />
    </div>
    <div class="pagina-contenido" :class="{ 'a-ras': aRas }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-background);
  color: var(--color-text);
}

.pagina-barra {
  display: grid;
  gap: var(--spacing-md);
  padding: var(--pagina-margen);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.pagina-totales {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
  padding: 12px var(--pagina-margen);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}

.pagina-contenido {
  display: flex;
  flex-direction: column;
  gap: var(--pagina-margen);
  min-width: 0;
  padding: var(--pagina-margen);
}

.pagina-contenido.a-ras {
  gap: 0;
  padding: 0;
  background: var(--color-surface);
}
</style>
