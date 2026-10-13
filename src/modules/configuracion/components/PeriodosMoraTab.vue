<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  obtenerPeriodos,
  guardarPeriodos,
  restaurarPeriodosBase,
} from '../services/periodoMoraService'
import { obtenerTributos } from '../services/tributoService'
import type { Tributo } from '../services/tributoService'
import type { SegmentoMora, RangoMora, RangoMoraRequest } from '../services/periodoMoraService'
const auth = useAuthStore()
const tributoId = ref<number | null>(null)
const tributos = ref<Tributo[]>([])
const puedeEditar = computed(
  () => auth.tieneRol('ADMINISTRADOR') && Number.isInteger(tributoId.value),
)
const usaBase = computed(
  () => tributoId.value !== null && rangos.value.every((r) => r.tributoId == null),
)
const segmentos = ref<SegmentoMora[]>([])
const rangos = ref<RangoMora[]>([])
const filas = computed(() =>
  segmentos.value.map((s) => ({ ...s, rango: rangos.value.find((r) => r.segmentoId === s.id) })),
)
const formulario = ref<{ segmentoId: number; nombre: string; hasta: number | null | '' }[] | null>(
  null,
)
const cargando = ref(true),
  guardando = ref(false)
const errorCarga = ref(''),
  errorFormulario = ref(''),
  mensaje = ref('')
