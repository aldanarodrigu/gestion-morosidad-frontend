<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import type { DeudaApi } from '@/modules/cartera/types/cartera'
import {
  obtenerAccionesDisponibles,
  obtenerGestiones,
  guardarGestion,
} from '../services/gestionService'
import type { GestionResponse } from '../services/gestionService'
import { etiquetaResultado, resultadosGestion, validarGestion } from '../utils/gestion'
import type { ResultadoGestion } from '../utils/gestion'

const auth = useAuthStore()
const puedeRegistrar = computed(() => auth.tieneRol('NOTIFICADOR'))
const props = defineProps<{ deudas: DeudaApi[]; deudaInicialId?: number }>()
const emit = defineEmits<{ registrada: [deudaId: number]; cantidad: [total: number | null] }>()
const deudaId = ref<number | null>(null)
const gestiones = ref<GestionResponse[]>([])
const acciones = ref<DeudaApi['accionesSugeridas']>([])
const accionId = ref<number | null>(null)
const resultado = ref<ResultadoGestion | ''>('')
const observacion = ref('')
const cargando = ref(false)
const guardando = ref(false)
const formulario = ref(false)
const errorCarga = ref('')
const errorFormulario = ref('')
const mensaje = ref('')
const deudaSeleccionada = computed(() => props.deudas.find((d) => d.id === deudaId.value))
let controller: AbortController | null = null
function mensajeError(e: unknown, defecto: string): string {
  return isAxiosError<{ mensaje?: string }>(e) ? (e.response?.data?.mensaje ?? defecto) : defecto
}
function limpiarFormulario() {
  accionId.value = null
  resultado.value = ''
  observacion.value = ''
  errorFormulario.value = ''
  formulario.value = false
}
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  limpiarFormulario()
  gestiones.value = []
  acciones.value = []
  errorCarga.value = ''
  mensaje.value = ''
  emit('cantidad', null)
  if (!deudaId.value) return
  cargando.value = true
  try {
    const [historial, disponibles] = await Promise.all([
      obtenerGestiones(deudaId.value, ctrl.signal),
      obtenerAccionesDisponibles(deudaId.value, ctrl.signal),
    ])
    if (ctrl.signal.aborted) return
    gestiones.value = historial
    emit('cantidad', historial.length)
    acciones.value = disponibles
  } catch (e) {
    if (!ctrl.signal.aborted)
      errorCarga.value = mensajeError(e, 'No se pudieron cargar las gestiones. Intentá nuevamente.')
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
watch(
  () => [props.deudas.map((d) => d.id).join(','), props.deudaInicialId],
  () => {
    const inicial = props.deudas.find((d) => d.id === props.deudaInicialId)
    deudaId.value = inicial?.id ?? (props.deudas.length === 1 ? props.deudas[0]!.id : null)
  },
  { immediate: true },
)
watch(deudaId, cargar, { immediate: true })
onScopeDispose(() => controller?.abort())
function abrirFormulario() {
  if (!puedeRegistrar.value) return
  limpiarFormulario()
  mensaje.value = ''
  formulario.value = true
  accionId.value = acciones.value[0]?.id ?? null
}
async function guardar() {
  if (guardando.value || !puedeRegistrar.value) return
  errorFormulario.value = validarGestion(
    deudaId.value,
    accionId.value,
    resultado.value,
    observacion.value,
  )
  if (errorFormulario.value || !deudaId.value || !accionId.value || !resultado.value) return
  const id = deudaId.value
  guardando.value = true
  try {
    const creada = await guardarGestion({
      deudaId: id,
      accionId: accionId.value,
      resultado: resultado.value,
      observacion: observacion.value.trim() || null,
    })
    if (deudaId.value === id) {
      gestiones.value = [creada, ...gestiones.value]
      emit('cantidad', gestiones.value.length)
      limpiarFormulario()
      mensaje.value = 'Gestión registrada correctamente.'
    }
    emit('registrada', id)
  } catch (e) {
    errorFormulario.value = mensajeError(
      e,
      'No se pudo guardar la gestión. Revisá el historial antes de reintentar si se perdió la conexión.',
    )
  } finally {
    guardando.value = false
  }
}
function fecha(valor: string) {
  return new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(valor),
  )
}
function tributos(deuda: DeudaApi) {
  return (
    deuda.tributos.map((t) => t.descripcion || t.codigo).join(', ') || 'Sin tributos informados'
  )
}
</script>

