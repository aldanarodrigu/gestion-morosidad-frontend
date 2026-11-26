<script setup lang="ts">
/** Página para direcciones que no existen: avisa y ofrece volver al inicio de cada rol. */
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'

const auth = useAuthStore()
const route = useRoute()
</script>

<template>
  <PaginaLayout>
    <section class="panel panel-cuerpo no-encontrada" aria-labelledby="no-encontrada-titulo">
      <h1 id="no-encontrada-titulo" class="panel-titulo">Página no encontrada</h1>
      <p class="ayuda-texto">
        La dirección <code>{{ route.fullPath }}</code> no existe o ya no está disponible. Revisá que
        esté bien escrita o volvé al inicio.
      </p>
      <RouterLink :to="auth.inicio" class="boton boton-primario">Ir al inicio</RouterLink>
    </section>
  </PaginaLayout>
</template>

<style scoped>
.no-encontrada {
  display: grid;
  justify-items: start;
  gap: var(--spacing-sm);
}

.no-encontrada .boton {
  margin-top: var(--spacing-sm);
}

code {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-family: inherit;
  font-weight: 600;
}
</style>
