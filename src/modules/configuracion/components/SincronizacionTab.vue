<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import SincronizacionProgreso from './SincronizacionProgreso.vue'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonDetalle from '@/shared/components/esqueleto/SkeletonDetalle.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  obtenerPeriodo,
  guardarPeriodo,
  obtenerEjecucion,
  iniciarSincronizacion,
  cancelarSincronizacion,
  type EjecucionSincronizacion,
} from '../services/sincronizacionService'
const auth = useAuthStore()
const admin = computed(() => auth.tieneRol('ADMINISTRADOR'))
const anio = ref<number | string | null>(2013),
  guardado = ref<number | null>(),
  cargando = ref(true),
  guardando = ref(false),
  iniciando = ref(false)
const origen = ref('INTENDENCIA'),
  error = ref(''),
  mensaje = ref(''),
  ejecucion = ref<EjecucionSincronizacion | null>(null)
const cancelando = ref(false)
const ocupada = computed(
  () => ['EN_CURSO', 'CANCELANDO'].includes(ejecucion.value?.estado || '') || iniciando.value,
)
const puedeCancelar = computed(
  () =>
    ejecucion.value?.estado === 'EN_CURSO' &&
    !['GUARDANDO', 'FINALIZADA'].includes(ejecucion.value.progreso?.etapa || '') &&
    !cancelando.value,
)
const maxAnio = new Date().getFullYear()
const anioSeleccionado = computed(() =>
  anio.value === '' || anio.value == null ? null : Number(anio.value),
)
let timer: ReturnType<typeof setTimeout> | undefined
let revision = 0
const esqueleto = useEsqueleto(() => cargando.value)
const controller = new AbortController()
function detalleError(e: unknown) {
  return (
    (e as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje ||
    'No se pudo completar la solicitud. Intentá nuevamente.'
  )
}
async function cargar() {
  if (!admin.value) {
    cargando.value = false
    return
  }
  error.value = ''
  cargando.value = true
  try {
    const [p, e] = await Promise.all([
      obtenerPeriodo(controller.signal),
      obtenerEjecucion(controller.signal),
    ])
    if (controller.signal.aborted) return
    anio.value = p.anioMinimo
    guardado.value = p.anioMinimo
    ejecucion.value = e
    programar()
  } catch (e) {
    if (!controller.signal.aborted) error.value = detalleError(e)
  } finally {
    cargando.value = false
  }
}
function programar() {
  clearTimeout(timer)
  if (
    ['EN_CURSO', 'CANCELANDO'].includes(ejecucion.value?.estado || '') &&
    !controller.signal.aborted &&
    !cancelando.value
  )
    timer = setTimeout(actualizar, 2000)
}
async function actualizar() {
  const version = revision
  try {
    const estado = await obtenerEjecucion(controller.signal)
    if (controller.signal.aborted || version !== revision) return
    if (
      !cancelando.value &&
      !(ejecucion.value?.estado === 'CANCELANDO' && estado?.estado === 'EN_CURSO')
    )
      ejecucion.value = estado
    error.value = ''
  } catch {
    if (!controller.signal.aborted)
      error.value =
        'No se pudo actualizar el progreso. La sincronización puede seguir en segundo plano; se reintentará la consulta.'
  } finally {
    programar()
  }
}
async function guardar() {
  error.value = ''
  mensaje.value = ''
  guardando.value = true
  try {
    const p = await guardarPeriodo(anioSeleccionado.value)
    if (controller.signal.aborted) return
    guardado.value = p.anioMinimo
    mensaje.value = 'Período guardado. Se aplicará en la próxima sincronización de cada origen.'
  } catch (e) {
    if (!controller.signal.aborted) error.value = detalleError(e)
  } finally {
    guardando.value = false
  }
}
async function iniciar() {
  error.value = ''
  mensaje.value = ''
  iniciando.value = true
  try {
    const e = await iniciarSincronizacion(origen.value)
    if (controller.signal.aborted) return
    ejecucion.value = e
    programar()
  } catch (e) {
    if (!controller.signal.aborted) error.value = detalleError(e)
  } finally {
    iniciando.value = false
  }
}
async function cancelar() {
  error.value = ''
  cancelando.value = true
  revision++
  // Evita que una consulta de progreso anterior reemplace la respuesta de cancelación.
  clearTimeout(timer)
  try {
    const estado = await cancelarSincronizacion()
    if (controller.signal.aborted) return
    ejecucion.value = estado
  } catch (e) {
    if (!controller.signal.aborted) error.value = detalleError(e)
  } finally {
    cancelando.value = false
    programar()
  }
}
onMounted(cargar)
onScopeDispose(() => {
  controller.abort()
  clearTimeout(timer)
})
</script>
<template>
  <section class="sincronizacion">
    <p v-if="!admin">Esta configuración está disponible para Administrador.</p>
    <template v-else>
      <p>
        Importar deudas pendientes con vencimiento desde el 1 de enero del año seleccionado,
        incluido, hasta la fecha actual. Dejá el año vacío para incluir todos los años.
      </p>
      <AvisoCarga :activo="cargando" texto="Cargando configuración" />
      <template v-if="esqueleto">
        <div class="bloque" aria-hidden="true">
          <h3>Período de gestión</h3>
          <SkeletonDetalle
            class="campo-esqueleto"
            :etiquetas="['Año mínimo (opcional)']"
            tipo="campo"
          />
          <SkeletonBloque ancho="80%" />
        </div>
        <div class="bloque" aria-hidden="true">
          <h3>Sincronización manual</h3>
          <SkeletonBloque ancho="60%" />
          <SkeletonDetalle class="campo-esqueleto" :etiquetas="['Origen']" tipo="campo" />
        </div>
      </template>
      <template v-else-if="cargando" />
      <template v-else-if="guardado !== undefined">
        <form class="bloque" @submit.prevent="guardar">
          <h3>Período de gestión</h3>
          <div class="controles">
            <label
              >Año mínimo (opcional)<input
                v-model.number="anio"
                type="number"
                min="1900"
                :max="maxAnio"
                step="1"
                placeholder="Sin límite"
                :disabled="ocupada || guardando" /></label
            ><button
              type="submit"
              :disabled="ocupada || guardando || anioSeleccionado === guardado"
            >
              {{ guardando ? 'Guardando…' : 'Guardar período' }}
            </button>
          </div>
          <p>
            Se utiliza en las sincronizaciones manuales y automáticas de ambos orígenes. Los
            registros fuera del período conservan sus gestiones y quedan excluidos de cartera,
            reportes y exportaciones.
          </p>
        </form>
        <div class="bloque">
          <h3>Sincronización manual</h3>
          <p>
            Período guardado:
            {{ guardado == null ? 'sin año mínimo' : 'desde el 01/01/' + guardado }}. Ejecutá cada
            origen para actualizar toda la cartera.
          </p>
          <div class="controles">
            <label
              >Origen<select v-model="origen" :disabled="ocupada || guardando">
                <option value="INTENDENCIA">Intendencia</option>
                <option value="SUCIVE">SUCIVE</option>
              </select></label
            ><button
              type="button"
              class="primario"
              @click="iniciar"
              :disabled="ocupada || guardando || anioSeleccionado !== guardado"
            >
              {{
                ejecucion?.estado === 'CANCELANDO'
                  ? 'Cancelando…'
                  : ocupada
                    ? 'Sincronización en curso…'
                    : 'Sincronizar ahora'
              }}
            </button>
          </div>
          <p v-if="anioSeleccionado !== guardado">Guardá el período antes de iniciar.</p>
          <div
            v-if="ejecucion"
            class="resultado"
            :class="{ fallo: ejecucion.estado === 'ERROR' }"
            :role="ejecucion.estado === 'ERROR' ? 'alert' : 'status'"
          >
            <strong
              >{{ ejecucion.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }} ·
              {{
                ejecucion.anioMinimo == null ? 'Sin año mínimo' : 'Desde ' + ejecucion.anioMinimo
              }}
              ·
              {{
                ejecucion.estado === 'EN_CURSO'
                  ? 'En curso'
                  : ejecucion.estado === 'CANCELANDO'
                    ? 'Cancelando…'
                    : ejecucion.estado === 'CANCELADA'
                      ? 'Cancelada'
                      : ejecucion.estado === 'COMPLETADA'
                        ? 'Completada'
                        : 'Error'
              }}</strong
            >
            <p>{{ ejecucion.mensaje }}</p>
            <button
              v-if="ocupada && !iniciando"
              type="button"
              class="cancelar"
              :disabled="!puedeCancelar"
              @click="cancelar"
            >
              {{
                cancelando || ejecucion.estado === 'CANCELANDO'
                  ? 'Cancelando…'
                  : 'Cancelar sincronización'
              }}
            </button>
            <p
              v-if="
                ejecucion.estado === 'EN_CURSO' &&
                ['GUARDANDO', 'FINALIZADA'].includes(ejecucion.progreso?.etapa || '')
              "
            >
              El guardado ya comenzó; la cancelación está deshabilitada durante esta etapa.
            </p>
            <SincronizacionProgreso
              v-if="ejecucion.progreso"
              :progreso="ejecucion.progreso"
              :estado="ejecucion.estado"
            />
            <dl v-if="ejecucion.resultado">
              <div>
                <dt>Pendientes recibidas</dt>
                <dd>{{ ejecucion.resultado.pendientesRecibidas }}</dd>
              </div>
              <div>
                <dt>Deudas creadas</dt>
                <dd>{{ ejecucion.resultado.deudasCreadas }}</dd>
              </div>
              <div>
                <dt>Deudas actualizadas</dt>
                <dd>{{ ejecucion.resultado.deudasActualizadas }}</dd>
              </div>
              <div>
                <dt>Registros omitidos</dt>
                <dd>{{ ejecucion.resultado.registrosOmitidos }}</dd>
              </div>
            </dl>
          </div>
          <p>
            La descarga continúa en segundo plano aunque salgas de esta pestaña. Si falla, no se
            aplica una importación parcial.
          </p>
        </div>
      </template>
      <p v-if="mensaje" role="status" class="exito">{{ mensaje }}</p>
      <div v-if="error" role="alert" class="error">
        {{ error }} <button v-if="guardado === undefined" @click="cargar">Reintentar</button>
      </div>
    </template>
  </section>
</template>
<style scoped>
.campo-esqueleto {
  max-width: 240px;
  --esqueleto-etiqueta-tamano: 12px;
}
.sincronizacion {
  display: grid;
  gap: 16px;
}
h2 {
  font-size: var(--titulo-panel);
}
h3 {
  font-size: var(--texto-base);
}
.sincronizacion p {
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.bloque {
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 14px;
}
.controles {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: end;
}
label {
  display: grid;
  gap: 6px;
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
input,
select,
button {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--texto-sm);
}
input {
  width: 150px;
}
button {
  color: var(--color-primary);
}
.cancelar {
  margin-top: 12px;
  color: var(--color-tardia);
  border-color: var(--color-border);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.resultado {
  padding: 16px;
  background: var(--color-background);
  border-radius: var(--radius-sm);
  font-size: var(--texto-sm);
}
.resultado strong {
  display: block;
  margin-bottom: 6px;
}
.error,
.fallo,
.fallo p {
  color: var(--color-tardia);
}
.sincronizacion p.exito {
  color: var(--color-temprana);
}
dl {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 14px 0 0;
}
dt {
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
dd {
  margin: 4px 0 0;
  font-weight: 600;
}
input:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
