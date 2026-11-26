<script setup lang="ts">
import DialogoConfirmacion from '@/shared/components/DialogoConfirmacion.vue'
import PaginacionTabla from '@/shared/components/PaginacionTabla.vue'
import { origen as nombreOrigen } from '@/shared/utils/formato'
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  actualizarTributo,
  crearTributo,
  eliminarTributo,
  obtenerTributosPaginados,
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
const errores = reactive<{ codigo?: string; descripcion?: string }>({})
const tributos = ref<Tributo[]>([])
const cargando = ref(true)
const esqueleto = useEsqueleto(() => cargando.value)
// Hasta la primera respuesta no hay total que mostrar
const primeraCarga = ref(true)
watch(cargando, (activo) => {
  if (!activo) primeraCarga.value = false
})
const errorCarga = ref('')
const busqueda = ref('')
const origen = ref('')
const pagina = ref(0)
const totalElementos = ref(0)
const totalPaginas = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
function cambiarPagina(nueva: number) {
  if (guardando.value || cargando.value || nueva < 0 || nueva >= totalPaginas.value) return
  pagina.value = nueva
  cargar()
}
function limpiarFiltros() {
  busqueda.value = ''
  origen.value = ''
}
function programarCarga(demora: number) {
  clearTimeout(timer)
  controller?.abort()
  pagina.value = 0
  timer = setTimeout(cargar, demora)
}
watch(busqueda, () => programarCarga(300))
watch(origen, () => programarCarga(0))
let controller: AbortController | null = null
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  cargando.value = true
  errorCarga.value = ''
  try {
    const datos = await obtenerTributosPaginados(
      pagina.value,
      { busqueda: busqueda.value, origen: origen.value },
      ctrl.signal,
    )
    if (ctrl.signal.aborted) return
    totalElementos.value = datos.totalElementos
    totalPaginas.value = datos.totalPaginas
    if (pagina.value > 0 && pagina.value >= datos.totalPaginas) {
      pagina.value = Math.max(0, datos.totalPaginas - 1)
      return cargar()
    }
    tributos.value = datos.contenido
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
function pedirEliminar(tributo: Tributo) {
  pendienteEliminar.value = tributo
  errorEliminar.value = ''
  formulario.value = null
  mensaje.value = ''
}
function cancelarEliminacion() {
  if (guardando.value) return
  pendienteEliminar.value = null
}
async function confirmarEliminar() {
  if (!pendienteEliminar.value || guardando.value || !puedeEditar.value) return
  const tributo = pendienteEliminar.value
  clearTimeout(timer)
  const contexto = controller
  guardando.value = true
  try {
    await eliminarTributo(tributo.id)
    if (contexto?.signal.aborted) return
    pendienteEliminar.value = null
    mensaje.value = 'Tributo eliminado correctamente.'
    await cargar()
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
  errores.codigo = errores.descripcion = undefined
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
  errores.codigo =
    !codigo || codigo.length > 20 ? 'Completá el código (hasta 20 caracteres).' : undefined
  errores.descripcion =
    !descripcion || descripcion.length > 200
      ? 'Completá la descripción (hasta 200 caracteres).'
      : undefined
  if (errores.codigo || errores.descripcion) return
  clearTimeout(timer)
  const contexto = controller
  guardando.value = true
  try {
    if (formulario.value.id) await actualizarTributo(formulario.value.id, descripcion)
    else await crearTributo(codigo, descripcion)
    if (contexto?.signal.aborted) return
    cancelar()
    mensaje.value = 'Tributo guardado correctamente.'
    await cargar()
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
onScopeDispose(() => {
  clearTimeout(timer)
  controller?.abort()
})
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
    <div class="filtros-catalogo" role="search" aria-label="Buscar tributos">
      <label
        >Buscar por código o descripción<input
          v-model="busqueda"
          type="search"
          placeholder="Ej.: 2800 o contribución"
          :disabled="guardando"
      /></label>
      <label
        >Origen<select v-model="origen" :disabled="guardando">
          <option value="">Todos los orígenes</option>
          <option value="INTENDENCIA">Intendencia</option>
          <option value="SUCIVE">SUCIVE</option>
        </select></label
      >
      <button
        type="button"
        class="secundario"
        :disabled="guardando || (!busqueda && !origen)"
        @click="limpiarFiltros"
      >
        Limpiar filtros
      </button>
    </div>
    <AvisoCarga :activo="cargando" texto="Cargando tributos" />
    <div v-if="errorCarga && !cargando" role="alert" class="error">
      <p>{{ errorCarga }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
      <form v-enfocar v-if="formulario && puedeEditar" class="formulario" @submit.prevent="guardar">
        <h3>{{ formulario.id ? `Editar tributo ${formulario.codigo}` : 'Agregar tributo' }}</h3>
        <template v-if="!formulario.id"
          ><label for="tributo-codigo" class="requerido">Código</label
          ><input
            id="tributo-codigo"
            v-model="formulario.codigo"
            required
            maxlength="20"
            :disabled="guardando"
            :aria-invalid="!!errores.codigo"
            :aria-describedby="errores.codigo ? 'tributo-codigo-error' : undefined"
          />
          <p v-if="errores.codigo" id="tributo-codigo-error" role="alert" class="error-campo">
            {{ errores.codigo }}
          </p></template
        >
        <label for="tributo-descripcion" class="requerido">Descripción</label>
        <input
          id="tributo-descripcion"
          v-model="formulario.descripcion"
          required
          maxlength="200"
          :disabled="guardando"
          :aria-invalid="!!errores.descripcion"
          :aria-describedby="errores.descripcion ? 'tributo-descripcion-error' : undefined"
        />
        <p
          v-if="errores.descripcion"
          id="tributo-descripcion-error"
          role="alert"
          class="error-campo"
        >
          {{ errores.descripcion }}
        </p>
        <p class="aviso-obligatorios">Los campos con * son obligatorios.</p>
        <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
        <div class="botones">
          <button class="secundario" type="button" :disabled="guardando" @click="cancelar">
            Cancelar</button
          ><button class="primario" type="submit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar tributo' }}
          </button>
        </div>
      </form>
      <p class="ayuda resultados-catalogo" aria-live="polite">
        <SkeletonBloque v-if="primeraCarga" ancho="9em" /><template v-else
          >{{ totalElementos }}
          {{ totalElementos === 1 ? 'tributo encontrado' : 'tributos encontrados' }}</template
        >
      </p>
      <div
        v-if="tributos.length || esqueleto"
        class="tabla-contenedor"
        :aria-busy="cargando || undefined"
      >
        <table class="tabla-datos">
          <thead>
            <tr>
              <th scope="col">Origen</th>
              <th scope="col">Código</th>
              <th scope="col">Descripción</th>
              <th v-if="puedeEditar" scope="col"><span class="sr-only">Opciones</span></th>
            </tr>
          </thead>
          <tbody>
            <SkeletonFilas
              v-if="esqueleto"
              :columnas="puedeEditar ? 4 : 3"
              :filas="20"
              :anchos="['6em', '4em', '16em', '8em']"
            />
            <template v-else>
              <tr v-for="tributo in tributos" :key="tributo.id">
                <td class="origen-tributo">{{ nombreOrigen(tributo.origen) }}</td>
                <td class="codigo">{{ tributo.codigo }}</td>
                <td :class="{ 'sin-descripcion': !tributo.descripcion }">
                  <span
                    class="descripcion-tributo"
                    :title="tributo.descripcion || 'Sin descripción'"
                    >{{ tributo.descripcion || 'Sin descripción' }}</span
                  >
                </td>
                <td v-if="puedeEditar" class="acciones-tributo">
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
            </template>
          </tbody>
        </table>
      </div>
      <p v-else-if="!cargando" class="ayuda">
        {{
          busqueda || origen
            ? 'No hay tributos que coincidan con estos filtros.'
            : 'No hay tributos registrados.'
        }}
      </p>
      <PaginacionTabla
        v-if="totalElementos"
        class="paginacion-catalogo"
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :total-elementos="totalElementos"
        :tamanio="20"
        :tamanios="[20]"
        elementos="tributos"
        :deshabilitado="guardando || cargando"
        @cambiar-pagina="cambiarPagina"
      />
      <DialogoConfirmacion
        :abierto="!!pendienteEliminar"
        :titulo="`Eliminar tributo ${pendienteEliminar?.codigo ?? ''}`"
        texto-confirmar="Eliminar tributo"
        texto-procesando="Eliminando..."
        :procesando="guardando"
        :error="errorEliminar"
        clase-confirmar="confirmar-eliminar"
        @confirmar="confirmarEliminar"
        @cancelar="cancelarEliminacion"
      >
        <p v-if="pendienteEliminar?.descripcion" class="ayuda">
          {{ pendienteEliminar.descripcion }}
        </p>
        <p>¿Querés eliminar este tributo del catálogo?</p>
      </DialogoConfirmacion>
    </template>
  </section>
</template>

<style scoped>
.filtros-catalogo {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
}
.filtros-catalogo label {
  margin: 0;
}
.filtros-catalogo input,
.filtros-catalogo select {
  margin-top: 6px;
}
.filtros-catalogo select {
  width: 100%;
}
.descripcion-tributo {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  max-width: 55ch;
}
.origen-tributo,
.acciones-tributo {
  white-space: nowrap;
}
.paginacion-catalogo {
  padding-inline: 0;
}
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
  font-size: var(--texto-base);
}
.ayuda {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
.tabla-contenedor {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
/* Tabla: estilo común .tabla-datos (main.css) */
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
.enlace {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--texto-base);
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
  font-size: var(--texto-sm);
}
input {
  width: 100%;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.confirmacion {
  margin: 0;
  color: var(--color-temprana);
}
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 599px) {
  .filtros-catalogo {
    grid-template-columns: 1fr;
  }
  th,
  td {
    padding: 10px 12px;
  }
  .codigo {
    width: 85px;
  }
}
</style>