let controller: AbortController | null = null
function errorApi(e: unknown, defecto: string) {
  return isAxiosError<{ mensaje?: string }>(e) ? (e.response?.data?.mensaje ?? defecto) : defecto
}
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  cargando.value = true
  errorCarga.value = ''
  formulario.value = null
  errorFormulario.value = ''
  mensaje.value = ''
  try {
    const [datos, catalogo] = await Promise.all([
      obtenerPeriodos(ctrl.signal, tributoId.value ?? undefined),
      obtenerTributos(ctrl.signal),
    ])
    if (ctrl.signal.aborted) return
    segmentos.value = [...datos.segmentos].sort((a, b) => a.orden - b.orden)
    rangos.value = datos.rangos
    tributos.value = catalogo
  } catch (e) {
    if (!ctrl.signal.aborted)
      errorCarga.value = errorApi(e, 'No se pudieron cargar los períodos de mora.')
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
onMounted(cargar)
watch(tributoId, cargar)
onScopeDispose(() => controller?.abort())
async function restaurar() {
  if (!puedeEditar.value || tributoId.value === null || guardando.value) return
  const contexto = controller
  guardando.value = true
  errorFormulario.value = ''
  try {
    await restaurarPeriodosBase(tributoId.value)
    if (contexto?.signal.aborted) return
    await cargar()
    mensaje.value = 'Se restauraron los rangos base para este tributo.'
  } catch (e) {
    if (!contexto?.signal.aborted)
      errorFormulario.value = errorApi(e, 'No se pudieron restaurar los rangos base.')
  } finally {
    guardando.value = false
  }
}
function editar() {
  formulario.value = filas.value.map((f) => ({
    segmentoId: f.id,
    nombre: f.nombre,
    hasta: f.rango?.diasHasta ?? null,
  }))
  errorFormulario.value = ''
  mensaje.value = ''
}
function cancelar() {
  formulario.value = null
  errorFormulario.value = ''
}
function desde(i: number) {
  if (!i) return 0
  const anterior = formulario.value?.[i - 1]?.hasta
  return typeof anterior === 'number' ? anterior + 1 : '—'
}
async function guardar() {
  if (!puedeEditar.value || !formulario.value || guardando.value) return
  errorFormulario.value = ''
  const nuevos: RangoMoraRequest[] = []
  let inicio = 0
  for (let i = 0; i < formulario.value.length; i++) {
    const fila = formulario.value[i]!
    const ultima = i === formulario.value.length - 1
    if (
      !ultima &&
      (typeof fila.hasta !== 'number' ||
        !Number.isInteger(fila.hasta) ||
        fila.hasta < inicio ||
        fila.hasta >= 2147483647)
    ) {
      errorFormulario.value =
        'Los límites deben ser días enteros y mantener el orden de los segmentos.'
      return
    }
    const hasta = ultima ? null : (fila.hasta as number)
    nuevos.push({ segmentoId: fila.segmentoId, diasDesde: inicio, diasHasta: hasta })
    if (hasta !== null) inicio = hasta + 1
  }
  const contexto = controller
  guardando.value = true
  try {
    const guardados = await guardarPeriodos(nuevos, tributoId.value ?? undefined)
    if (contexto?.signal.aborted) return
    rangos.value = guardados
    cancelar()
    mensaje.value = 'Períodos guardados y segmentos de las deudas actualizados.'
  } catch (e) {
    if (!contexto?.signal.aborted)
      errorFormulario.value = errorApi(e, 'No se pudieron guardar los períodos.')
  } finally {
    guardando.value = false
  }
}
</script>
<template>
  <section class="periodos" aria-label="Períodos de mora">
    <div class="selector-tributo">
      <label for="mora-tributo">Tipo de tributo</label>
      <select id="mora-tributo" v-model="tributoId" :disabled="guardando">
        <option :value="null">Rangos base</option>
        <option v-for="tributo in tributos" :key="tributo.id" :value="tributo.id">
          {{ tributo.codigo }}{{ tributo.descripcion ? ` · ${tributo.descripcion}` : '' }}
        </option>
      </select>
    </div>
    <header class="cabecera">
      <p class="ayuda">
        Rangos de días de atraso que determinan el segmento de mora de cada deuda.
      </p>
      <button
        v-if="
          puedeEditar &&
          !formulario &&
          !cargando &&
          !errorCarga &&
          filas.length &&
          filas.every((f) => f.rango)
        "
        type="button"
        class="primario editar"
        @click="editar"
      >
        Editar períodos
      </button>
    </header>
    <p v-if="cargando" role="status" class="ayuda">Cargando períodos...</p>
    <div v-else-if="errorCarga" role="alert" class="error">
      <p>{{ errorCarga }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <p v-if="tributoId === null" class="ayuda">
        Estos rangos se aplican a todos los tributos sin configuración propia. Seleccioná un tributo
        para personalizar sus límites.
      </p>
      <p v-else class="ayuda">
        {{
          usaBase
            ? 'Este tributo usa los rangos base. Podés definir sus propios límites.'
            : 'Este tributo tiene límites propios.'
        }}
      </p>
      <button
        v-if="puedeEditar && !usaBase && !formulario"
        type="button"
        class="secundario restaurar"
        :disabled="guardando"
        @click="restaurar"
      >
        Usar rangos base
      </button>
      <p v-if="errorFormulario && !formulario" role="alert" class="error">{{ errorFormulario }}</p>
      <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
      <div v-if="filas.length" class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th scope="col">Segmento</th>
              <th scope="col">Desde</th>
              <th scope="col">Hasta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filas" :key="fila.id">
              <td>
                <strong>{{ fila.nombre }}</strong>
                <p v-if="fila.descripcion" class="ayuda detalle">{{ fila.descripcion }}</p>
              </td>
              <td>{{ fila.rango ? `${fila.rango.diasDesde} días` : '—' }}</td>
              <td>
                {{
                  !fila.rango
                    ? 'Sin rango vigente'
                    : fila.rango.diasHasta === null
                      ? 'Sin límite'
                      : `${fila.rango.diasHasta} días`
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="ayuda">No hay segmentos de mora registrados.</p>
      <form v-if="formulario && puedeEditar" class="formulario" @submit.prevent="guardar">
        <h3>Editar períodos de mora</h3>
        <p class="ayuda explicacion">
          Los límites son inclusivos. El siguiente período comienza al día siguiente del anterior;
          el último no tiene límite superior.
        </p>
        <fieldset :disabled="guardando">
          <div v-for="(fila, i) in formulario" :key="fila.segmentoId" class="rango">
            <span class="nombre">{{ fila.nombre }}</span>
            <div>
              <span class="etiqueta">Desde</span><span class="desde">{{ desde(i) }} días</span>
            </div>
            <div>
              <label v-if="i < formulario.length - 1" :for="`mora-hasta-${fila.segmentoId}`"
                >Hasta (días)</label
              ><span v-else class="etiqueta">Hasta</span
              ><input
                v-if="i < formulario.length - 1"
                :id="`mora-hasta-${fila.segmentoId}`"
                v-model.number="fila.hasta"
                type="number"
                min="0"
                max="2147483646"
                step="1"
                required
              /><span v-else class="desde">Sin límite</span>
            </div>
          </div>
        </fieldset>
        <p class="ayuda explicacion">
          Al guardar se actualizarán los segmentos de las deudas no canceladas según sus tributos.
          Si hay varios, se usa el segmento más avanzado. Los rangos anteriores quedan en el
          historial.
        </p>
        <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
        <div class="botones">
          <button class="secundario" type="button" :disabled="guardando" @click="cancelar">
            Cancelar</button
          ><button class="primario" type="submit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar períodos' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>
<style scoped>
.periodos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  font-size: 13px;
}
.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.ayuda {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 0;
}
.tabla-contenedor {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 11px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
th {
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}
tbody tr:last-child td {
  border-bottom: 0;
}
td:not(:first-child) {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.detalle {
  margin-top: 4px;
  max-width: 560px;
}
strong,
.nombre {
  font-weight: 600;
}
.formulario {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
h3 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}
.explicacion {
  margin: 12px 0 20px;
}
fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.rango {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
label,
.etiqueta {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.desde {
  display: block;
  padding: 10px 0;
}
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}
.restaurar {
  align-self: flex-start;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
button {
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.primario {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}
.secundario {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.error {
  color: var(--color-tardia);
}
.confirmacion {
  margin: 0;
  color: var(--color-temprana);
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .rango {
    grid-template-columns: 1fr 1fr;
  }
  .nombre {
    grid-column: 1 / -1;
  }
  .formulario {
    padding: var(--spacing-md);
  }
}
</style>
