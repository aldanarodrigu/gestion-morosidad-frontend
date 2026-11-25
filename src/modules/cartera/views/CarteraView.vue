<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
const auth = useAuthStore()
import FechaSincronizacion from '@/shared/components/FechaSincronizacion.vue'
import { formatoNumero } from '@/shared/utils/formato'
import { descargarArchivo } from '@/shared/utils/descarga'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import { exportarCartera } from '../services/carteraService'
import type { FormatoExportacion } from '../services/carteraService'
import ExportacionCarteraPanel from '../components/ExportacionCarteraPanel.vue'
import MorosidadFilters from '../components/MorosidadFilters.vue'
import CarteraTable from '../components/CarteraTable.vue'
import CarteraAgrupadaTable from '../components/CarteraAgrupadaTable.vue'
import { TAMANIOS_PAGINA, filtrosApiDesde, useCartera } from '../composables/useCartera'
import PaginacionTabla from '@/shared/components/PaginacionTabla.vue'

const {
  cartera,
  grupos,
  cargando,
  error,
  pagina,
  tamanioPagina,
  totalElementos,
  totalPaginas,
  filtros,
  cargar,
  cambiarPagina,
  cambiarTamanio,
} = useCartera()

const fechasVisibles = computed(() =>
  (filtros.value.agruparPor ? grupos.value.flatMap((g) => g.deudas) : cartera.value).map(
    (d) => d.fechaSincronizacion,
  ),
)

// Hasta la primera respuesta no hay total que mostrar: va un bloque en su lugar.
const primeraCarga = ref(true)
watch(cargando, (activo) => {
  if (!activo) primeraCarga.value = false
})

const panelExportacion = ref(false)
const exportando = ref(false)
const errorExportacion = ref('')

function abrirExportacion() {
  if (!auth.puedeExportar) return
  errorExportacion.value = ''
  panelExportacion.value = true
}

// Exporta exactamente lo que muestra el listado (todas las páginas).
async function exportarArchivo(formato: FormatoExportacion) {
  if (!auth.puedeExportar || exportando.value) return
  exportando.value = true
  errorExportacion.value = ''
  const f = filtros.value
  try {
    const archivo = await exportarCartera(filtrosApiDesde(f), f.agruparPor, formato)
    descargarArchivo(archivo, `cartera-morosidad.${formato}`)
    panelExportacion.value = false
  } catch {
    errorExportacion.value = 'No se pudo exportar la cartera. Intentá nuevamente.'
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <section class="cartera-view">
    <MorosidadFilters
      :puede-exportar="auth.puedeExportar"
      v-model="filtros"
      :exportando="exportando"
      @export="abrirExportacion"
    />
    <ExportacionCarteraPanel
      v-if="auth.puedeExportar && panelExportacion"
      :exportando="exportando"
      :filtros="filtros"
      @cancelar="panelExportacion = false"
      @confirmar="exportarArchivo"
    />
    <p v-if="exportando" class="mensaje" role="status">
      Preparando archivo con todas las filas filtradas...
    </p>
    <p v-if="errorExportacion" class="mensaje error" role="alert">{{ errorExportacion }}</p>

    <AvisoCarga :activo="cargando" texto="Cargando cartera" />

    <div v-if="error && !cargando" class="mensaje error">
      <p>{{ error }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <!-- Totales: cantidad, sincronización y aclaración de la vista en una sola línea -->
      <div class="totales">
        <p class="resumen">
          <SkeletonBloque v-if="primeraCarga" ancho="7em" />
          <template v-else>
            {{ formatoNumero(totalElementos) }}
            {{ filtros.agruparPor ? 'contribuyentes' : 'deudas' }}
          </template>
        </p>
        <FechaSincronizacion
          v-if="fechasVisibles.length"
          class="dato-total"
          :fechas="fechasVisibles"
          etiqueta="Datos de esta página sincronizados"
        />
        <p v-if="filtros.agruparPor" class="dato-total">
          Agrupado por documento. Los totales corresponden a las deudas que cumplen los filtros.
        </p>
      </div>
      <CarteraAgrupadaTable
        v-if="filtros.agruparPor"
        class="tabla"
        :grupos="grupos"
        :cargando="cargando"
        :filas-esqueleto="tamanioPagina"
      />
      <CarteraTable
        v-else
        class="tabla"
        :cartera="cartera"
        :cargando="cargando"
        :filas-esqueleto="tamanioPagina"
      />

      <PaginacionTabla
        v-if="totalElementos > TAMANIOS_PAGINA[0]"
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :total-elementos="totalElementos"
        :tamanio="tamanioPagina"
        :tamanios="TAMANIOS_PAGINA"
        :elementos="filtros.agruparPor ? 'contribuyentes' : 'deudas'"
        :deshabilitado="cargando"
        @cambiar-pagina="cambiarPagina"
        @cambiar-tamanio="cambiarTamanio"
      />
    </template>
  </section>
</template>

<style scoped>
.cartera-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabla {
  min-height: 0;
}

.mensaje {
  padding: 12px var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}

.totales {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
  padding: 12px var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.resumen {
  color: var(--color-text);
  font-size: var(--texto-base);
  font-weight: 600;
}

.dato-total {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}

.error {
  color: var(--color-text);
}

.error p {
  margin-bottom: var(--spacing-sm);
}
</style>
