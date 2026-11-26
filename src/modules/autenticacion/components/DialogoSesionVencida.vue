<script setup lang="ts">
/**
 * Se abre sobre la pantalla actual cuando la sesión vence. Pide la contraseña del mismo usuario
 * y, al ingresar, la pantalla queda como estaba (formularios, filtros, página). No se puede cerrar
 * con Escape: hay que volver a ingresar o salir.
 */
import { nextTick, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { mensajeDeError } from '@/shared/composables/useConsulta'

const auth = useAuthStore()
const router = useRouter()

const dialogo = ref<HTMLDialogElement | null>(null)
const campo = ref<HTMLInputElement | null>(null)
const password = ref('')
const error = ref('')
const ingresando = ref(false)
// Se fija al abrir: es la cuenta con la que se estaba trabajando
const usuario = ref('')

watch(
  () => auth.sesionVencida,
  async (vencida) => {
    await nextTick()
    const el = dialogo.value
    if (!el) return
    if (vencida) {
      usuario.value = auth.user?.username ?? ''
      password.value = ''
      error.value = ''
      if (!el.open) el.showModal()
      campo.value?.focus()
    } else if (el.open) {
      el.close()
    }
  },
  { immediate: true },
)

async function continuar() {
  if (ingresando.value || !password.value) return
  ingresando.value = true
  error.value = ''
  try {
    await auth.login({ username: usuario.value, password: password.value })
    password.value = ''
  } catch (e) {
    const estado = isAxiosError(e) ? e.response?.status : undefined
    error.value =
      estado === 401
        ? 'La contraseña no es correcta.'
        : mensajeDeError(e, 'No se pudo volver a ingresar. Intentá nuevamente.')
  } finally {
    ingresando.value = false
  }
}

function salir() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <dialog
    ref="dialogo"
    class="sesion-vencida"
    aria-labelledby="sesion-vencida-titulo"
    aria-describedby="sesion-vencida-texto"
    @cancel.prevent
  >
    <form v-if="auth.sesionVencida" @submit.prevent="continuar">
      <h2 id="sesion-vencida-titulo">Tu sesión venció</h2>
      <p id="sesion-vencida-texto" class="ayuda-texto">
        Por seguridad, la sesión se cierra después de un tiempo. Ingresá tu contraseña para seguir
        donde estabas: lo que tenías en pantalla no se pierde. Si estabas guardando algo, volvé a
        intentarlo después de ingresar.
      </p>

      <p class="usuario">
        Usuario: <strong>{{ usuario }}</strong>
      </p>

      <label class="campo-form" for="sesion-vencida-password">Contraseña</label>
      <input
        id="sesion-vencida-password"
        ref="campo"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        :aria-invalid="!!error"
        :aria-describedby="error ? 'sesion-vencida-error' : undefined"
      />
      <p v-if="error" id="sesion-vencida-error" role="alert" class="error-campo">{{ error }}</p>

      <div class="botones">
        <button type="button" class="boton" :disabled="ingresando" @click="salir">Salir</button>
        <button type="submit" class="boton boton-primario" :disabled="ingresando || !password">
          {{ ingresando ? 'Ingresando...' : 'Continuar' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.sesion-vencida {
  width: min(420px, calc(100vw - 32px));
  margin: auto;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
}

/* Fondo oscuro y desenfocado: la pantalla sigue ahí, pero no se puede usar hasta ingresar */
.sesion-vencida::backdrop {
  background: rgb(16 24 40 / 45%);
  backdrop-filter: blur(2px);
}

form {
  display: grid;
  gap: 10px;
}

h2 {
  font-size: var(--titulo-panel);
}

.usuario {
  margin-top: 4px;
  font-size: var(--texto-base);
}

input {
  width: 100%;
}

.botones {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
</style>
