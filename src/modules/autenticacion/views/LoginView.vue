<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

import '@/assets/styles/main.css'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const cargando = ref(false)

const bloqueos = reactive(new Map<string, number>())
const ahora = ref(Date.now())
let reloj: ReturnType<typeof setInterval> | undefined
const normalizar = (nombre: string) => nombre.trim().toLowerCase()

const segundosRestantes = computed(() => {
  const vence = bloqueos.get(normalizar(username.value)) ?? 0
  return Math.max(0, Math.ceil((vence - ahora.value) / 1000))
})

const esperaFormateada = computed(() => {
  const minutos = Math.floor(segundosRestantes.value / 60)
  const segundos = segundosRestantes.value % 60
  if (minutos === 0) return segundos + ' s'
  return minutos + ' min ' + String(segundos).padStart(2, '0') + ' s'
})

function detenerReloj() {
  clearInterval(reloj)
  reloj = undefined
}

function actualizarReloj() {
  ahora.value = Date.now()
  for (const [cuenta, vence] of bloqueos) {
    if (vence <= ahora.value) bloqueos.delete(cuenta)
  }
  if (!bloqueos.size) detenerReloj()
}

watch(username, () => { error.value = '' })
onScopeDispose(detenerReloj)

async function onSubmit() {
  actualizarReloj()
  if (cargando.value || segundosRestantes.value > 0) return
  const cuenta = normalizar(username.value)
  error.value = ''
  cargando.value = true
  try {
    await auth.login({ username: username.value, password: password.value })
    router.push(auth.inicio)
  } catch (e) {
    const respuesta = isAxiosError<{ mensaje?: string }>(e) ? e.response : undefined
    if (respuesta?.status === 429) {
      const espera = Number(respuesta.headers?.['retry-after'])
      if (Number.isFinite(espera) && espera > 0) {
        ahora.value = Date.now()
        bloqueos.set(cuenta, ahora.value + espera * 1000)
        reloj ??= setInterval(actualizarReloj, 250)
        return
      }
    }
    if (cuenta === normalizar(username.value)) {
      // En un 401 no se distingue usuario inexistente, clave incorrecta o clave temporal vencida.
      error.value =
        respuesta?.status === 401
          ? 'Usuario o contraseña incorrectos.'
          : (respuesta?.data?.mensaje ?? 'No se pudo iniciar sesión')
    }
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <main class="login">
    <div class="login__card">
      <header class="login__brand">
        <img src="@/assets/images/logo-intendencia.png" alt="Intendencia de San José" />

        <div class="login__brand-title">
          <span class="institution-name">Intendencia de San José</span>
          <span class="system-name">Gestión de Morosidad</span>
        </div>
      </header>

      <form class="login__form" @submit.prevent="onSubmit">
        <h2>Iniciar sesión</h2>
        <p v-if="route.query.password === 'actualizada'" role="status">
          Contraseña actualizada. Ingresá con la nueva contraseña.
        </p>

        <label class="login__field">
          <span>Usuario</span>
          <input v-model="username" autocomplete="username" required />
        </label>

        <label class="login__field">
          <span>Contraseña</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="segundosRestantes > 0" class="login__error">
          Demasiados intentos de inicio de sesión. Volvé a intentarlo en
          <span role="timer">{{ esperaFormateada }}</span>.
        </p>
        <p v-else-if="error" class="login__error" role="alert">{{ error }}</p>

        <button class="login__button" type="submit" :disabled="cargando || segundosRestantes > 0">
          {{ cargando ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--color-background);
}

.login__card {
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

/* Cabecera igual al navbar */
.login__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-primary-dark);
  color: white;
}

.login__brand img {
  height: 64px;
  width: auto;
  object-fit: contain;
}

.login__brand-title {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.institution-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.system-name {
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  opacity: 0.85;
}

/* Formulario */
.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.login__field input {
  padding: 10px 12px;
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.login__field input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(15, 82, 186, 0.15);
}

.login__error {
  padding: var(--spacing-sm) 12px;
  font-size: 14px;
  color: var(--color-tardia);
  background-color: rgba(180, 35, 24, 0.08);
  border-radius: var(--radius-sm);
}

.login__button {
  margin-top: var(--spacing-sm);
  padding: 12px;
  font-weight: 600;
  color: #fff;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s;
}

.login__button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.login__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