<template>
  <section class="gestiones" aria-label="Gestiones de la deuda">
    <div v-if="deudaSeleccionada" class="contexto-deuda">
      <p class="ayuda">Deuda / padrón</p>
      <p>
        CM {{ deudaSeleccionada.padron.cm }} · Padrón {{ deudaSeleccionada.padron.numeroPadron }} ·
        {{ tributos(deudaSeleccionada) }}
      </p>
      <p class="ayuda">Historial gestiones de esta deuda</p>
    </div>
    <p v-if="!deudas.length" class="vacio">No hay deudas disponibles.</p>
    <p v-else-if="!deudaSeleccionada" class="vacio">
      Volvé a la cartera y abrí la deuda que querés gestionar.
    </p>
    <p v-else-if="cargando" role="status" class="vacio">Cargando gestiones...</p>
    <div v-else-if="errorCarga" role="alert" class="alerta">
      <p>{{ errorCarga }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
      <ol v-if="gestiones.length" class="historial">
        <li v-for="gestion in gestiones" :key="gestion.id" class="gestion">
          <div class="gestion-titulo">
            <strong>{{ gestion.accionNombre }}</strong>
            <span class="tributos">{{
              gestion.tributos.map((t) => t.descripcion || t.codigo).join(', ')
            }}</span>
            <span class="resultado" :class="gestion.resultado.toLowerCase()">{{
              etiquetaResultado(gestion.resultado)
            }}</span>
          </div>
          <p class="observacion">{{ gestion.observacion || 'Sin observaciones.' }}</p>
          <p class="autor">
            {{ gestion.usuarioNombre ? `Por ${gestion.usuarioNombre}` : 'Autor no registrado' }} ·
            <time :datetime="gestion.fecha">{{ fecha(gestion.fecha) }}</time>
          </p>
        </li>
      </ol>
      <p v-else class="vacio">Todavía no se registraron gestiones para esta deuda.</p>
      <button
        v-if="puedeRegistrar && !formulario && acciones.length"
        class="enlace"
        type="button"
        @click="abrirFormulario"
      >
        + Registrar nueva gestión
      </button>
      <p v-else-if="puedeRegistrar && !acciones.length && deudas.length" class="ayuda">
        No hay acciones disponibles para el segmento de esta deuda.
      </p>
      <form v-if="formulario && puedeRegistrar" class="formulario" @submit.prevent="guardar">
        <h3>Registrar nueva gestión</h3>
        <div class="campos">
          <div>
            <label for="gestion-accion">Acción realizada</label>
            <select id="gestion-accion" v-model="accionId" required :disabled="guardando">
              <option v-for="accion in acciones" :key="accion.id" :value="accion.id">
                {{ accion.nombre }}
              </option>
            </select>
          </div>
          <div>
            <label for="gestion-resultado">Respuesta del contribuyente</label>
            <select id="gestion-resultado" v-model="resultado" required :disabled="guardando">
              <option disabled value="">Seleccioná un resultado</option>
              <option v-for="opcion in resultadosGestion" :key="opcion.value" :value="opcion.value">
                {{ opcion.label }}
              </option>
            </select>
          </div>
        </div>
        <label for="gestion-observacion">Observaciones</label>
        <textarea
          id="gestion-observacion"
          v-model="observacion"
          rows="4"
          maxlength="255"
          :disabled="guardando"
          placeholder="Notas sobre la gestión realizada..."
        />
        <p class="contador">{{ observacion.length }}/255</p>
        <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
        <div class="botones">
          <button type="button" class="secundario" :disabled="guardando" @click="limpiarFormulario">
            Cancelar
          </button>
          <button type="submit" class="primario" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar gestión' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.gestiones {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  font-size: 13px;
}
.contexto-deuda {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}
textarea {
  resize: vertical;
  min-height: 95px;
}
select:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.historial {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.gestion {
  padding: var(--spacing-md) 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.gestion-titulo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.gestion-titulo strong {
  font-weight: 500;
  color: var(--color-text);
}
.tributos,
.autor,
.ayuda,
.contador {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.observacion {
  margin: 9px 0 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.autor {
  margin: 0;
}
.resultado {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.resultado.exitosa {
  color: var(--color-temprana);
}
.resultado.rechazada {
  color: var(--color-tardia);
}
.resultado.pendiente {
  color: var(--color-incial);
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
  margin-bottom: 20px;
}
.campos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
button {
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.primario {
  color: white;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  font-weight: 600;
}
.primario:hover {
  background: var(--color-primary-dark);
}
.secundario {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.enlace {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.vacio {
  padding: 20px 0;
  color: var(--color-text-secondary);
}
.contador {
  margin: 4px 0;
  text-align: right;
}
.error,
.alerta {
  color: var(--color-tardia);
}
.confirmacion {
  color: var(--color-temprana);
  margin: 0;
}
@media (max-width: 600px) {
  .campos {
    grid-template-columns: 1fr;
  }
  .formulario {
    padding: 16px;
  }
  .botones {
    flex-wrap: wrap;
  }
}
</style>
