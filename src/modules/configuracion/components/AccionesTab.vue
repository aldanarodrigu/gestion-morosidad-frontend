<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import { isAxiosError } from 'axios'
import {
  cambiarEstadoAccion,
  obtenerAcciones,
  obtenerSegmentosAccion,
  crearAccion,
} from '../services/accionService'
import type { SegmentoMora } from '../services/periodoMoraService'
import type { Accion } from '../services/accionService'

const auth = useAuthStore()
const puedeAdministrar = computed(() => auth.tieneRol('ADMINISTRADOR'))
const guardando = ref(new Set<number>())
const erroresEstado = ref<Record<number, string>>({})
const acciones = ref<Accion[]>([])
const cargando = ref(true)
const error = ref('')
const formulario = ref(false)
const nombreNuevo = ref('')
const segmentoId = ref<number | null>(null)
const segmentos = ref<SegmentoMora[]>([])
const cargandoSegmentos = ref(false)
const creando = ref(false)
const errorFormulario = ref('')
const errorSegmentos = ref('')
const mensaje = ref('')
let segmentosController: AbortController | null = null
let controller: AbortController | null = null
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  cargando.value = true
  error.value = ''
  try {
    const datos = await obtenerAcciones(ctrl.signal)
    if (!ctrl.signal.aborted) acciones.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted)
      error.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudieron cargar las acciones.')
        : 'No se pudieron cargar las acciones.'
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
async function cambiarEstado(accion: Accion) {
  if (!puedeAdministrar.value || guardando.value.has(accion.id)) return
  const contexto = controller
  guardando.value.add(accion.id)
  delete erroresEstado.value[accion.id]
  try {
    const actualizada = await cambiarEstadoAccion(accion.id, !accion.activo)
    if (controller !== contexto || contexto?.signal.aborted) return
    const indice = acciones.value.findIndex((a) => a.id === accion.id)
    if (indice >= 0) acciones.value[indice] = actualizada
  } catch (e) {
    if (controller === contexto && !contexto?.signal.aborted)
      erroresEstado.value[accion.id] = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudo cambiar el estado. Intentá nuevamente.')
        : 'No se pudo cambiar el estado. Intentá nuevamente.'
  } finally {
    guardando.value.delete(accion.id)
  }
}
async function cargarSegmentos() {
  segmentosController?.abort()
  const ctrl = new AbortController()
  segmentosController = ctrl
  cargandoSegmentos.value = true
  errorSegmentos.value = ''
  try {
    const datos = await obtenerSegmentosAccion(ctrl.signal)
    if (!ctrl.signal.aborted) segmentos.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted) errorSegmentos.value = 'No se pudieron cargar los segmentos de mora.'
  } finally {
    if (segmentosController === ctrl) cargandoSegmentos.value = false
  }
}
function abrirFormulario() {
  if (!puedeAdministrar.value || creando.value) return
  nombreNuevo.value = ''
  segmentoId.value = null
  errorFormulario.value = ''
  mensaje.value = ''
  formulario.value = true
  cargarSegmentos()
}
function cancelarCreacion() {
  if (creando.value) return
  segmentosController?.abort()
  formulario.value = false
  nombreNuevo.value = ''
  segmentoId.value = null
  errorFormulario.value = ''
}
async function guardarNueva() {
  if (!puedeAdministrar.value || creando.value) return
  const nombre = nombreNuevo.value.trim()
  errorFormulario.value = ''
  if (!nombre || nombre.length > 100 || !segmentos.value.some((s) => s.id === segmentoId.value)) {
    errorFormulario.value = 'Ingresá un nombre de hasta 100 caracteres y elegí un segmento de mora.'
    return
  }
  const contexto = controller
  creando.value = true
  try {
    const nueva = await crearAccion(nombre, segmentoId.value!)
    if (contexto?.signal.aborted) return
    acciones.value.push(nueva)
    formulario.value = false
    nombreNuevo.value = ''
    segmentoId.value = null
    mensaje.value = 'Acción creada correctamente.'
  } catch (e) {
    if (!contexto?.signal.aborted)
      errorFormulario.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudo crear la acción.')
        : 'No se pudo crear la acción.'
  } finally {
    creando.value = false
  }
}
onMounted(cargar)
onScopeDispose(() => {
  controller?.abort()
  segmentosController?.abort()
})
</script>

