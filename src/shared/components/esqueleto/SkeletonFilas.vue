<script setup lang="ts">
/**
 * Filas de esqueleto para usar dentro del <tbody> de una tabla real, así el encabezado
 * (<thead>) sigue siendo el de la tabla y las columnas coinciden.
 *
 * Las celdas no reciben los estilos scoped de la tabla que las contiene, así que el relleno
 * y el borde se toman de estas variables (definilas en la tabla si difieren del default):
 *   --esqueleto-celda-padding  (default 12px 16px)
 *   --esqueleto-celda-borde    (default 1px solid var(--color-border))
 */
import SkeletonBloque from './SkeletonBloque.vue'

const props = withDefaults(
  defineProps<{
    columnas: number
    filas?: number
    /** Columnas (desde 0) alineadas a la derecha, como importes. */
    derecha?: number[]
    /** Columnas (desde 0) con una segunda línea más chica, como "Documento: ...". */
    conDetalle?: number[]
    /** Ancho por columna; si falta, se alterna entre anchos parecidos a texto real. */
    anchos?: (string | undefined)[]
  }>(),
  { filas: 8, derecha: () => [], conDetalle: () => [], anchos: () => [] },
)

const ANCHOS = ['7em', '5em', '9em', '6em', '8em']

// Variación determinista: cada fila tiene largos distintos, pero no cambian entre renders.
function ancho(columna: number, fila: number) {
  return props.anchos[columna] ?? ANCHOS[(columna * 3 + fila) % ANCHOS.length]
}
</script>

<template>
  <tr v-for="fila in filas" :key="fila" class="fila-esqueleto" aria-hidden="true">
    <td v-for="(_, columna) in columnas" :key="columna">
      <SkeletonBloque :ancho="ancho(columna, fila)" :class="{ derecha: derecha.includes(columna) }" />
      <SkeletonBloque
        v-if="conDetalle.includes(columna)"
        class="detalle"
        :class="{ derecha: derecha.includes(columna) }"
        :ancho="`calc(${ancho(columna, fila + 2)} * 0.8)`"
      />
    </td>
  </tr>
</template>

<style scoped>
td {
  padding: var(--esqueleto-celda-padding, 12px 16px);
  border-bottom: var(--esqueleto-celda-borde, 1px solid var(--color-border));
  vertical-align: middle;
}

.derecha {
  margin-inline-start: auto;
}

/* Imita las líneas secundarias (11–12px con un pequeño margen superior) */
.detalle {
  margin-top: 4px;
  font-size: 11px;
}
</style>
