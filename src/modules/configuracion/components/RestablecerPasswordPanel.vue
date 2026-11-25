<script setup lang="ts">
import { fechaHora } from '@/shared/utils/formato'
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onScopeDispose, ref } from 'vue'
import { isAxiosError } from 'axios'
import { restablecerPassword } from '../services/usuarioService'
import type { Usuario } from '../services/usuarioService'

const props = defineProps<{ usuario: Usuario }>()
const emit = defineEmits<{ cerrar: [] }>()
const cargando = ref(false)
const password = ref('')
const venceEn = ref('')
const copiado = ref('')
const error = ref('')
const controller = new AbortController()
onScopeDispose(() => controller.abort())

async function generar() {
  if (cargando.value || password.value) return
  cargando.value = true
  error.value = ''
  try {
    const resultado = await restablecerPassword(props.usuario.id, controller.signal)
    if (!controller.signal.aborted) {
      password.value = resultado.passwordTemporal
      venceEn.value = resultado.venceEn
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      error.value = isAxiosError<{ mensaje?: string }>(e)
        ? (e.response?.data?.mensaje ?? 'No se pudo restablecer la contraseña.')
        : 'No se pudo restablecer la contraseña.'
    }
  } finally {
    cargando.value = false
  }
}

const vencimiento = computed(() => {
  if (!venceEn.value || Number.isNaN(new Date(venceEn.value).getTime())) return ''
  return fechaHora(venceEn.value)
})

async function copiar() {
  try {
    await navigator.clipboard.writeText(password.value)
    copiado.value = 'Copiada al portapapeles.'
  } catch {
    copiado.value = 'No se pudo copiar. Seleccioná el texto y copialo manualmente.'
  }
}

function cerrar() {
  password.value = ''
  venceEn.value = ''
  copiado.value = ''
  emit('cerrar')
}
</script>

<template>
  <section v-enfocar class="formulario" aria-labelledby="titulo-reset-password">
    <h3 id="titulo-reset-password">Restablecer contraseña de {{ usuario.username }}</h3>
    <template v-if="password">
      <p>
        Entregá la contraseña temporal por un canal seguro. Solo se muestra esta vez; al cerrar no
        se puede volver a ver.
      </p>
      <label>
        Contraseña temporal
        <span class="fila-copiar">
          <input
            :value="password"
            readonly
            autocomplete="off"
            spellcheck="false"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button type="button" class="copiar" @click="copiar">Copiar</button>
        </span>
      </label>
      <p v-if="copiado" role="status" class="ayuda">{{ copiado }}</p>
      <p v-if="vencimiento" class="vence">Vence el {{ vencimiento }}.</p>
      <div class="botones">
        <button class="primario" type="button" @click="cerrar">Cerrar</button>
      </div>
    </template>
    <template v-else>
      <p>
        Se cerrarán las sesiones del usuario. Deberá cambiar la contraseña temporal al ingresar.
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="botones">
        <button type="button" :disabled="cargando" @click="cerrar">Cancelar</button>
        <button type="button" class="primario" :disabled="cargando" @click="generar">
          {{ cargando ? 'Generando...' : 'Generar contraseña temporal' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.formulario {
  display: grid;
  gap: var(--spacing-sm);
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
label {
  display: grid;
  gap: 4px;
}
input,
button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}
input {
  width: fit-content;
  max-width: 100%;
  font-family: monospace;
}
.error {
  color: var(--color-tardia);
}
.fila-copiar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.ayuda {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
</style>
