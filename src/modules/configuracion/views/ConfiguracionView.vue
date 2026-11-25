<script setup lang="ts">
import { ref } from 'vue'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import PestanasPagina from '@/shared/components/PestanasPagina.vue'
import AccionesTab from '../components/AccionesTab.vue'
import UsuariosTab from '../components/UsuariosTab.vue'
import TributosTab from '../components/TributosTab.vue'
import PeriodosMoraTab from '../components/PeriodosMoraTab.vue'
import SincronizacionTab from '../components/SincronizacionTab.vue'

const secciones = [
  { id: 'sincronizacion', etiqueta: 'Sincronización' },
  { id: 'tributos', etiqueta: 'Tipos de Tributo' },
  { id: 'mora', etiqueta: 'Períodos de Mora' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
  { id: 'acciones', etiqueta: 'Acciones' },
] as const
const activa = ref<string>('tributos')
</script>

<template>
  <PaginaLayout>
    <template #barra>
      <PestanasPagina
        v-model="activa"
        :pestanas="secciones"
        id-base="configuracion"
        etiqueta="Secciones de configuración"
      />
    </template>
    <section
      v-for="seccion in secciones"
      v-show="activa === seccion.id"
      :id="`configuracion-panel-${seccion.id}`"
      :key="seccion.id"
      role="tabpanel"
      :aria-labelledby="`configuracion-tab-${seccion.id}`"
      tabindex="0"
      class="panel panel-cuerpo contenido-pestana"
    >
      <SincronizacionTab v-if="seccion.id === 'sincronizacion' && activa === 'sincronizacion'" />
      <AccionesTab v-else-if="seccion.id === 'acciones' && activa === 'acciones'" />
      <UsuariosTab v-else-if="seccion.id === 'usuarios' && activa === 'usuarios'" />
      <TributosTab v-else-if="seccion.id === 'tributos' && activa === 'tributos'" />
      <PeriodosMoraTab v-else-if="seccion.id === 'mora' && activa === 'mora'" />
    </section>
  </PaginaLayout>
</template>

<style scoped>
.contenido-pestana:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -3px;
}
</style>
