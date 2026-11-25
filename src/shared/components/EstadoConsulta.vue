<script setup lang="ts">
/**
 * Estados de una consulta, en un solo lugar:
 *  - cargando: anuncia la carga a lectores de pantalla y, si tarda, muestra el slot #esqueleto;
 *  - error: mensaje con botón «Reintentar» (emite `reintentar`);
 *  - vacío: texto de lista vacía;
 *  - si no, el contenido (slot por defecto).
 */
import AvisoCarga from './esqueleto/AvisoCarga.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'

const props = withDefaults(
  defineProps<{
    cargando: boolean
    error?: string
    vacio?: boolean
    textoCarga?: string
    textoVacio?: string
  }>(),
  {
    error: '',
    vacio: false,
    textoCarga: 'Cargando datos',
    textoVacio: 'No hay datos para mostrar.',
  },
)
const emit = defineEmits<{ reintentar: [] }>()

const esqueleto = useEsqueleto(() => props.cargando)
</script>

<template>
  <AvisoCarga :activo="cargando" :texto="textoCarga" />
  <slot v-if="esqueleto" name="esqueleto" />
  <template v-else-if="cargando" />
  <div v-else-if="error" role="alert" class="mensaje-pagina error estado-error">
    <p>{{ error }}</p>
    <button type="button" class="boton" @click="emit('reintentar')">Reintentar</button>
  </div>
  <p v-else-if="vacio" class="mensaje-pagina estado-vacio">{{ textoVacio }}</p>
  <slot v-else />
</template>

<style scoped>
.estado-error {
  display: grid;
  justify-items: start;
  gap: var(--spacing-sm);
}
</style>
