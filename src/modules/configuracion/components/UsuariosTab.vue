<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
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
const guardando = ref(false)
const errorCarga = ref('')
const errorFormulario = ref('')
const mensaje = ref('')
const formulario = ref<{
  id?: number
  username: string
  password: string
  roles: Rol[]
  activo: boolean
} | null>(null)
let controller: AbortController | null = null
function errorApi(e: unknown, defecto: string) {
  return isAxiosError<{ mensaje?: string }>(e) ? (e.response?.data?.mensaje ?? defecto) : defecto
}
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
onMounted(cargar)
onScopeDispose(() => controller?.abort())
function abrir(usuario?: Usuario) {
  formulario.value = usuario
    ? { ...usuario, roles: [...usuario.roles], password: '' }
    : { username: '', password: '', roles: [], activo: true }
  errorFormulario.value = ''
  mensaje.value = ''
}
function cancelar() {
  formulario.value = null
  errorFormulario.value = ''
}
async function guardar() {
  if (guardando.value || !formulario.value || !puedeAdministrar.value) return
  const datos = formulario.value
  const username = datos.username.trim()
  errorFormulario.value = ''
  if (!username || !datos.roles.length) {
    errorFormulario.value = 'Ingresá el nombre de usuario y seleccioná al menos un rol.'
    return
  }
  if (!datos.id && (datos.password.length < 8 || datos.password.length > 72)) {
    errorFormulario.value = 'La contraseña debe tener entre 8 y 72 caracteres.'
    return
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
    if (!contexto?.signal.aborted)
      errorFormulario.value = errorApi(e, 'No se pudo guardar el usuario.')
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
        <button v-if="!formulario" type="button" class="primario" @click="abrir()">
          + Crear usuario
        </button>
      </header>
      <p v-if="cargando" role="status" class="ayuda">Cargando usuarios...</p>
      <div v-else-if="errorCarga" role="alert" class="error">
        <p>{{ errorCarga }}</p>
        <button class="secundario" type="button" @click="cargar">Reintentar</button>
      </div>
      <template v-else>
        <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
        <form v-if="formulario" class="formulario" @submit.prevent="guardar">
          <h3>{{ formulario.id ? 'Editar usuario' : 'Crear usuario' }}</h3>
          <fieldset :disabled="guardando">
            <div class="campos">
              <div>
                <label for="usuario-nombre">Nombre de usuario</label
                ><input
                  id="usuario-nombre"
                  v-model="formulario.username"
                  :readonly="!!formulario.id"
                  autocomplete="off"
                  required
                  maxlength="255"
                />
              </div>
              <div v-if="!formulario.id">
                <label for="usuario-password">Contraseña inicial</label
                ><input
                  id="usuario-password"
                  v-model="formulario.password"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  maxlength="72"
                />
              </div>
            </div>
            <fieldset class="roles">
              <legend>Roles (al menos uno)</legend>
              <label v-for="rol in rolesDisponibles" :key="rol.value" class="opcion"
                ><input
                  v-model="formulario.roles"
                  type="checkbox"
                  :value="rol.value"
                  :data-rol="rol.value"
                />{{ rol.label }}</label
              >
            </fieldset>
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
        <div v-if="usuarios.length" class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Estado</th>
                <th><span class="sr-only">Opciones</span></th>
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
                    :disabled="guardando"
                    :aria-label="`Editar ${usuario.username}`"
                    @click="abrir(usuario)"
                  >
                    Editar
                  </button>
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
  font-size: 13px;
}
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
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
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}
label,
legend {
  color: var(--color-text-secondary);
  font-size: 12px;
}
label {
  display: block;
  margin-bottom: 6px;
}
input:not([type='checkbox']) {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
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
button {
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.primario {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  font-weight: 600;
  white-space: nowrap;
}
.primario:hover {
  background: var(--color-primary-dark);
}
.secundario {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.enlace {
  padding: 0;
  border: 0;
  color: var(--color-primary);
  background: none;
}
.error {
  color: var(--color-tardia);
}
.confirmacion {
  color: var(--color-temprana);
  margin: 0;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 600px) {
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
