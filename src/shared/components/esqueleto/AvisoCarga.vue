<script setup lang="ts">
/**
 * Región viva, invisible, que anuncia la carga a lectores de pantalla.
 * Queda siempre montada (vacía cuando no carga) para que el anuncio sea confiable.
 */
withDefaults(defineProps<{ activo: boolean; texto?: string }>(), { texto: 'Cargando datos' })
</script>

<template>
  <p class="solo-lector" aria-live="polite">{{ activo ? texto : '' }}</p>
</template>
