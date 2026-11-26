<script setup lang="ts">
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, ref, watch } from 'vue'
import { mensajeDeError, useConsulta } from '@/shared/composables/useConsulta'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  fechaHora,
  importe as formatoImporte,
  origen as nombreOrigen,
} from '@/shared/utils/formato'
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
const emit = defineEmits<{
  registrada: [deudaId: number]
  cantidad: [total: number | null]
  /** Se eligió otra deuda en el selector; la ficha la abre igual que desde Padrones. */
  seleccionar: [deudaId: number]
}>()
const deudaId = ref<number | null>(null)
const gestiones = ref<GestionResponse[]>([])
const acciones = ref<DeudaApi['accionesSugeridas']>([])
const accionId = ref<number | null>(null)
const resultado = ref<ResultadoGestion | ''>('')
const observacion = ref('')
const {
  cargando,
  error: errorCarga,
  ejecutar,
  detener,
} = useConsulta<[GestionResponse[], DeudaApi['accionesSugeridas']]>()
const esqueleto = useEsqueleto(() => cargando.value)
const guardando = ref(false)
const formulario = ref(false)
const errorFormulario = ref('')
// La validación compartida devuelve un mensaje; acá se ubica junto al campo que lo causó.
const CAMPO_DEL_ERROR: Record<string, 'accion' | 'resultado' | 'observacion'> = {
  'Seleccioná una acción.': 'accion',
  'Seleccioná un resultado.': 'resultado',
  'La observación no puede superar los 255 caracteres.': 'observacion',
}
const campoConError = computed(() => CAMPO_DEL_ERROR[errorFormulario.value])
const mensaje = ref('')
const deudaSeleccionada = computed(() => props.deudas.find((d) => d.id === deudaId.value))
const mensajeError = mensajeDeError
function limpiarFormulario() {
  accionId.value = null
  resultado.value = ''
  observacion.value = ''
  errorFormulario.value = ''
  formulario.value = false
}
async function cargar() {
  limpiarFormulario()
  gestiones.value = []
  acciones.value = []
  mensaje.value = ''
  emit('cantidad', null)
  // Sin deuda elegida no hay historial que pedir
  const id = deudaId.value
  if (!id) return detener()
  const respuesta = await ejecutar(
    (signal) => Promise.all([obtenerGestiones(id, signal), obtenerAccionesDisponibles(id, signal)]),
    (e) => mensajeError(e, 'No se pudieron cargar las gestiones. Intentá nuevamente.'),
  )
  if (!respuesta) return
  const [historial, disponibles] = respuesta
  gestiones.value = historial
  emit('cantidad', historial.length)
  acciones.value = disponibles
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
const fecha = fechaHora
function elegirDeuda(evento: Event) {
  const id = Number((evento.target as HTMLSelectElement).value)
  if (props.deudas.some((d) => d.id === id) && id !== deudaId.value) emit('seleccionar', id)
}
function descripcionDeuda(deuda: DeudaApi) {
  const origen = nombreOrigen(deuda.padron.origen)
  return `Padrón ${deuda.padron.numeroPadron || '—'} · CM ${deuda.padron.cm} · ${origen} · ${tributos(deuda)} · ${formatoImporte(deuda.importe)}`
}
function tributos(deuda: DeudaApi) {
  return (
    deuda.tributos.map((t) => t.descripcion || t.codigo).join(', ') || 'Sin tributos informados'
  )
}
</script>

<template>
  <section class="gestiones" aria-label="Gestiones de la deuda" :aria-busy="cargando || undefined">
    <AvisoCarga :activo="cargando" texto="Cargando gestiones" />
    <!-- Con varias deudas, se elige acá mismo cuál gestionar (no hace falta volver a la cartera) -->
    <div v-if="deudas.length > 1" class="contexto-deuda">
      <label for="gestion-deuda">Deuda / padrón</label>
      <select id="gestion-deuda" :value="deudaId ?? ''" :disabled="guardando" @change="elegirDeuda">
        <option value="" disabled>Elegí la deuda o el padrón a gestionar</option>
        <option v-for="deuda in deudas" :key="deuda.id" :value="deuda.id">
          {{ descripcionDeuda(deuda) }}
        </option>
      </select>
      <p v-if="deudaSeleccionada" class="ayuda historial-de">Historial gestiones de esta deuda</p>
    </div>
    <div v-else-if="deudaSeleccionada" class="contexto-deuda">
      <p class="ayuda">Deuda / padrón</p>
      <p>
        CM {{ deudaSeleccionada.padron.cm }} · Padrón {{ deudaSeleccionada.padron.numeroPadron }} ·
        {{ tributos(deudaSeleccionada) }}
      </p>
      <p class="ayuda">Historial gestiones de esta deuda</p>
    </div>
    <p v-if="!deudas.length" class="vacio">No hay deudas disponibles.</p>
    <p v-else-if="!deudaSeleccionada" class="vacio">
      Elegí arriba la deuda o el padrón para ver su historial y registrar gestiones.
    </p>
    <template v-else-if="cargando">
      <ol v-if="esqueleto" class="historial" aria-hidden="true">
        <li v-for="n in 3" :key="n" class="gestion">
          <div class="gestion-titulo">
            <strong><SkeletonBloque ancho="10em" /></strong>
            <span class="tributos"><SkeletonBloque ancho="7em" /></span>
          </div>
          <p class="observacion"><SkeletonBloque :ancho="['75%', '55%', '65%'][n - 1]" /></p>
          <p class="autor"><SkeletonBloque ancho="12em" /></p>
        </li>
      </ol>
    </template>
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
      <form
        v-enfocar
        v-if="formulario && puedeRegistrar"
        class="formulario"
        @submit.prevent="guardar"
      >
        <h3>Registrar nueva gestión</h3>
        <div class="campos">
          <div>
            <label for="gestion-accion" class="requerido">Acción realizada</label>
            <select
              id="gestion-accion"
              v-model="accionId"
              required
              :disabled="guardando"
              :aria-invalid="campoConError === 'accion'"
              :aria-describedby="campoConError === 'accion' ? 'gestion-error' : undefined"
            >
              <option v-for="accion in acciones" :key="accion.id" :value="accion.id">
                {{ accion.nombre }}
              </option>
            </select>
            <p
              v-if="campoConError === 'accion'"
              id="gestion-error"
              role="alert"
              class="error-campo"
            >
              {{ errorFormulario }}
            </p>
          </div>
          <div>
            <label for="gestion-resultado" class="requerido">Respuesta del contribuyente</label>
            <select
              id="gestion-resultado"
              v-model="resultado"
              required
              :disabled="guardando"
              :aria-invalid="campoConError === 'resultado'"
              :aria-describedby="campoConError === 'resultado' ? 'gestion-error' : undefined"
            >
              <option disabled value="">Seleccioná un resultado</option>
              <option v-for="opcion in resultadosGestion" :key="opcion.value" :value="opcion.value">
                {{ opcion.label }}
              </option>
            </select>
            <p
              v-if="campoConError === 'resultado'"
              id="gestion-error"
              role="alert"
              class="error-campo"
            >
              {{ errorFormulario }}
            </p>
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
          :aria-invalid="campoConError === 'observacion'"
          :aria-describedby="campoConError === 'observacion' ? 'gestion-error' : undefined"
        />
        <p class="contador">{{ observacion.length }}/255</p>
        <p
          v-if="campoConError === 'observacion'"
          id="gestion-error"
          role="alert"
          class="error-campo"
        >
          {{ errorFormulario }}
        </p>
        <p v-else-if="errorFormulario && !campoConError" role="alert" class="error">
          {{ errorFormulario }}
        </p>
        <p class="aviso-obligatorios">Los campos con * son obligatorios.</p>
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
  font-size: var(--texto-base);
}
.contexto-deuda {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.historial-de {
  margin-top: 8px;
}
label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  font-weight: 500;
}
select,
textarea {
  width: 100%;
}
textarea {
  resize: vertical;
  min-height: 95px;
}
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
  font-size: var(--texto-sm);
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
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
}
.resultado.exitosa {
  color: var(--color-temprana);
}
.resultado.rechazada {
  color: var(--color-tardia);
}
.resultado.pendiente {
  color: var(--color-inicial);
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
  /* Tantas columnas como entren (mín. 220px); una sola en móvil */
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.enlace {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
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
@media (max-width: 599px) {
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
