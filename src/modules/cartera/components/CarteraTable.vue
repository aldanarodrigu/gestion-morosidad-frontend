<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { CarteraItem } from '../types/cartera'

defineProps<{
  cartera: CarteraItem[]
}>()

const router = useRouter()

// El click en la fila sigue funcionando para mouse; el link del CM cubre teclado y "abrir en pestaña nueva"
function irAContribuyente(event: MouseEvent, cm: string) {
  if ((event.target as HTMLElement).closest('a, button')) return
  router.push(`/contribuyentes/${cm}`)
}

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

function formatoImporte(importe: number) {
  return importe.toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div class="table-container">
    <table class="cartera-table" aria-label="Cartera de morosidad">
      <thead>
        <tr>
          <th scope="col">CM</th>
          <th scope="col">Contribuyente</th>
          <th scope="col">Tributo</th>
          <th scope="col" class="deuda">Deuda</th>
          <th scope="col">Días vencido</th>
          <th scope="col">Segmento</th>
          <th scope="col">Convenio</th>
          <th scope="col">Contacto</th>
          <th scope="col">Acción sugerida</th>
          <th scope="col">Gestiones</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="item in cartera"
          :key="item.id"
          class="clickable-row"
          @click="irAContribuyente($event, item.cm)"
        >
          <td class="cm">
            <RouterLink
              :to="`/contribuyentes/${item.cm}`"
              class="cm-link"
              :aria-label="`Ver contribuyente ${item.contribuyente} (CM ${item.cm})`"
            >
              {{ item.cm }}
            </RouterLink>
          </td>

          <td class="contribuyente">{{ item.contribuyente }}</td>

          <td>{{ item.tributo }}</td>

          <td class="deuda">$ {{ formatoImporte(item.deuda) }}</td>

          <td>{{ item.diasVencido }}</td>

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
            <span class="contacto" :class="{ 'sin-datos': item.contacto === 'Sin datos' }">
              {{ item.contacto }}
            </span>
          </td>

          <td>{{ item.accionSugerida }}</td>

          <td class="gestiones">{{ item.gestiones ?? '—' }}</td>
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
  overflow: auto;
  background: var(--color-surface-secondary);
}

.cartera-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cartera-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 12px;
  text-align: center;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-secondary);
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 var(--color-border),
    0 1px 0 var(--color-border);
}

.cartera-table td {
  padding: 15px 12px;
  text-align: center;
  color: var(--color-text);
  white-space: nowrap;
}

.cartera-table .cm {
  font-weight: 600;
  color: var(--color-primary);
}

.cartera-table .deuda {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cartera-table .empty {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}

.cm-link {
  color: inherit;
  text-decoration: none;
}

.cm-link:hover {
  text-decoration: underline;
}

.cm-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.contribuyente {
  font-weight: 500;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover,
.clickable-row:focus-within {
  background-color: var(--color-surface);
}

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

.estado.si {
  color: #15803d;
}

.estado.no {
  color: var(--color-text-secondary);
}

.contacto.sin-datos {
  color: var(--color-text-secondary);
}

.gestiones {
  font-weight: 500;
}
</style>
