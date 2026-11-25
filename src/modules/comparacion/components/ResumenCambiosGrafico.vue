<script setup lang="ts">
import { porcentaje as formatoPorcentaje } from '@/shared/utils/formato'
import { computed } from 'vue'
const props = defineProps<{ cuentas: { antes: number; despues: number }[] }>()
const categorias = computed(() => {
  const resultado = [
    { nombre: 'Saldo aumentó', cantidad: 0, color: 'var(--color-tardia)' },
    { nombre: 'Saldo disminuyó, con deuda', cantidad: 0, color: 'var(--color-primary)' },
    { nombre: 'Quedaron sin deuda pendiente', cantidad: 0, color: 'var(--color-temprana)' },
    { nombre: 'Saldo sin cambios', cantidad: 0, color: 'var(--color-text-light)' },
  ]
  for (const c of props.cuentas) {
    const indice = c.despues > c.antes ? 0 : c.despues < c.antes ? (c.despues === 0 ? 2 : 1) : 3
    resultado[indice]!.cantidad++
  }
  return resultado
})
const porcentaje = (n: number) => (props.cuentas.length ? (n / props.cuentas.length) * 100 : 0)
const textoPorcentaje = (n: number) => formatoPorcentaje(porcentaje(n))
</script>

<template>
  <figure class="resumen-cambios" aria-labelledby="titulo-resumen-cambios">
    <figcaption>
      <div>
        <h2 id="titulo-resumen-cambios">Cómo cambiaron los saldos</h2>
        <p>Cantidad de cuentas según la variación entre ambas capturas</p>
      </div>
      <span class="total-cuentas"
        >{{ cuentas.length }} {{ cuentas.length === 1 ? 'cuenta' : 'cuentas' }} · origen + CM</span
      >
    </figcaption>
    <p v-if="!cuentas.length" class="vacio">No hay cuentas para resumir con esta selección.</p>
    <ul v-else class="categorias">
      <li v-for="categoria in categorias" :key="categoria.nombre" class="categoria">
        <span class="nombre-categoria">{{ categoria.nombre }}</span>
        <div class="pista" aria-hidden="true">
          <div
            class="barra"
            :style="{ width: `${porcentaje(categoria.cantidad)}%`, background: categoria.color }"
          />
        </div>
        <strong class="cantidad-categoria">{{ categoria.cantidad }}</strong
        ><span class="porcentaje-categoria">{{ textoPorcentaje(categoria.cantidad) }}</span>
      </li>
    </ul>
  </figure>
</template>

<style scoped>
.resumen-cambios {
  margin: 0;
  padding: 20px var(--pagina-margen);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
figcaption {
  display: flex;
  justify-content: space-between;
  align-items: start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 22px;
}
h2 {
  font-size: var(--titulo-panel);
}
figcaption p {
  margin-top: 5px;
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
.total-cuentas {
  font-size: var(--texto-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.categorias {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 17px;
}
.categoria {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) 35px 60px;
  gap: 16px;
  align-items: center;
}
.nombre-categoria {
  font-size: var(--texto-sm);
}
.pista {
  height: 8px;
  background: var(--color-background);
  border-radius: 4px;
  overflow: hidden;
}
.barra {
  height: 100%;
  border-radius: inherit;
}
.cantidad-categoria {
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.porcentaje-categoria {
  text-align: right;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
  font-variant-numeric: tabular-nums;
}
.vacio {
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
@media (max-width: 599px) {
  .resumen-cambios {
    padding: 16px;
  }
  .categoria {
    grid-template-columns: minmax(0, 1fr) 35px 55px;
    gap: 8px;
  }
  .nombre-categoria {
    grid-column: 1 / -1;
  }
}
</style>