<template>
  <section class="acciones" aria-label="Catálogo de acciones">
    <header class="cabecera">
      <p class="descripcion">Catálogo de acciones de cobranza para registrar gestiones.</p>
      <button
        v-if="puedeAdministrar && !formulario && !cargando && !error"
        class="primario agregar"
        type="button"
        @click="abrirFormulario"
      >
        + Crear acción
      </button>
    </header>
    <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
    <form v-if="formulario && puedeAdministrar" class="formulario" @submit.prevent="guardarNueva">
      <h3>Crear acción</h3>
      <fieldset :disabled="creando">
        <div class="campos">
          <div>
            <label for="accion-nombre">Nombre</label
            ><input id="accion-nombre" v-model="nombreNuevo" required maxlength="100" />
          </div>
          <div>
            <label for="accion-segmento">Segmento de mora</label>
            <select
              id="accion-segmento"
              v-model="segmentoId"
              required
              :disabled="cargandoSegmentos || !!errorSegmentos"
            >
              <option :value="null" disabled>Elegí un segmento</option>
              <option v-for="segmento in segmentos" :key="segmento.id" :value="segmento.id">
                {{ segmento.nombre }}
              </option>
            </select>
          </div>
        </div>
      </fieldset>
      <p v-if="cargandoSegmentos" role="status" class="ayuda">Cargando segmentos...</p>
      <div v-else-if="errorSegmentos" role="alert" class="error">
        <p>{{ errorSegmentos }}</p>
        <button type="button" class="secundario" @click="cargarSegmentos">Reintentar</button>
      </div>
      <p v-else-if="!segmentos.length" class="ayuda">No hay segmentos de mora disponibles.</p>
      <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
      <div class="botones">
        <button type="button" class="secundario" :disabled="creando" @click="cancelarCreacion">
          Cancelar</button
        ><button
          type="submit"
          class="primario"
          :disabled="creando || cargandoSegmentos || !!errorSegmentos || !segmentos.length"
        >
          {{ creando ? 'Guardando...' : 'Crear acción' }}
        </button>
      </div>
    </form>
    <p v-if="cargando" role="status" class="ayuda">Cargando acciones...</p>
    <div v-else-if="error" role="alert" class="error">
      <p>{{ error }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <p v-else-if="!acciones.length" class="ayuda">No hay acciones registradas.</p>
    <ul v-else class="lista">
      <li v-for="accion in acciones" :key="accion.id" class="accion">
        <div class="informacion">
          <div class="titulo">
            <span class="nombre">{{ accion.nombre }}</span>
            <span class="estado" :class="{ inactiva: !accion.activo }">
              {{ accion.activo ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          <p v-if="accion.segmentos?.length" class="mora">
            {{ accion.segmentos.map((s) => s.nombre).join(' · ') }}
          </p>
          <p v-if="erroresEstado[accion.id]" role="alert" class="error-estado">
            {{ erroresEstado[accion.id] }}
          </p>
          <span v-if="guardando.has(accion.id)" role="status" class="ayuda">Guardando...</span>
        </div>
        <button
          type="button"
          role="switch"
          class="interruptor"
          :class="{ encendido: accion.activo }"
          :aria-checked="accion.activo"
          :aria-label="`Estado de ${accion.nombre}`"
          :disabled="!puedeAdministrar || guardando.has(accion.id)"
          :title="
            puedeAdministrar
              ? accion.activo
                ? 'Desactivar acción'
                : 'Activar acción'
              : 'Solo administradores pueden cambiar el estado'
          "
          @click="cambiarEstado(accion)"
        >
          <span class="perilla" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.formulario {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
h3 {
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 500;
}
fieldset {
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
.campos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
input,
select {
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
.primario {
  padding: 9px 14px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
}
.confirmacion {
  margin: 0;
  color: var(--color-temprana);
}
.mora {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
@media (max-width: 600px) {
  .campos {
    grid-template-columns: 1fr;
  }
}
.acciones {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  font-size: 13px;
}
.descripcion,
.ayuda {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 0;
}
.lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.accion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.informacion {
  min-width: 0;
}
.titulo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.error-estado {
  margin: 8px 0 0;
  color: var(--color-tardia);
  font-size: 12px;
}
.nombre {
  color: var(--color-text);
  font-weight: 500;
  overflow-wrap: anywhere;
  min-width: 0;
}
.estado {
  color: var(--color-primary);
  font-size: 12px;
  flex-shrink: 0;
}
.estado.inactiva {
  color: var(--color-text-secondary);
}
.error {
  color: var(--color-tardia);
}
.error p {
  margin: 0 0 12px;
}
.secundario {
  padding: 9px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}
.interruptor {
  position: relative;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: var(--color-text-light);
  transition: background-color 0.15s;
}
.interruptor.encendido {
  background: var(--color-primary);
}
.perilla {
  display: block;
  width: 14px;
  height: 14px;
  position: absolute;
  top: 2px;
  left: 2px;
  border-radius: 50%;
  background: white;
  transition: transform 0.15s;
}
.encendido .perilla {
  transform: translateX(16px);
}
.interruptor:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: reduce) {
  .interruptor,
  .perilla {
    transition: none;
  }
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
