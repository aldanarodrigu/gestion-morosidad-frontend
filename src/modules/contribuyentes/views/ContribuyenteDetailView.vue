<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import type { ContribuyenteResponse } from '../types/contribuyenteResponse'

const contribuyente = ref<ContribuyenteResponse>({
  cm: 'CM-80122',
  nombre: 'Constructora Viales del Sur S.A.',
  documento: '21.345.678-4',
})

const pestanaActiva = ref('gestiones')
</script>

<template>
  <main class="detalle">
    <RouterLink to="/cartera" class="volver">
      <ArrowLeftIcon class="icono-volver" />
      Volver
    </RouterLink>

    <section class="contenido">
      <ContribuyenteResumen :contribuyente="contribuyente" />

      <AccionSugerida />

      <section class="panel">
        <nav class="pestanas">
          <button
            :class="{ activa: pestanaActiva === 'gestiones' }"
            @click="pestanaActiva = 'gestiones'"
          >
            Gestiones (3)
          </button>

          <button :class="{ activa: pestanaActiva === 'deudas' }" @click="pestanaActiva = 'deudas'">
            Deudas (2)
          </button>

          <button
            :class="{ activa: pestanaActiva === 'contacto' }"
            @click="pestanaActiva = 'contacto'"
          >
            Datos de contacto
          </button>
        </nav>

        <div class="contenido-pestana">
          <GestionesTab v-if="pestanaActiva === 'gestiones'" />
          <DeudasTab v-else-if="pestanaActiva === 'deudas'" />
          <DatosContactoTab v-else />
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.detalle {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-text);
}

.volver {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  transition: color 0.2s ease;
}

.volver:hover {
  color: var(--color-primary-dark);
}

.icono-volver {
  width: 18px;
  height: 18px;
}

.contenido {
  width: min(912px, calc(100% - 32px));
  margin: var(--spacing-lg) auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
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
  overflow-x: auto;
}

.pestanas button {
  padding: 14px 20px;
  border: none;
  border-bottom: 2px solid transparent;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.pestanas button:hover {
  color: var(--color-primary);
}

.pestanas button.activa {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.contenido-pestana {
  padding: var(--spacing-lg);
}

@media (max-width: 600px) {
  .contenido {
    width: calc(100% - 24px);
    margin: var(--spacing-md) auto;
    gap: var(--spacing-md);
  }

  .volver {
    padding: 12px;
  }

  .pestanas button {
    padding: 12px;
    font-size: 14px;
  }

  .contenido-pestana {
    padding: var(--spacing-md);
  }
}
</style>
