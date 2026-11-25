<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  obtenerDeudasPorContribuyenteId,
  obtenerResumenDesdeDeudas,
} from '../services/contribuyenteService'
import type { DeudaApi } from '@/modules/cartera/types/cartera'
import type { ContribuyenteResumenResponse } from '../services/contribuyenteService'

import { rutaCarteraGuardada } from '@/modules/cartera/rutaCartera'
import ContribuyenteResumen from '../components/ContribuyenteResumen.vue'
import DeudasTab from '../components/DeudasTab.vue'
import GestionesTab from '../components/GestionesTab.vue'
import DatosContactoTab from '../components/DatosContactoTab.vue'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import PestanasPagina from '@/shared/components/PestanasPagina.vue'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'

const route = useRoute()
const router = useRouter()

// «Volver» lleva a la Cartera tal como se dejó: búsqueda, filtros, tamaño y página.
const rutaVolver = rutaCarteraGuardada()

const deudaSolicitadaId = computed(() => {
  const valor = route.query.deuda ?? route.query.deudaId
  const id = Number(Array.isArray(valor) ? valor[0] : valor)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
})

const deudas = ref<DeudaApi[]>([])
const padronContacto = computed(
  () => (deudas.value.find((d) => d.id === deudaSeleccionadaId.value) ?? deudas.value[0])?.padron,
)
const cargando = ref(false)
const error = ref<string | null>(null)
const pestanaActiva = ref('gestiones')
const esqueleto = useEsqueleto(() => cargando.value)

const pestanas = computed(() => [
  {
    id: 'gestiones',
    etiqueta:
      cantidadGestiones.value !== null ? `Gestiones (${cantidadGestiones.value})` : 'Gestiones',
  },
  { id: 'deudas', etiqueta: `Padrones (${deudas.value.length})` },
  { id: 'contacto', etiqueta: 'Datos de contacto' },
])

// Cabecera e historial comparten la misma deuda, independientemente del orden recibido.
const deudaSeleccionadaId = computed(() => {
  const seleccionada = deudas.value.find((deuda) => deuda.id === deudaSolicitadaId.value)
  return seleccionada?.id ?? (deudas.value.length === 1 ? deudas.value[0]!.id : undefined)
})

const contribuyenteId = computed(() => Number(route.params.contribuyenteId))

const contribuyente = computed<ContribuyenteResumenResponse | null>(() =>
  obtenerResumenDesdeDeudas(deudas.value, deudaSeleccionadaId.value),
)

async function abrirPadron(deudaId: number) {
  if (!deudas.value.some((d) => d.id === deudaId)) return
  const { deudaId: _anterior, ...query } = route.query
  await router.push({ query: { ...query, deuda: String(deudaId) } })
  cantidadGestiones.value = null
  pestanaActiva.value = 'gestiones'
}

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
  <PaginaLayout>
    <template #barra>
      <RouterLink :to="rutaVolver" class="volver"> Volver </RouterLink>
    </template>

    <AvisoCarga :activo="cargando" texto="Cargando datos del contribuyente" />

    <template v-if="esqueleto">
      <ContribuyenteResumen :contribuyente="null" />
      <section class="panel" aria-hidden="true">
        <div class="pestanas-esqueleto">
          <span class="activa">Gestiones</span><span>Padrones</span><span>Datos de contacto</span>
        </div>
        <div class="contenido-pestana esqueleto-pestana">
          <SkeletonBloque ancho="22em" />
          <SkeletonBloque forma="rect" alto="72px" />
          <SkeletonBloque forma="rect" alto="72px" />
        </div>
      </section>
    </template>

    <div v-else-if="error && !cargando" class="mensaje error">
      <p>{{ error }}</p>
      <button type="button" class="boton" @click="cargarDatos">Reintentar</button>
    </div>

    <template v-else-if="contribuyente">
      <ContribuyenteResumen :contribuyente="contribuyente" />

      <section class="panel">
        <PestanasPagina
          v-model="pestanaActiva"
          :pestanas="pestanas"
          id-base="contribuyente"
          etiqueta="Información del contribuyente"
          variante="panel"
        />

        <div
          :id="`contribuyente-panel-${pestanaActiva}`"
          class="contenido-pestana"
          role="tabpanel"
          :aria-labelledby="`contribuyente-tab-${pestanaActiva}`"
        >
          <GestionesTab
            v-if="pestanaActiva === 'gestiones'"
            :deudas="deudas"
            :deuda-inicial-id="deudaSeleccionadaId"
            @registrada="gestionRegistrada"
            @seleccionar="abrirPadron"
            @cantidad="cantidadGestiones = $event"
          />

          <DeudasTab
            v-else-if="pestanaActiva === 'deudas'"
            :deudas="deudas"
            :deuda-seleccionada-id="deudaSeleccionadaId"
            @seleccionar="abrirPadron"
          />

          <DatosContactoTab
            v-else
            :cm="padronContacto?.cm ?? ''"
            :origen="padronContacto?.origen"
          />
        </div>
      </section>
    </template>

    <p v-else class="mensaje">No se encontraron deudas para este padrón.</p>
  </PaginaLayout>
</template>

<style scoped>
.volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  color: var(--color-primary);
  font-size: var(--texto-base);
  font-weight: 500;
}

.volver:hover {
  text-decoration: underline;
}

.volver:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.panel {
  overflow: hidden;
}

.contenido-pestana {
  padding: 20px var(--pagina-margen);
}

/* Pestañas de muestra mientras carga (no interactivas) */
.pestanas-esqueleto {
  display: flex;
  gap: 32px;
  padding: 14px var(--pagina-margen) 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
  font-weight: 500;
}

.pestanas-esqueleto .activa {
  color: var(--color-primary);
  font-weight: 600;
}

.esqueleto-pestana {
  display: grid;
  gap: 12px;
  font-size: var(--texto-base);
}

.mensaje {
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}

.error {
  display: grid;
  justify-items: start;
  gap: var(--spacing-sm);
  color: var(--color-text);
}
</style>
