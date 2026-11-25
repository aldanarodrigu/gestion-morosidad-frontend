<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../stores/auth.store'
import { validarLongitudPassword } from '../utils/password'

const auth = useAuthStore()
const router = useRouter()
const actual = ref('')
const nueva = ref('')
const confirmar = ref('')
const guardando = ref(false)
const error = ref('')

async function guardar() {
  if (guardando.value) return
  error.value = ''
  const errorLongitud = validarLongitudPassword(nueva.value)
  if (errorLongitud) {
    error.value = errorLongitud
    return
  }
  if (nueva.value !== confirmar.value) {
    error.value = 'Las contraseñas nuevas no coinciden.'
    return
  }
  if (nueva.value === actual.value) {
    error.value = 'La nueva contraseña tiene que ser distinta de la actual.'
    return
  }
  guardando.value = true
  try {
    await authService.cambiarPassword(actual.value, nueva.value)
    actual.value = ''
    nueva.value = ''
    confirmar.value = ''
    auth.logout()
    await router.replace({ name: 'login', query: { password: 'actualizada' } })
  } catch (e) {
    error.value = isAxiosError<{ mensaje?: string }>(e)
      ? e.response?.data?.mensaje ?? 'No se pudo cambiar la contraseña.'
      : 'No se pudo cambiar la contraseña.'
  } finally {
    guardando.value = false
  }
}

function cerrarSesion() {
  auth.logout()
  void router.replace({ name: 'login' })
}
</script>

<template>
  <main class="pagina-password">
    <form class="panel" @submit.prevent="guardar">
      <h1>Cambiar contraseña</h1>
      <p v-if="auth.requiereCambioPassword">Ingresá la contraseña temporal y elegí una nueva para acceder al sistema.</p>
      <fieldset :disabled="guardando">
        <label>
          {{ auth.requiereCambioPassword ? 'Contraseña temporal' : 'Contraseña actual' }}
          <input v-model="actual" type="password" autocomplete="current-password" required maxlength="72" />
        </label>
        <label>
          Nueva contraseña
          <input v-model="nueva" type="password" autocomplete="new-password" required minlength="15" maxlength="72" />
        </label>
        <label>
          Confirmar nueva contraseña
          <input v-model="confirmar" type="password" autocomplete="new-password" required maxlength="72" />
        </label>
      </fieldset>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="acciones">
        <button v-if="auth.requiereCambioPassword" type="button" :disabled="guardando" @click="cerrarSesion">Cerrar sesión</button>
        <RouterLink v-else-if="!guardando" :to="auth.inicio">Volver</RouterLink>
        <button class="primario" type="submit" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar contraseña' }}</button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.pagina-password { min-height: 100vh; display: grid; place-items: center; padding: var(--spacing-lg); }
.panel {
  width: min(420px, 100%);
  display: grid;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
h1 { font-size: 19px; }
p, label, .acciones { font-size: 13px; }
fieldset { display: grid; gap: var(--spacing-md); border: 0; padding: 0; }
label { display: grid; gap: var(--spacing-xs); }
input, button {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}
.acciones { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.primario { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.error { color: var(--color-tardia); }
</style>
