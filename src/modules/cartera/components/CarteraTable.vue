<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

function verContribuyente(cm: string) {
  router.push(`/contribuyentes/${cm}`)
}

interface CarteraItem {
  cm: string
  contribuyente: string
  tributo: string
  deuda: number
  diasVencido: number
  segmento: string
  convenio: boolean
  contacto: string
  accionSugerida: string
  gestiones: number
}

defineProps<{
  cartera: CarteraItem[]
}>()

function getSegmentoClass(segmento: string) {
  switch (segmento.toLowerCase()) {
    case 'mora tardía':
      return 'tardia'

    case 'mora inicial':
      return 'inicial'

    case 'mora temprana':
      return 'temprana'

    default:
      return ''
  }
}
</script>

<template>
  <div class="table-container">
    <table class="cartera-table">
      <thead>
        <tr>
          <th>CM</th>
          <th>Contribuyente</th>
          <th>Tributo</th>
          <th>Deuda</th>
          <th>Días vencido</th>
          <th>Segmento</th>
          <th>Convenio</th>
          <th>Contacto</th>
          <th>Acción sugerida</th>
          <th>Gestiones</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="item in cartera"
          :key="item.cm"
          @click="verContribuyente(item.cm)"
          class="clickable-row"
        >
          <td class="cm">
            {{ item.cm }}
          </td>

          <td class="contribuyente">
            {{ item.contribuyente }}
          </td>

          <td>
            {{ item.tributo }}
          </td>

          <td class="deuda">$ {{ item.deuda.toLocaleString('es-UY') }}</td>

          <td>
            {{ item.diasVencido }}
          </td>

          <td>
            <span class="segmento" :class="getSegmentoClass(item.segmento)">
              {{ item.segmento }}
            </span>
          </td>

          <td>
            <span class="estado" :class="item.convenio ? 'si' : 'no'">
              {{ item.convenio ? 'Sí' : 'No' }}
            </span>
          </td>

          <td>
            <span class="contacto" :class="item.contacto === 'Sin datos' ? 'sin-datos' : ''">
              {{ item.contacto }}
            </span>
          </td>

          <td>
            {{ item.accionSugerida }}
          </td>

          <td class="gestiones">
            {{ item.gestiones }}
          </td>
        </tr>

        <tr v-if="cartera.length === 0">
          <td colspan="10" class="empty">No hay registros para mostrar.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  background: var(--color-surface-secondary);
}

.cartera-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cartera-table th {
  padding: 14px 12px;
  text-align: center;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-secondary);
  white-space: nowrap;
}

.cartera-table td {
  padding: 15px 12px;
  text-align: center;
  color: var(--color-text);
  white-space: nowrap;
}

.cartera-table thead {
  border-top: 1px solid var(--color-border);
}

.cm {
  font-weight: 600;
  color: var(--color-primary) !important;
}

.contribuyente {
  font-weight: 500;
}

.deuda {
  font-weight: 600;
  text-align: right;
}

/* Segmentos */

.segmento {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.segmento.temprana {
  color: #15803d;
}

.segmento.inicial {
  color: #b45309;
}

.segmento.tardia {
  color: #b42318;
}

.empty {
  padding: 40px !important;
  text-align: center;
  color: var(--color-text-light) !important;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
  background-color: #eef2f7;
}
</style>
