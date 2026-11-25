<script setup lang="ts">
/**
 * Bloque base de esqueleto.
 * - linea: ocupa exactamente una línea de texto del contexto (usa su font-size y line-height),
 *   así reemplaza un texto sin cambiar la altura.
 * - rect: rectángulo de alto fijo (campos, botones, gráficos).
 * - circulo: avatar o ícono.
 */
withDefaults(
  defineProps<{ forma?: 'linea' | 'rect' | 'circulo'; ancho?: string; alto?: string }>(),
  { forma: 'linea', ancho: '100%', alto: undefined },
)
</script>

<template>
  <span
    class="esqueleto"
    :class="`esqueleto-${forma}`"
    :style="{ width: ancho, height: alto }"
    aria-hidden="true"
  />
</template>

<style scoped>
.esqueleto {
  display: block;
  max-width: 100%;
}

.esqueleto::after {
  content: '';
  display: block;
  /* width explícito: si el contexto convierte el bloque en flex, el relleno no colapsa */
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-esqueleto) 0%,
    var(--color-esqueleto-brillo) 50%,
    var(--color-esqueleto) 100%
  );
  background-size: 200% 100%;
  animation: esqueleto-brillo 1.6s ease-in-out infinite;
}

/* Misma altura que una línea de texto; el relleno deja el bloque algo más bajo que la letra */
.esqueleto-linea {
  height: 1.4em;
  height: 1lh;
  padding-block: 0.28em;
}

.esqueleto-rect {
  height: 38px;
}

.esqueleto-rect::after {
  border-radius: var(--radius-sm);
}

.esqueleto-circulo {
  height: auto;
  aspect-ratio: 1;
}

.esqueleto-circulo::after {
  border-radius: 50%;
}

@keyframes esqueleto-brillo {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .esqueleto::after {
    animation: none;
  }
}
</style>
