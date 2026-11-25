<script setup lang="ts">
/**
 * Diálogo modal de confirmación (usa <dialog> nativo: foco atrapado, Escape y fondo).
 * Se abre y se cierra con la prop `abierto`; Escape y «Cancelar» emiten `cancelar`,
 * salvo mientras `procesando`, para no cortar una acción en curso.
 */
import { nextTick, onMounted, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    abierto: boolean
    titulo: string
    textoConfirmar: string
    textoProcesando?: string
    textoCancelar?: string
    procesando?: boolean
    error?: string
    /** Clase extra para el botón de confirmar (por ejemplo, para identificarlo en pruebas). */
    claseConfirmar?: string
  }>(),
  {
    textoProcesando: 'Procesando...',
    textoCancelar: 'Cancelar',
    procesando: false,
    error: '',
    claseConfirmar: '',
  },
)
const emit = defineEmits<{ confirmar: []; cancelar: [] }>()

const dialogo = ref<HTMLDialogElement | null>(null)
const id = useId()

async function sincronizar(abierto: boolean) {
  await nextTick()
  const el = dialogo.value
  if (!el) return
  if (abierto && !el.open) el.showModal()
  else if (!abierto && el.open) el.close()
}

watch(() => props.abierto, sincronizar)
onMounted(() => sincronizar(props.abierto))

function cancelar() {
  if (!props.procesando) emit('cancelar')
}

// Si el navegador cierra el diálogo por su cuenta, se avisa como una cancelación.
function alCerrar() {
  if (props.abierto) emit('cancelar')
}
</script>

<template>
  <dialog
    ref="dialogo"
    class="dialogo-confirmacion"
    :aria-labelledby="`${id}-titulo`"
    :aria-describedby="`${id}-cuerpo`"
    @cancel.prevent="cancelar"
    @close="alCerrar"
  >
    <template v-if="abierto">
      <h3 :id="`${id}-titulo`">{{ titulo }}</h3>
      <div :id="`${id}-cuerpo`" class="cuerpo"><slot /></div>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <div class="botones">
        <button class="secundario" type="button" autofocus :disabled="procesando" @click="cancelar">
          {{ textoCancelar }}
        </button>
        <button
          class="primario"
          :class="claseConfirmar"
          type="button"
          :disabled="procesando"
          @click="emit('confirmar')"
        >
          {{ procesando ? textoProcesando : textoConfirmar }}
        </button>
      </div>
    </template>
  </dialog>
</template>

<style scoped>
.dialogo-confirmacion {
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
  font-size: var(--texto-base);
}

.dialogo-confirmacion::backdrop {
  background: rgb(16 24 40 / 45%);
}

h3 {
  margin-bottom: 12px;
  font-size: var(--titulo-panel);
}

.cuerpo {
  display: grid;
  gap: 8px;
  overflow-wrap: anywhere;
}

.error {
  margin-top: 12px;
  color: var(--color-tardia);
}

.botones {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}
</style>
