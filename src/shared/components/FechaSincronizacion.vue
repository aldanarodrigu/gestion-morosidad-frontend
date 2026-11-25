<script setup lang="ts">
import { fechaHora } from '@/shared/utils/formato'
import { computed } from 'vue'
const props = defineProps<{ fechas: (string | null | undefined)[]; etiqueta: string }>()
function normalizar(valor: string | null | undefined) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor) || Number.isNaN(Date.parse(valor)))
    return null
  // La API devuelve LocalDateTime de Uruguay: conservar la hora informada, sin conversión del navegador.
  return valor.slice(0, 16)
}
const validas = computed(() =>
  [...new Set(props.fechas.map(normalizar).filter((f): f is string => f !== null))].sort(),
)
const sinFecha = computed(() => props.fechas.filter((f) => normalizar(f) === null).length)
const mostrar = fechaHora
</script>
<template>
  <p class="fecha-sincronizacion">
    <template v-if="validas.length">
      {{ etiqueta }}:
      <template v-if="validas.length === 1"
        ><time :datetime="validas[0]">{{ mostrar(validas[0]!) }}</time></template
      >
      <template v-else
        >entre <time :datetime="validas[0]">{{ mostrar(validas[0]!) }}</time> y
        <time :datetime="validas[validas.length - 1]">{{
          mostrar(validas[validas.length - 1]!)
        }}</time></template
      >
      <span v-if="sinFecha">
        · {{ sinFecha }} {{ sinFecha === 1 ? 'registro sin fecha' : 'registros sin fecha' }}</span
      >
    </template>
    <template v-else>{{ etiqueta }}: sin fecha informada</template>
  </p>
</template>
<style scoped>
.fecha-sincronizacion {
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
  font-weight: 400;
  line-height: 1.5;
}
</style>
