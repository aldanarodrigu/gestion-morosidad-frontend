```vue
<script setup lang="ts">
import MorosidadFilters from '../components/MorosidadFilters.vue'
import CarteraTable from '../components/CarteraTable.vue'

const cartera = [
  {
    cm: 'CM-10254',
    contribuyente: 'Juan Pérez',
    tributo: 'CIR',
    deuda: 125430,
    diasVencido: 458,
    segmento: 'Mora tardía',
    convenio: false,
    contacto: 'Disponible',
    accionSugerida: 'Clearing de Informes',
    gestiones: 2,
  },
  {
    cm: 'CM-18421',
    contribuyente: 'María Rodríguez',
    tributo: 'COM',
    deuda: 48200,
    diasVencido: 98,
    segmento: 'Mora Inicial',
    convenio: true,
    contacto: 'Disponible',
    accionSugerida: 'Intimacion formal',
    gestiones: 1,
  },
  {
    cm: 'CM-14561',
    contribuyente: 'Roberto Diaz',
    tributo: 'SEM',
    deuda: 70000,
    diasVencido: 70,
    segmento: 'Mora Temprana',
    convenio: false,
    contacto: 'Disponible',
    accionSugerida: 'Recordatorios automáticos por wa',
    gestiones: 3,
  },
  {
    cm: 'CM-141271',
    contribuyente: 'Agustin Rapetti',
    tributo: 'COM',
    deuda: 6700,
    diasVencido: 83,
    segmento: 'Mora Temprana',
    convenio: false,
    contacto: 'No Disponible',
    accionSugerida: 'Recordatorios automáticos por wa',
    gestiones: 0,
  },
]
</script>

<template>
  <section class="cartera-view">
    <MorosidadFilters />

    <CarteraTable :cartera="cartera" />
  </section>
</template>

<style scoped>
.cartera-view {
  padding-top: var(--spacing-xs);
}
</style>
