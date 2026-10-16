<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  actualizarTributo,
  crearTributo,
  eliminarTributo,
  obtenerTributos,
} from '../services/tributoService'
import type { Tributo } from '../services/tributoService'

const auth = useAuthStore()
const puedeEditar = computed(() => auth.tieneRol('ADMINISTRADOR'))
const formulario = ref<Tributo | null>(null)
const guardando = ref(false)
const errorFormulario = ref('')
const mensaje = ref('')
const pendienteEliminar = ref<Tributo | null>(null)
const errorEliminar = ref('')
const dialogoEliminar = ref<HTMLDialogElement | null>(null)
const tributos = ref<Tributo[]>([])
const cargando = ref(true)
const errorCarga = ref('')
let controller: AbortController | null = null
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  cargando.value = true
  errorCarga.value = ''
  try {
    const datos = await obtenerTributos(ctrl.signal)
    if (!ctrl.signal.aborted) tributos.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted)
      errorCarga.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudieron cargar los tributos.')
        : 'No se pudieron cargar los tributos.'
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
function agregar() {
  editar({ id: 0, codigo: '', descripcion: '' })
}
async function pedirEliminar(tributo: Tributo) {
  pendienteEliminar.value = tributo
  errorEliminar.value = ''
  formulario.value = null
  mensaje.value = ''
  await nextTick()
  dialogoEliminar.value?.showModal()
}
function cancelarEliminacion() {
  if (guardando.value) return
  dialogoEliminar.value?.close()
  pendienteEliminar.value = null
}
async function confirmarEliminar() {
  if (!pendienteEliminar.value || guardando.value || !puedeEditar.value) return
  const tributo = pendienteEliminar.value
  const contexto = controller
  guardando.value = true
  try {
    await eliminarTributo(tributo.id)
    if (contexto?.signal.aborted) return
    tributos.value = tributos.value.filter((t) => t.id !== tributo.id)
    dialogoEliminar.value?.close()
    pendienteEliminar.value = null
    mensaje.value = 'Tributo eliminado correctamente.'
  } catch (e) {
    if (!contexto?.signal.aborted)
      errorEliminar.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudo eliminar el tributo.')
        : 'No se pudo eliminar el tributo.'
  } finally {
    guardando.value = false
  }
}
function editar(tributo: Tributo) {
  pendienteEliminar.value = null
  formulario.value = { ...tributo }
  errorFormulario.value = ''
  mensaje.value = ''
}
function cancelar() {
  formulario.value = null
  errorFormulario.value = ''
}
async function guardar() {
  if (!puedeEditar.value || !formulario.value || guardando.value) return
  const descripcion = formulario.value.descripcion?.trim() ?? ''
  const codigo = formulario.value.codigo.trim()
  errorFormulario.value = ''
  if (!descripcion || descripcion.length > 200 || !codigo || codigo.length > 20) {
    errorFormulario.value = 'Completá el código (hasta 20 caracteres) y la descripción (hasta 200).'
    return
  }
  const contexto = controller
  guardando.value = true
  try {
    const actualizado = formulario.value.id
      ? await actualizarTributo(formulario.value.id, descripcion)
      : await crearTributo(codigo, descripcion)
    if (contexto?.signal.aborted) return
    const indice = tributos.value.findIndex((t) => t.id === actualizado.id)
    if (indice >= 0) tributos.value[indice] = actualizado
    else tributos.value.push(actualizado)
    cancelar()
    mensaje.value = 'Tributo guardado correctamente.'
  } catch (e) {
    if (!contexto?.signal.aborted)
      errorFormulario.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudo guardar la descripción.')
        : 'No se pudo guardar la descripción.'
  } finally {
    guardando.value = false
  }
}
onMounted(cargar)
onScopeDispose(() => controller?.abort())
</script>

