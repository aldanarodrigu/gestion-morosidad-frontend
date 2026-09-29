<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

import '@/assets/styles/main.css'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const cargando = ref(false)

async function onSubmit() {
  error.value = ''
  cargando.value = true
  try {
    await auth.login({ username: username.value, password: password.value })
    router.push('/cartera')
  } catch (e: any) {
    error.value = e.response?.data?.mensaje ?? 'No se pudo iniciar sesión'
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

        <label class="login__field">
          <span>Usuario</span>
          <input v-model="username" autocomplete="username" required />
        </label>

        <label class="login__field">
          <span>Contraseña</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="error" class="login__error" role="alert">{{ error }}</p>

        <button class="login__button" type="submit" :disabled="cargando">
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
