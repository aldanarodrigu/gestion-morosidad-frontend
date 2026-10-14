<script setup lang="ts">
import { nextTick, ref } from 'vue'
import AccionesTab from '../components/AccionesTab.vue'
import UsuariosTab from '../components/UsuariosTab.vue'
import TributosTab from '../components/TributosTab.vue'
import PeriodosMoraTab from '../components/PeriodosMoraTab.vue'

const secciones = [
  {
    id: 'tributos',
    nombre: 'Tipos de Tributo',
    descripcion: 'Administración de los tipos de tributo.',
  },
  {
    id: 'mora',
    nombre: 'Períodos de Mora',
    descripcion: 'Configuración de los segmentos y sus rangos de días de mora.',
  },
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    descripcion: 'Administración de usuarios, roles y permisos.',
  },
  {
    id: 'acciones',
    nombre: 'Acciones',
    descripcion: 'Creación de acciones, asignación a segmentos y activación o desactivación.',
  },
] as const
const activa = ref<string>('tributos')
const navegacion = ref<HTMLElement | null>(null)
async function navegar(event: KeyboardEvent, indice: number) {
  let destino: number
  switch (event.key) {
    case 'ArrowRight':
      destino = (indice + 1) % secciones.length
      break
    case 'ArrowLeft':
      destino = (indice + secciones.length - 1) % secciones.length
      break
    case 'Home':
      destino = 0
      break
    case 'End':
      destino = secciones.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  activa.value = secciones[destino]!.id
  await nextTick()
  navegacion.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[destino]?.focus()
}
</script>

<template>
  <section class="configuracion" aria-labelledby="configuracion-titulo">
    <div class="contenido">
      <header class="cabecera">
        <h1 id="configuracion-titulo">Administración del Sistema</h1>
        <p>Gestión de parámetros, tributos y usuarios</p>
      </header>
      <section class="panel">
        <div
          ref="navegacion"
          class="pestanas"
          role="tablist"
          aria-label="Secciones de configuración"
        >
          <button
            v-for="(seccion, indice) in secciones"
            :id="`configuracion-tab-${seccion.id}`"
            :key="seccion.id"
            type="button"
            role="tab"
            :aria-selected="activa === seccion.id"
            :aria-controls="`configuracion-panel-${seccion.id}`"
            :tabindex="activa === seccion.id ? 0 : -1"
            :class="{ activa: activa === seccion.id }"
            @click="activa = seccion.id"
            @keydown="navegar($event, indice)"
          >
            {{ seccion.nombre }}
          </button>
        </div>
        <section
          v-for="seccion in secciones"
          v-show="activa === seccion.id"
          :id="`configuracion-panel-${seccion.id}`"
          :key="seccion.id"
          role="tabpanel"
          :aria-labelledby="`configuracion-tab-${seccion.id}`"
          tabindex="0"
          class="contenido-pestana"
        >
          <AccionesTab v-if="seccion.id === 'acciones' && activa === 'acciones'" />
          <UsuariosTab v-else-if="seccion.id === 'usuarios' && activa === 'usuarios'" />
          <TributosTab v-else-if="seccion.id === 'tributos' && activa === 'tributos'" />
          <PeriodosMoraTab v-else-if="seccion.id === 'mora' && activa === 'mora'" />
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.configuracion {
  flex: 1;
  background: var(--color-background);
  color: var(--color-text);
}
.contenido {
  width: min(1000px, calc(100% - 48px));
  margin: var(--spacing-lg) auto;
}
.cabecera {
  margin-bottom: var(--spacing-lg);
}
h1 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}
.cabecera p {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 4px 0 0;
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.pestanas {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}
.pestanas button {
  flex-shrink: 0;
  padding: 13px 18px;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--color-text-secondary);
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
.pestanas button:hover {
  color: var(--color-primary);
}
.pestanas button.activa {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}
button:focus-visible,
.contenido-pestana:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -3px;
}
.contenido-pestana {
  padding: var(--spacing-lg);
}
h2 {
  font-size: 14px;
  font-weight: 600;
}
.contenido-pestana p {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 8px 0 0;
}
.contenido-pestana .pendiente {
  margin-top: var(--spacing-lg);
  font-size: 12px;
}
@media (max-width: 600px) {
  .contenido {
    width: calc(100% - 24px);
    margin: var(--spacing-md) auto;
  }
  .pestanas button {
    padding: 12px;
    font-size: 12px;
  }
  .contenido-pestana {
    padding: var(--spacing-md);
  }
}
</style>
