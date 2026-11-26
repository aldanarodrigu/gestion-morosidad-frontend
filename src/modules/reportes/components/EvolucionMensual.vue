<script setup lang="ts">
import { fechaHora, importe, numero, origen } from '@/shared/utils/formato'
import type { EvolucionMensualCartera } from '../services/reporteService'

defineProps<{ filas: EvolucionMensualCartera[] }>()

const formatoMes = new Intl.DateTimeFormat('es-UY', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
</script>

<template>
  <section class="panel evolucion" aria-labelledby="evolucion-titulo">
    <header>
      <h2 id="evolucion-titulo">Evolución mensual y recaudación</h2>
      <p>Saldos al cierre y pagos registrados por mes y origen.</p>
    </header>

    <div class="tabla-contenedor-datos">
      <table class="tabla-datos" aria-labelledby="evolucion-titulo">
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Origen</th>
            <th scope="col">Estado del cierre</th>
            <th scope="col" class="numero">Saldo pendiente</th>
            <th scope="col" class="numero">Pagos registrados</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in filas" :key="fila.mes + fila.origen">
            <td class="mes">{{ formatoMes.format(new Date(fila.mes)) }}</td>
            <td>{{ origen(fila.origen) }}</td>
            <td>
              <template v-if="fila.enCurso">
                <span>En curso</span>
                <small>Saldo actual</small>
              </template>
              <template v-else-if="fila.corte">
                <span>Cerrado</span>
                <small>{{ fechaHora(fila.corte) }}</small>
                <small v-if="fila.anioMinimo">Deudas desde {{ fila.anioMinimo }}</small>
              </template>
              <span v-else class="atenuado">Sin cierre</span>
            </td>
            <td class="numero">{{ importe(fila.saldoPendiente) }}</td>
            <td class="numero">
              <template v-if="fila.cantidadPagos">
                <span>{{
                  fila.importePagos === null ? 'Importe sin informar' : importe(fila.importePagos)
                }}</span>
                <small
                  >{{ numero(fila.cantidadPagos) }}
                  {{ fila.cantidadPagos === 1 ? 'pago' : 'pagos' }}</small
                >
              </template>
              <span v-else class="atenuado">Sin registros</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="nota">
      Los filtros de PadTipo y mora se aplican al saldo. Los pagos se muestran por origen, según los
      cobros informados por cada proveedor. El mes en curso incluye los pagos del día 1 hasta hoy.
    </p>
  </section>
</template>

<style scoped>
.evolucion {
  min-width: 0;
  overflow: hidden;
}
.evolucion header {
  padding: 20px var(--pagina-margen);
}
.evolucion h2 {
  font-size: var(--titulo-panel);
  font-weight: 600;
}
.evolucion header p {
  margin-top: 4px;
  font-size: var(--texto-base);
  color: var(--color-text-secondary);
}
.tabla-datos td,
.tabla-datos th {
  white-space: nowrap;
}
.mes {
  font-weight: 600;
}
.mes::first-letter {
  text-transform: uppercase;
}
.atenuado,
.nota {
  color: var(--color-text-secondary);
}
.nota {
  padding: 12px var(--pagina-margen);
  font-size: var(--texto-xs);
}
</style>
