<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import {
  obtenerDeudasPorContribuyenteId,
  obtenerResumenDesdeDeudas,
} from '../services/contribuyenteService'
import type { DeudaApi } from '@/modules/cartera/types/cartera'
import type { ContribuyenteResumenResponse } from '../services/contribuyenteService'

import ContribuyenteResumen from '../components/ContribuyenteResumen.vue'
import DeudasTab from '../components/DeudasTab.vue'
import GestionesTab from '../components/GestionesTab.vue'
import DatosContactoTab from '../components/DatosContactoTab.vue'

const route = useRoute()

const deudaSeleccionadaId = computed(() => {
  const valor = route.query.deudaId
  return valor ? Number(valor) : null
})

const deudas = ref<DeudaApi[]>([])
const cargando = ref(false)
const error = ref<string | null>(null)
const pestanaActiva = ref('gestiones')

const deudaInicialId = computed(() => Number(route.query.deuda) || undefined)

const contribuyenteId = computed(() => Number(route.params.contribuyenteId))

const contribuyente = computed<ContribuyenteResumenResponse | null>(() =>
  obtenerResumenDesdeDeudas(deudas.value, deudaSeleccionadaId.value),
)

function gestionRegistrada(deudaId: number) {
  const deuda = deudas.value.find((d) => d.id === deudaId)
  if (deuda) deuda.cantidadGestiones = (deuda.cantidadGestiones ?? 0) + 1
}
const cantidadGestiones = ref<number | null>(null)

const cargarDatos = async () => {
  if (!Number.isInteger(contribuyenteId.value) || contribuyenteId.value <= 0) {
    error.value = 'No se especificó un ID válido del contribuyente.'
    return
  }

  cargando.value = true
  error.value = null

  try {
    deudas.value = await obtenerDeudasPorContribuyenteId(contribuyenteId.value)
  } catch {
    error.value = 'No se pudieron cargar los datos. Intentá nuevamente.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargarDatos)

watch(contribuyenteId, () => {
  cargarDatos()
})
</script>

<template>
  <main class="detalle">
    <RouterLink to="/cartera" class="volver">
      <ArrowLeftIcon class="icono-volver" />
      Volver
    </RouterLink>

    <section class="contenido">
      <p v-if="cargando" class="mensaje">Cargando datos del contribuyente...</p>

      <div v-else-if="error" class="mensaje error">
        <p>{{ error }}</p>
        <button type="button" @click="cargarDatos">Reintentar</button>
      </div>

      <template v-else-if="contribuyente">
        <ContribuyenteResumen :contribuyente="contribuyente" />

        <section class="panel">
          <nav class="pestanas">
            <button
              :class="{ activa: pestanaActiva === 'gestiones' }"
              @click="pestanaActiva = 'gestiones'"
            >
              Gestiones<span v-if="cantidadGestiones !== null"> ({{ cantidadGestiones }})</span>
            </button>

            <button
              :class="{ activa: pestanaActiva === 'deudas' }"
              @click="pestanaActiva = 'deudas'"
            >
              Deudas ({{ deudas.length }})
            </button>

            <button
              :class="{ activa: pestanaActiva === 'contacto' }"
              @click="pestanaActiva = 'contacto'"
            >
              Datos de contacto
            </button>
          </nav>

          <div class="contenido-pestana">
            <GestionesTab
              v-if="pestanaActiva === 'gestiones'"
              :deudas="deudas"
              :deuda-inicial-id="deudaInicialId"
              @registrada="gestionRegistrada"
              @cantidad="cantidadGestiones = $event"
            />

            <DeudasTab
              v-else-if="pestanaActiva === 'deudas'"
              :deudas="deudas"
              :deuda-seleccionada-id="deudaSeleccionadaId"
            />

            <DatosContactoTab v-else :cm="contribuyente.cm" />
          </div>
        </section>
      </template>

      <p v-else class="mensaje">No se encontraron deudas para este padrón.</p>
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
  width: min(1000px, calc(100% - 32px));
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
  background: var(--color-surface);
}

.pestanas button {
  padding: 13px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
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
  padding: 20px;
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

.mensaje {
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.error {
  color: var(--color-text);
}

.error button {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
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
