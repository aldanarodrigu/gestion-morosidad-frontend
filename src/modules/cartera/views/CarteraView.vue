<script setup lang="ts">
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

function exportarExcel() {
  const encabezados = [
    'CM',
    'Contribuyente',
    'Documento',
    'Origen',
    'Tributo',
    'Deuda',
    'Días vencido',
    'Segmento',
    'Convenio',
  ]

  const registros = filtros.value.agruparPor
    ? grupos.value.map((grupo) => ({
        cm: grupo.deudas.map((d) => d.cm).join(', '),
        contribuyente: grupo.nombres.join(' / '),
        documento: grupo.documento,
        origen: [...new Set(grupo.deudas.map((d) => d.origen))].join(', '),
        tributo: [...new Set(grupo.deudas.map((d) => d.tributo))].join(', '),
        deuda: grupo.importeTotal,
        diasVencido: grupo.diasAtrasoMaximos,
        segmento: grupo.segmentoMora?.nombre ?? 'Sin segmento',
        convenio: grupo.deudas.some((d) => d.convenio),
      }))
    : cartera.value
  const filas = registros.map((item) => [
    item.cm,
    item.contribuyente,
    item.documento,
    item.origen,
    item.tributo,
    item.deuda,
    item.diasVencido,
    item.segmento,
    item.convenio ? 'Sí' : 'No',
  ])

  const escapar = (valor: string | number | null) => {
    let texto = String(valor ?? '')
    // Evita que Excel interprete el texto como fórmula (CSV injection)
    if (typeof valor === 'string' && /^[=+\-@]/.test(texto)) {
      texto = `'${texto}`
    }
    return `"${texto.replace(/"/g, '""')}"`
  }

  const contenido = [encabezados, ...filas].map((fila) => fila.map(escapar).join(';')).join('\r\n')

  const archivo = new Blob(['\uFEFF', contenido], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')

  enlace.href = url
  enlace.download = 'cartera-morosidad.csv'
  enlace.click()

  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="cartera-view">
    <MorosidadFilters v-model="filtros" @export="exportarExcel" />

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
