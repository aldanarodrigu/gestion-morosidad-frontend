<script setup lang="ts">
import { onScopeDispose } from 'vue'
import NavBar from '../components/NavBar.vue'
import DialogoSesionVencida from '@/modules/autenticacion/components/DialogoSesionVencida.vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import { alVencerSesion } from '@/shared/api/http'

// Dentro del sistema, si la sesión vence se pide volver a ingresar sin salir de la pantalla
const auth = useAuthStore()
alVencerSesion(() => {
  auth.sesionVencida = true
})
onScopeDispose(() => alVencerSesion(null))

// Lleva el foco al contenido sin cambiar la URL (el router usa el historial, no el hash).
function saltarAlContenido(evento: MouseEvent) {
  evento.preventDefault()
  document.getElementById('contenido-principal')?.focus()
}
</script>

<template>
  <div class="app-layout">
    <a href="#contenido-principal" class="saltar-contenido" @click="saltarAlContenido"
      >Saltar al contenido</a
    >
    <NavBar />

    <main id="contenido-principal" class="main-content" tabindex="-1">
      <RouterView />
    </main>

    <DialogoSesionVencida />
  </div>
</template>

<style scoped>
/* Enlace de salto: invisible hasta que recibe foco con el teclado */
.saltar-contenido {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 100;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--texto-base);
  font-weight: 600;
  transform: translateY(-200%);
}

.saltar-contenido:focus {
  transform: none;
  outline: 2px solid var(--color-primary-dark);
  outline-offset: 2px;
}

.main-content:focus {
  outline: none;
}

.app-layout {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background-color: var(--color-background);
}
</style>
