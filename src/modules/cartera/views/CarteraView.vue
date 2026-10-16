<script setup lang="ts">
import { ref } from 'vue'
import { exportarCartera } from '../services/carteraService'
import type { FiltrosCarteraApi } from '../services/carteraService'
import ExportacionCarteraPanel from '../components/ExportacionCarteraPanel.vue'
import MorosidadFilters from '../components/MorosidadFilters.vue'
import CarteraTable from '../components/CarteraTable.vue'
import CarteraAgrupadaTable from '../components/CarteraAgrupadaTable.vue'
import { useCartera } from '../composables/useCartera'

const {
  cartera,
  grupos,
  cargando,
  error,
  pagina,
  totalElementos,
  totalPaginas,
  filtros,
  cargar,
  cambiarPagina,
} = useCartera()

const panelExportacion = ref(false)
const exportando = ref(false)
const errorExportacion = ref('')

function abrirExportacion() {
  errorExportacion.value = ''
  panelExportacion.value = true
}

async function exportarExcel(filtrosExportacion: FiltrosCarteraApi) {
  if (exportando.value) return
  exportando.value = true
  errorExportacion.value = ''
  const f = filtros.value
  try {
    const archivo = await exportarCartera({
      ...filtrosExportacion,
      ordenarPor: f.ordenarPor,
    }, f.agruparPor)
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'cartera-morosidad.xlsx'
    document.body.appendChild(enlace)
    try {
      enlace.click()
      panelExportacion.value = false
    } finally {
      enlace.remove()
      // Da tiempo al navegador para iniciar la descarga antes de liberar el archivo.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } catch {
    errorExportacion.value = 'No se pudo exportar la cartera. Intentá nuevamente.'
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <section class="cartera-view">
    <MorosidadFilters v-model="filtros" :exportando="exportando" @export="abrirExportacion" />
    <ExportacionCarteraPanel
      v-if="panelExportacion"
      :exportando="exportando"
      :agrupada="filtros.agruparPor"
      @cancelar="panelExportacion = false"
      @confirmar="exportarExcel"
    />
    <p v-if="exportando" class="mensaje" role="status">Preparando Excel con todas las filas filtradas...</p>
    <p v-if="errorExportacion" class="mensaje error" role="alert">{{ errorExportacion }}</p>

    <p v-if="cargando" class="mensaje">Cargando cartera...</p>

    <div v-else-if="error" class="mensaje error">
      <p>{{ error }}</p>
      <button type="button" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <p class="resumen">
        {{ totalElementos }} {{ filtros.agruparPor ? 'contribuyentes' : 'deudas' }}
      </p>

      <p v-if="filtros.agruparPor" class="nota-agrupacion">
        Agrupado por documento. Los totales corresponden a las deudas que cumplen los filtros.
      </p>
      <CarteraAgrupadaTable v-if="filtros.agruparPor" class="tabla" :grupos="grupos" />
      <CarteraTable v-else class="tabla" :cartera="cartera" />

      <div v-if="totalPaginas > 1" class="paginacion">
        <button
          type="button"
          :disabled="pagina === 0 || cargando"
          @click="cambiarPagina(pagina - 1)"
        >
          Anterior
        </button>

        <span> Página {{ pagina + 1 }} de {{ totalPaginas }} </span>

        <button
          type="button"
          :disabled="pagina + 1 >= totalPaginas || cargando"
          @click="cambiarPagina(pagina + 1)"
        >
          Siguiente
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.cartera-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: var(--spacing-xs);
}

.tabla {
  min-height: 0;
}

.mensaje,
.resumen {
  padding: 12px 21px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.nota-agrupacion {
  padding: 0 21px 12px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.error {
  color: var(--color-text);
}

.paginacion {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  font-size: 13px;
}

.paginacion button,
.error button {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.paginacion button:hover:not(:disabled),
.error button:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
}

.paginacion button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