<template>
  <section class="tributos" aria-label="Tipos de tributo">
    <header class="cabecera">
      <p class="ayuda">Catálogo de tributos del sistema.</p>
      <button
        v-if="puedeEditar && !formulario"
        type="button"
        class="primario agregar"
        :disabled="guardando"
        @click="agregar"
      >
        + Agregar tributo
      </button>
    </header>
    <p v-if="cargando" role="status" class="ayuda">Cargando tributos...</p>
    <div v-else-if="errorCarga" role="alert" class="error">
      <p>{{ errorCarga }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
      <form v-if="formulario && puedeEditar" class="formulario" @submit.prevent="guardar">
        <h3>{{ formulario.id ? `Editar tributo ${formulario.codigo}` : 'Agregar tributo' }}</h3>
        <template v-if="!formulario.id"
          ><label for="tributo-codigo">Código</label
          ><input
            id="tributo-codigo"
            v-model="formulario.codigo"
            required
            maxlength="20"
            :disabled="guardando"
        /></template>
        <label for="tributo-descripcion">Descripción</label>
        <input
          id="tributo-descripcion"
          v-model="formulario.descripcion"
          required
          maxlength="200"
          :disabled="guardando"
        />
        <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
        <div class="botones">
          <button class="secundario" type="button" :disabled="guardando" @click="cancelar">
            Cancelar</button
          ><button class="primario" type="submit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar tributo' }}
          </button>
        </div>
      </form>
      <div v-if="tributos.length" class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Origen</th>
              <th scope="col">Descripción</th>
              <th v-if="puedeEditar" scope="col"><span class="sr-only">Opciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tributo in tributos" :key="tributo.id">
              <td class="codigo">{{ tributo.codigo }}</td>
              <td>{{ tributo.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }}</td>
              <td :class="{ 'sin-descripcion': !tributo.descripcion }">
                {{ tributo.descripcion || 'Sin descripción' }}
              </td>
              <td v-if="puedeEditar">
                <button
                  type="button"
                  class="enlace editar"
                  :disabled="guardando"
                  :aria-label="`Editar tributo ${tributo.codigo}`"
                  @click="editar(tributo)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="enlace eliminar"
                  :disabled="guardando"
                  :aria-label="`Eliminar tributo ${tributo.codigo}`"
                  @click="pedirEliminar(tributo)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="ayuda">No hay tributos registrados.</p>
      <dialog
        ref="dialogoEliminar"
        class="modal-eliminar"
        aria-labelledby="eliminar-tributo-titulo"
        aria-describedby="eliminar-tributo-descripcion"
        @cancel.prevent="cancelarEliminacion"
        @close="pendienteEliminar = null"
      >
        <template v-if="pendienteEliminar">
          <h3 id="eliminar-tributo-titulo">Eliminar tributo {{ pendienteEliminar.codigo }}</h3>
          <p v-if="pendienteEliminar.descripcion" class="ayuda">
            {{ pendienteEliminar.descripcion }}
          </p>
          <p id="eliminar-tributo-descripcion">¿Querés eliminar este tributo del catálogo?</p>
          <p v-if="errorEliminar" role="alert" class="error">{{ errorEliminar }}</p>
          <div class="botones">
            <button
              class="secundario"
              type="button"
              autofocus
              :disabled="guardando"
              @click="cancelarEliminacion"
            >
              Cancelar
            </button>
            <button
              class="primario confirmar-eliminar"
              type="button"
              :disabled="guardando"
              @click="confirmarEliminar"
            >
              {{ guardando ? 'Eliminando...' : 'Eliminar tributo' }}
            </button>
          </div>
        </template>
      </dialog>
    </template>
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
.eliminar {
  margin-left: 14px;
}
#tributo-codigo {
  margin-bottom: 16px;
}
.tributos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  font-size: 13px;
}
.ayuda {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
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
tbody tr:hover {
  background: var(--color-surface-secondary);
}
td {
  overflow-wrap: anywhere;
}
.codigo {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  width: 120px;
}
.sin-descripcion {
  color: var(--color-text-secondary);
}
.error {
  color: var(--color-tardia);
}
.secundario {
  padding: 9px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}
.enlace {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
}
.modal-eliminar {
  position: fixed;
  inset: 0;
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  overflow-y: auto;
}
.modal-eliminar::backdrop {
  background: rgb(16 24 40 / 45%);
}
.modal-eliminar h3 {
  margin-bottom: 12px;
}
.modal-eliminar .ayuda {
  overflow-wrap: anywhere;
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
label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
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
.primario {
  padding: 9px 14px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  font-size: 13px;
}
.confirmacion {
  margin: 0;
  color: var(--color-temprana);
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 600px) {
  th,
  td {
    padding: 10px 12px;
  }
  .codigo {
    width: 85px;
  }
}
</style>
