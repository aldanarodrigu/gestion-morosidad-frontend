<script setup lang="ts">
import { origen as nombreOrigen } from '@/shared/utils/formato'
import { computed, ref, watch } from 'vue'
import { mensajeDeError, useConsulta } from '@/shared/composables/useConsulta'
import {
  obtenerHistorial,
  type HistorialPadron,
  type RelacionPadron,
} from '../services/historialService'
import EstadoConsulta from '@/shared/components/EstadoConsulta.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
const props = defineProps<{ deudaId: number; cm: string; origen?: string }>()
const filas = ref<RelacionPadron[]>([])
const { cargando, error, ejecutar } = useConsulta<HistorialPadron>()
async function cargar() {
  filas.value = []
  const resultado = await ejecutar(
    (signal) => obtenerHistorial(props.deudaId, signal),
    (e) => mensajeDeError(e, 'No se pudo consultar el historial. Intentá nuevamente.'),
  )
  if (resultado) filas.value = resultado.data
}
watch(() => props.deudaId, cargar, { immediate: true })
const grupos = computed(() =>
  [
    {
      nombre: 'Relaciones actuales',
      filas: filas.value.filter((f) => f.SITUACION_REGISTRO === 'ACTIVO'),
    },
    {
      nombre: 'Relaciones históricas',
      filas: filas.value.filter((f) => f.SITUACION_REGISTRO === 'NO ACTIVO - SOLO HISTORICO'),
    },
    {
      nombre: 'Situación sin clasificar',
      filas: filas.value.filter(
        (f) => !['ACTIVO', 'NO ACTIVO - SOLO HISTORICO'].includes(f.SITUACION_REGISTRO || ''),
      ),
    },
  ].filter((g) => g.filas.length),
)
</script>
<template>
  <section class="historial-panel" aria-live="polite" :aria-busy="cargando">
    <header>
      <h3>Personas vinculadas al padrón</h3>
      <p>{{ nombreOrigen(origen) }} · CM {{ cm }}</p>
    </header>
    <EstadoConsulta
      :cargando="cargando"
      :error="error"
      :vacio="!filas.length"
      texto-carga="Consultando historial"
      texto-vacio="No hay relaciones registradas para este padrón."
      @reintentar="cargar"
    >
      <template #esqueleto>
        <section class="grupo" aria-hidden="true">
          <h4><SkeletonBloque ancho="9em" /></h4>
          <div class="tabla">
            <table>
              <thead>
                <tr>
                  <th scope="col">Padrón / CM</th>
                  <th scope="col">Persona</th>
                  <th scope="col">Relación</th>
                  <th scope="col">Situación</th>
                  <th scope="col">Contactos disponibles</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonFilas
                  :columnas="5"
                  :filas="3"
                  :con-detalle="[0, 1, 4]"
                  :anchos="['6em', '11em', '7em', '6em', '9em']"
                />
              </tbody>
            </table>
          </div>
        </section>
      </template>
      <section v-for="grupo in grupos" :key="grupo.nombre" class="grupo">
        <h4>{{ grupo.nombre }} ({{ grupo.filas.length }})</h4>
        <div class="tabla">
          <table>
            <thead>
              <tr>
                <th scope="col">Padrón / CM</th>
                <th scope="col">Persona</th>
                <th scope="col">Relación</th>
                <th scope="col">Situación</th>
                <th scope="col">Contactos disponibles</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in grupo.filas" :key="i">
                <td>
                  {{ r.NRO_PADRON || '—'
                  }}<small>CM {{ r.CM_PADRON }} · {{ r.TIPO_PADRON || 'Sin tipo' }}</small>
                </td>
                <td>
                  {{ r.NOMBRE || 'Sin nombre informado'
                  }}<small>Documento: {{ r.DOCUMENTO || 'Sin informar' }}</small
                  ><small v-if="r.COD_CONTRIBUYENTE != null"
                    >Código: {{ r.COD_CONTRIBUYENTE }}</small
                  >
                </td>
                <td>{{ r.DESCRIPCION_RELACION || 'Sin informar' }}</td>
                <td>{{ r.SITUACION_REGISTRO || 'Sin informar' }}</td>
                <td>
                  <span>{{ r.TELEFONO || 'Teléfono sin informar' }}</span
                  ><small>{{ r.EMAIL || 'Correo sin informar' }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </EstadoConsulta>
    <p class="nota">
      Los contactos son los disponibles actualmente en la fuente. Las relaciones registradas no
      acreditan por sí solas titularidad ni obligación de pago.
    </p>
  </section>
</template>
<style scoped>
.historial-panel {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  white-space: normal;
}
h3 {
  font-size: 14px;
}
header p,
.nota,
small {
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
  margin-top: 6px;
}
.grupo {
  margin-top: 18px;
}
h4 {
  font-size: var(--texto-sm);
  margin-bottom: 10px;
}
.tabla {
  overflow: auto;
  max-height: 360px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--texto-sm);
  --esqueleto-celda-padding: 12px;
}
th,
td {
  padding: 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}
th {
  position: sticky;
  top: 0;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-weight: 500;
}
small {
  display: block;
}
.mensaje,
.error {
  padding: 16px 0;
  font-size: var(--texto-sm);
}
.error {
  color: var(--color-tardia);
}
button {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-primary);
  font: inherit;
}
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.nota {
  margin-top: 16px;
}
</style>
