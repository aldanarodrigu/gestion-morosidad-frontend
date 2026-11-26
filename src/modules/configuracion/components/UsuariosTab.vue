<script setup lang="ts">
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onMounted, onScopeDispose, ref, reactive } from 'vue'
import { isAxiosError } from 'axios'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import RestablecerPasswordPanel from './RestablecerPasswordPanel.vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import {
  PASSWORD_MIN_CARACTERES,
  validarLongitudPassword,
} from '@/modules/autenticacion/utils/password'
import {
  actualizarUsuario,
  crearUsuario,
  obtenerUsuarios,
  rolesDisponibles,
} from '../services/usuarioService'
import type { Usuario, Rol } from '../services/usuarioService'

const auth = useAuthStore()
const puedeAdministrar = computed(() => auth.tieneRol('ADMINISTRADOR'))
const usuarios = ref<Usuario[]>([])
const cargando = ref(false)
const esqueleto = useEsqueleto(() => cargando.value)
const errorCarga = ref('')
const guardando = ref(false)
const errorFormulario = ref('')
const errorPassword = ref('')
const errores = reactive<{ username?: string; roles?: string }>({})
const mensaje = ref('')
const usuarioParaReset = ref<Usuario | null>(null)
const formulario = ref<{
  id?: number
  username: string
  password: string
  roles: Rol[]
  activo: boolean
} | null>(null)
function errorApi(e: unknown, defecto: string) {
  return isAxiosError<{ mensaje?: string }>(e) ? (e.response?.data?.mensaje ?? defecto) : defecto
}
let controller: AbortController | null = null
async function cargar() {
  if (!puedeAdministrar.value) return
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  cargando.value = true
  errorCarga.value = ''
  try {
    const datos = await obtenerUsuarios(ctrl.signal)
    if (!ctrl.signal.aborted) usuarios.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted) errorCarga.value = errorApi(e, 'No se pudieron cargar los usuarios.')
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
onScopeDispose(() => controller?.abort())
onMounted(cargar)
function abrir(usuario?: Usuario) {
  errores.username = errores.roles = undefined
  formulario.value = usuario
    ? { ...usuario, roles: [...usuario.roles], password: '' }
    : { username: '', password: '', roles: [], activo: true }
  errorFormulario.value = ''
  errorPassword.value = ''
  mensaje.value = ''
}
function cancelar() {
  formulario.value = null
  errorFormulario.value = ''
  errorPassword.value = ''
}
async function guardar() {
  if (guardando.value || !formulario.value || !puedeAdministrar.value) return
  const datos = formulario.value
  const username = datos.username.trim()
  errorFormulario.value = ''
  errorPassword.value = ''
  errores.username = username ? undefined : 'Ingresá el nombre de usuario.'
  errores.roles = datos.roles.length ? undefined : 'Seleccioná al menos un rol.'
  if (errores.username || errores.roles) return
  if (!datos.id) {
    const errorLongitud = validarLongitudPassword(datos.password)
    if (errorLongitud) {
      errorPassword.value = errorLongitud
      return
    }
  }
  const contexto = controller
  guardando.value = true
  try {
    const usuario = datos.id
      ? await actualizarUsuario(datos.id, { username, roles: datos.roles, activo: datos.activo })
      : await crearUsuario({ username, password: datos.password, roles: datos.roles })
    if (contexto?.signal.aborted) return
    const indice = usuarios.value.findIndex((u) => u.id === usuario.id)
    if (indice < 0) usuarios.value.push(usuario)
    else usuarios.value[indice] = usuario
    cancelar()
    mensaje.value = 'Usuario guardado correctamente.'
    if (auth.user?.id === usuario.id) {
      auth.user = { id: usuario.id, username: usuario.username, roles: usuario.roles }
      localStorage.setItem('user', JSON.stringify(auth.user))
      if (!usuario.activo) {
        auth.logout()
        window.location.href = '/login'
      }
    }
  } catch (e) {
    if (!contexto?.signal.aborted) {
      const errorCampo = isAxiosError<{ errores?: Record<string, string> }>(e)
        ? e.response?.data?.errores?.password
        : undefined
      if (errorCampo) errorPassword.value = errorCampo
      else errorFormulario.value = errorApi(e, 'No se pudo guardar el usuario.')
    }
  } finally {
    guardando.value = false
  }
}
function nombresRoles(roles: Rol[]) {
  return rolesDisponibles
    .filter((r) => roles.includes(r.value))
    .map((r) => r.label)
    .join(' · ')
}
</script>

<template>
  <section class="usuarios" aria-label="Administración de usuarios">
    <p v-if="!puedeAdministrar" class="ayuda">
      Solo los administradores pueden administrar usuarios.
    </p>
    <template v-else>
      <header class="cabecera">
        <p class="ayuda">
          Usuarios del sistema y sus roles. Cada cuenta puede tener uno o varios roles.
        </p>
        <button
          v-if="!formulario && !usuarioParaReset"
          type="button"
          class="primario"
          @click="abrir()"
        >
          + Crear usuario
        </button>
      </header>
      <AvisoCarga :activo="cargando" texto="Cargando usuarios" />
      <div v-if="esqueleto" class="tabla-contenedor" aria-hidden="true">
        <table class="tabla-datos">
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Roles</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Opciones</span></th>
            </tr>
          </thead>
          <tbody>
            <SkeletonFilas :columnas="4" :filas="5" :anchos="['7em', '10em', '4em', '12em']" />
          </tbody>
        </table>
      </div>
      <template v-else-if="cargando" />
      <div v-else-if="errorCarga" role="alert" class="error">
        <p>{{ errorCarga }}</p>
        <button class="secundario" type="button" @click="cargar">Reintentar</button>
      </div>
      <template v-else>
        <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
        <form v-enfocar v-if="formulario" class="formulario" @submit.prevent="guardar">
          <h3>{{ formulario.id ? 'Editar usuario' : 'Crear usuario' }}</h3>
          <fieldset :disabled="guardando">
            <div class="campos">
              <div>
                <label for="usuario-nombre" class="requerido">Nombre de usuario</label
                ><input
                  id="usuario-nombre"
                  v-model="formulario.username"
                  :readonly="!!formulario.id"
                  autocomplete="off"
                  required
                  maxlength="255"
                  :aria-invalid="!!errores.username"
                  :aria-describedby="errores.username ? 'usuario-nombre-error' : undefined"
                />
                <p
                  v-if="errores.username"
                  id="usuario-nombre-error"
                  role="alert"
                  class="error-campo"
                >
                  {{ errores.username }}
                </p>
              </div>
              <div v-if="!formulario.id">
                <label for="usuario-password" class="requerido">Contraseña temporal</label
                ><input
                  id="usuario-password"
                  v-model="formulario.password"
                  type="password"
                  autocomplete="new-password"
                  required
                  :minlength="PASSWORD_MIN_CARACTERES"
                  maxlength="72"
                  aria-describedby="usuario-password-ayuda"
                  :aria-invalid="!!errorPassword"
                />
                <p id="usuario-password-ayuda" class="ayuda-campo">
                  Al menos {{ PASSWORD_MIN_CARACTERES }} caracteres. Es temporal: el usuario la
                  cambia en su primer ingreso y vence en 24 h.
                </p>
                <p v-if="errorPassword" role="alert" class="error ayuda-campo">
                  {{ errorPassword }}
                </p>
              </div>
            </div>
            <fieldset
              class="roles"
              :aria-invalid="!!errores.roles"
              :aria-describedby="errores.roles ? 'usuario-roles-error' : undefined"
            >
              <legend class="requerido">Roles (al menos uno)</legend>
              <label v-for="rol in rolesDisponibles" :key="rol.value" class="opcion"
                ><input
                  v-model="formulario.roles"
                  type="checkbox"
                  :value="rol.value"
                  :data-rol="rol.value"
                />{{ rol.label }}</label
              >
              <p v-if="errores.roles" id="usuario-roles-error" role="alert" class="error-campo">
                {{ errores.roles }}
              </p>
            </fieldset>
            <p class="aviso-obligatorios">Los campos con * son obligatorios.</p>
            <label v-if="formulario.id" class="opcion"
              ><input id="usuario-activo" v-model="formulario.activo" type="checkbox" />Usuario
              activo</label
            >
          </fieldset>
          <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
          <div class="botones">
            <button class="secundario" type="button" :disabled="guardando" @click="cancelar">
              Cancelar</button
            ><button class="primario" type="submit" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar usuario' }}
            </button>
          </div>
        </form>
        <RestablecerPasswordPanel
          v-if="usuarioParaReset"
          :usuario="usuarioParaReset"
          @cerrar="usuarioParaReset = null"
        />
        <div v-if="usuarios.length" class="tabla-contenedor">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Roles</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="sr-only">Opciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="usuario in usuarios" :key="usuario.id">
                <td class="nombre">{{ usuario.username }}</td>
                <td>{{ nombresRoles(usuario.roles) }}</td>
                <td class="estado" :class="{ inactivo: !usuario.activo }">
                  {{ usuario.activo ? 'Activo' : 'Inactivo' }}
                </td>
                <td>
                  <button
                    type="button"
                    class="enlace editar"
                    :disabled="guardando || !!usuarioParaReset"
                    :aria-label="`Editar ${usuario.username}`"
                    @click="abrir(usuario)"
                  >
                    Editar
                  </button>
                  <template v-if="usuario.id !== auth.user?.id">
                    <span class="separador-acciones" aria-hidden="true">·</span>
                    <button
                      type="button"
                      class="enlace reset-password"
                      :disabled="guardando || !!formulario || !!usuarioParaReset"
                      :aria-label="`Restablecer contraseña de ${usuario.username}`"
                      @click="usuarioParaReset = usuario"
                    >
                      Restablecer contraseña
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="ayuda">No hay usuarios registrados.</p>
      </template>
    </template>
  </section>
</template>

<style scoped>
.usuarios {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  font-size: var(--texto-base);
}
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}
.ayuda {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  margin: 0;
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
.nombre {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.estado {
  color: var(--color-primary);
}
.estado.inactivo {
  color: var(--color-text-secondary);
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
  margin: 0 0 20px;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.campos {
  display: grid;
  /* Tantas columnas como entren (mín. 220px); una sola en móvil */
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-md);
}
label,
legend {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
label {
  display: block;
  margin-bottom: 6px;
}
input:not([type='checkbox']) {
  width: 100%;
}
input[readonly] {
  background: var(--color-background);
}
.roles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin: 20px 0;
}
legend {
  margin-bottom: 10px;
}
.opcion {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.separador-acciones {
  margin-inline: var(--spacing-xs);
  color: var(--color-text-secondary);
}
.enlace {
  padding: 0;
  border: 0;
  color: var(--color-primary);
  background: none;
}
.ayuda-campo {
  margin: 4px 0 0;
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
  max-width: 32ch;
}
.error.ayuda-campo {
  color: var(--color-tardia);
}
.confirmacion {
  color: var(--color-temprana);
  margin: 0;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 599px) {
  .campos {
    grid-template-columns: 1fr;
  }
  .cabecera {
    flex-wrap: wrap;
  }
  .formulario {
    padding: var(--spacing-md);
  }
}
</style>
