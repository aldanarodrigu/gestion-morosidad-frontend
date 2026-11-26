<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

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

watch(username, () => {
  error.value = ''
})

// Ayudas de la contraseña: verla mientras se escribe y avisar si Bloq Mayús está activado
const verPassword = ref(false)
const mayusculas = ref(false)
function revisarMayusculas(evento: KeyboardEvent) {
  mayusculas.value = evento.getModifierState?.('CapsLock') ?? false
}
const anio = new Date().getFullYear()
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
    <div class="login__contenedor">
      <section class="login__card" aria-labelledby="login-titulo">
        <header class="login__marca">
          <img
            src="@/assets/images/logo-intendencia.png"
            alt="Escudo de la Intendencia de San José"
          />
          <h1 id="login-titulo">Gestión de Morosidad</h1>
          <p>Intendencia de San José</p>
        </header>

        <form class="login__form" @submit.prevent="onSubmit">
          <h2>Iniciar sesión</h2>

          <p v-if="route.query.password === 'actualizada'" class="login__aviso" role="status">
            Contraseña actualizada. Ingresá con la nueva contraseña.
          </p>

          <label class="login__campo">
            <span>Usuario</span>
            <input
              v-model="username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              required
            />
          </label>

          <div class="login__campo">
            <label for="login-password">Contraseña</label>
            <div class="login__password">
              <input
                id="login-password"
                v-model="password"
                :type="verPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :aria-describedby="mayusculas ? 'login-mayusculas' : undefined"
                @keyup="revisarMayusculas"
                @keydown="revisarMayusculas"
              />
              <button
                type="button"
                class="login__ver"
                :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="verPassword"
                @click="verPassword = !verPassword"
              >
                <EyeSlashIcon v-if="verPassword" aria-hidden="true" />
                <EyeIcon v-else aria-hidden="true" />
              </button>
            </div>
            <span v-if="mayusculas" id="login-mayusculas" class="login__mayusculas">
              Bloq Mayús está activado.
            </span>
          </div>

          <p v-if="segundosRestantes > 0" class="login__error">
            Demasiados intentos de inicio de sesión. Volvé a intentarlo en
            <span role="timer">{{ esperaFormateada }}</span
            >.
          </p>
          <p v-else-if="error" class="login__error" role="alert">{{ error }}</p>

          <button class="login__boton" type="submit" :disabled="cargando || segundosRestantes > 0">
            {{ cargando ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </section>

      <p class="login__pie">
        <span>Acceso exclusivo para personal autorizado</span>
        <span>© {{ anio }} Intendencia de San José</span>
      </p>
    </div>
  </main>
</template>

<style scoped>
/* Fondo gris del sistema con un toque del azul institucional arriba */
.login {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--spacing-lg) var(--spacing-md);
  background:
    radial-gradient(
      120% 60% at 50% 0%,
      color-mix(in srgb, var(--color-primary) 10%, transparent),
      transparent 70%
    ),
    var(--color-background);
}

.login__contenedor {
  width: min(100%, 400px);
  display: grid;
  gap: var(--spacing-md);
}

.login__card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    var(--shadow-md),
    0 24px 48px -24px rgb(16 24 40 / 18%);
}

/* Marca: escudo y nombre del sistema como una unidad, con una línea de color institucional */
.login__marca {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 32px var(--spacing-lg) 24px;
  text-align: center;
  border-top: 4px solid var(--color-primary);
  border-bottom: 1px solid var(--color-border);
}

.login__marca img {
  height: 76px;
  width: auto;
  margin-bottom: 12px;
  object-fit: contain;
}

.login__marca h1 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.login__marca p {
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}

/* Formulario */
.login__form {
  display: grid;
  gap: 18px;
  padding: 28px 32px 32px;
}

.login__form h2 {
  font-family: 'Inter', sans-serif;
  font-size: var(--titulo-panel);
  font-weight: 600;
  color: var(--color-text);
}

.login__campo {
  display: grid;
  gap: 6px;
  color: var(--color-text);
  font-size: var(--texto-base);
  font-weight: 500;
}

.login__campo input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  font-size: 15px;
}

.login__password {
  position: relative;
}

.login__password input {
  padding-right: 44px;
}

/* Ver u ocultar la contraseña, dentro del campo */
.login__ver {
  position: absolute;
  top: 50%;
  right: 4px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transform: translateY(-50%);
}

.login__ver:hover {
  color: var(--color-primary);
}

.login__ver:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.login__ver svg {
  width: 20px;
  height: 20px;
}

.login__mayusculas {
  color: var(--color-inicial);
  font-size: var(--texto-sm);
}

.login__aviso,
.login__error {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--texto-base);
  line-height: 1.45;
}

.login__aviso {
  color: var(--color-temprana);
  background: color-mix(in srgb, var(--color-temprana) 8%, var(--color-surface));
}

.login__error {
  color: var(--color-tardia);
  background: color-mix(in srgb, var(--color-tardia) 8%, var(--color-surface));
}

.login__boton {
  height: 44px;
  margin-top: 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.login__boton:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.login__boton:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.login__boton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login__pie {
  display: grid;
  gap: 2px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
  text-align: center;
}

@media (max-width: 599px) {
  .login__form {
    padding: 24px 20px 24px;
  }

  .login__marca {
    padding: 24px 20px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login__boton {
    transition: none;
  }
}
</style>
