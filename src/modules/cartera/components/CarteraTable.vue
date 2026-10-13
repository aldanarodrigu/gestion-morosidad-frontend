<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { CarteraItem } from '../types/cartera'

defineProps<{
  cartera: CarteraItem[]
}>()

const router = useRouter()

function irAContribuyente(event: MouseEvent, contribuyenteId: number, deudaId: number) {
  if ((event.target as HTMLElement).closest('a, button')) return

  router.push({ path: `/contribuyentes/${contribuyenteId}`, query: { deuda: String(deudaId) } })
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

function mostrarAcciones(acciones: string[]) {
  window.alert(acciones.join('\n'))
}
</script>

<template>
  <div class="table-container">
    <table class="cartera-table" aria-label="Cartera de morosidad">
      <thead>
        <tr>
          <th scope="col" class="col-left">CM</th>
          <th scope="col" class="col-left">N.º padrón</th>
          <th scope="col" class="col-left">Contribuyente</th>
          <th scope="col" class="col-left">Tributo</th>
          <th scope="col" class="col-left">Segmento</th>
          <th scope="col" class="col-right">Días vencido</th>
          <th scope="col" class="col-right">Deuda</th>
          <th scope="col" class="col-right">Gestiones</th>
          <!--
          <th scope="col" class="col-center">Convenio</th>
          <th scope="col" class="col-left">Contacto</th>
          -->
          <th scope="col" class="col-left col-acciones">Acción sugerida</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="item in cartera"
          :key="item.id"
          class="clickable-row"
          @click="irAContribuyente($event, item.contribuyenteId, item.id)"
        >
          <td class="col-left cm">
            <RouterLink
              :to="{
                path: `/contribuyentes/${item.contribuyenteId}`,
                query: { deuda: String(item.id) },
              }"
              class="cm-link"
            >
              {{ item.cm }}
            </RouterLink>
          </td>

          <td class="col-left">{{ item.numeroPadron || '—' }}</td>

          <td class="col-left contribuyente">
            {{ item.contribuyente }}
            <span class="documento">Documento: {{ item.documento || 'Sin documento' }}</span>
          </td>
          <td class="col-left">{{ item.tributo }}</td>

          <td class="col-left">
            <span class="segmento" :class="getSegmentoClass(item.segmento)">
              {{ item.segmento }}
            </span>
          </td>

          <td class="col-right num">{{ item.diasVencido }}</td>
          <td class="col-right deuda">$ {{ formatoImporte(item.deuda) }}</td>
          <td class="col-right gestiones num">{{ item.gestiones ?? '—' }}</td>

          <!--
          <td class="col-center">
            <span class="estado" :class="item.convenio ? 'si' : 'no'">
              {{ item.convenio ? 'Sí' : 'No' }}
            </span>
          </td>
          

          <td class="col-left">
            <span class="contacto" :class="{ 'sin-datos': item.contacto === 'Sin datos' }">
              {{ item.contacto }}
            </span>
          </td>
          -->

          <td class="col-left col-acciones acciones">
            <template v-if="item.accionesSugeridas.length">
              <span class="accion-principal">
                {{ item.accionesSugeridas[0] }}
              </span>

              <button
                v-if="item.accionesSugeridas.length > 1"
                class="acciones-mas"
                type="button"
                :title="item.accionesSugeridas.slice(1).join(', ')"
                @click.stop="mostrarAcciones(item.accionesSugeridas)"
              >
                +{{ item.accionesSugeridas.length - 1 }} más
              </button>
            </template>

            <span v-else>—</span>
          </td>
        </tr>

        <tr v-if="cartera.length === 0">
          <td colspan="9" class="empty">No hay registros para mostrar.</td>
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

/* Mismo padding horizontal en th y td para que encabezado y contenido coincidan */
.cartera-table th,
.cartera-table td {
  padding: 14px 16px;
  vertical-align: middle;
  white-space: nowrap;
}

.cartera-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-secondary);
  box-shadow:
    inset 0 1px 0 var(--color-border),
    0 1px 0 var(--color-border);
}

.cartera-table td {
  color: var(--color-text);
}

/* Alineación por columna (aplica igual a th y td) */
.col-left {
  text-align: left;
}

.col-right {
  text-align: right;
}

.col-center {
  text-align: center;
}

/* Números con ancho de dígito uniforme */
.deuda,
.num {
  font-variant-numeric: tabular-nums;
}

.deuda {
  font-weight: 600;
}

/* Acciones sugeridas */
.col-acciones {
  width: 220px;
  min-width: 180px;
  max-width: 220px;
}

.cartera-table td.acciones {
  white-space: normal;
  line-height: 1.4;
}

.cartera-table .cm {
  font-weight: 600;
  color: var(--color-primary);
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

.documento {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-secondary);
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover,
.clickable-row:focus-within {
  background-color: var(--color-surface);
}

/* Sin padding horizontal: el texto queda alineado con el encabezado */
.segmento {
  display: inline-block;
  font-size: 13px;
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

.estado.no,
.contacto.sin-datos {
  color: var(--color-text-secondary);
}

.gestiones {
  font-weight: 500;
}

.accion-principal {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.acciones-mas {
  display: block;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.acciones-mas:hover {
  text-decoration: underline;
}

.acciones-mas:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
