<script setup lang="ts">
import { importe, origen as nombreOrigen } from '@/shared/utils/formato'
import { computed } from 'vue'
interface SaldoCuenta {
  cm: string
  origen: string
  antes: number
  despues: number
}
const props = defineProps<{ cuentas: SaldoCuenta[]; anterior: string; posterior: string }>()
const destacadas = computed(() =>
  [...props.cuentas]
    .sort(
      (a, b) =>
        Math.abs(b.despues - b.antes) - Math.abs(a.despues - a.antes) ||
        a.origen.localeCompare(b.origen) ||
        a.cm.localeCompare(b.cm, 'es', { numeric: true }),
    )
    .slice(0, 10),
)
const maximo = computed(() => Math.max(1, ...destacadas.value.flatMap((c) => [c.antes, c.despues])))
const ancho = (n: number) => `${(n / maximo.value) * 100}%`
const dinero = importe
const delta = (c: SaldoCuenta) => `${c.despues > c.antes ? '+' : ''}${dinero(c.despues - c.antes)}`
</script>

<template>
  <figure class="grafico-saldos" aria-labelledby="titulo-grafico-saldos">
    <figcaption>
      <div>
        <h2 id="titulo-grafico-saldos">Saldo por cuenta</h2>
        <p>Comparación de las dos capturas · Ordenado por mayor variación de importe</p>
      </div>
      <div class="leyenda">
        <span><i class="color-anterior" aria-hidden="true" />Anterior · {{ anterior }}</span
        ><span><i class="color-posterior" aria-hidden="true" />Posterior · {{ posterior }}</span>
      </div>
    </figcaption>
    <p v-if="cuentas.length > 10" class="limite">
      Se muestran los 10 CM con mayor variación de {{ cuentas.length }} cuentas. El detalle completo
      permanece en la tabla.
    </p>
    <p v-if="!destacadas.length" class="vacio">No hay cuentas para graficar con esta selección.</p>
    <ol v-else class="cuentas-grafico">
      <li v-for="c in destacadas" :key="`${c.origen}|${c.cm}`" class="cuenta-grafico">
        <div class="identidad-cuenta">
          <strong>CM {{ c.cm }}</strong
          ><span>{{ nombreOrigen(c.origen) }}</span>
        </div>
        <div class="barras-cuenta">
          <div class="fila-saldo">
            <span class="etiqueta-barra">Anterior</span>
            <div class="pista-barra" aria-hidden="true">
              <div class="barra color-anterior" :style="{ width: ancho(c.antes) }" />
            </div>
            <span class="importe-barra">{{ dinero(c.antes) }}</span>
          </div>
          <div class="fila-saldo">
            <span class="etiqueta-barra">Posterior</span>
            <div class="pista-barra" aria-hidden="true">
              <div class="barra color-posterior" :style="{ width: ancho(c.despues) }" />
            </div>
            <span class="importe-barra">{{ dinero(c.despues) }}</span>
          </div>
        </div>
        <div class="variacion-cuenta">
          <span>Variación</span
          ><strong :class="{ disminuyo: c.despues < c.antes, aumento: c.despues > c.antes }">{{
            delta(c)
          }}</strong>
        </div>
      </li>
    </ol>
    <p v-if="destacadas.length" class="nota-escala">
      Todas las barras usan la misma escala. Los importes corresponden a los saldos guardados en las
      capturas.
    </p>
  </figure>
</template>

<style scoped>
.grafico-saldos {
  margin: 0;
  padding: 20px var(--pagina-margen);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
figcaption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  margin-bottom: 22px;
}
h2 {
  font-size: var(--titulo-panel);
}
figcaption p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
.leyenda {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.leyenda span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.leyenda i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.color-anterior {
  background: var(--color-serie-clara);
}
.color-posterior {
  background: var(--color-primary);
}
.cuentas-grafico {
  padding: 0;
  margin: 0;
  list-style: none;
}
.cuenta-grafico {
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr) 120px;
  align-items: center;
  gap: 20px;
  padding: 17px 0;
}
.cuenta-grafico + .cuenta-grafico {
  border-top: 1px solid var(--color-border);
}
.identidad-cuenta strong {
  display: block;
  font-size: var(--texto-base);
  overflow-wrap: anywhere;
}
.identidad-cuenta span,
.variacion-cuenta > span {
  display: block;
  margin-top: 3px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.barras-cuenta {
  display: grid;
  gap: 10px;
}
.fila-saldo {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 115px;
  gap: 12px;
  align-items: center;
}
.etiqueta-barra {
  color: var(--color-text-secondary);
  font-size: 10px;
}
.pista-barra {
  background: var(--color-background);
  height: 10px;
  border-radius: 3px;
  overflow: hidden;
}
.barra {
  height: 100%;
  border-radius: inherit;
}
.importe-barra {
  text-align: right;
  font-size: var(--texto-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.variacion-cuenta {
  text-align: right;
}
.variacion-cuenta strong {
  display: block;
  margin-top: 3px;
  font-size: var(--texto-sm);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.disminuyo {
  color: var(--color-temprana);
}
.aumento {
  color: var(--color-tardia);
}
.limite,
.nota-escala,
.vacio {
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.limite {
  margin-bottom: 10px;
}
.nota-escala {
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
  margin-top: 8px;
}
@media (max-width: 599px) {
  .cuenta-grafico {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }
  .barras-cuenta {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .variacion-cuenta {
    grid-column: 2;
    grid-row: 1;
  }
}
@media (max-width: 599px) {
  .grafico-saldos {
    padding: 16px;
  }
  .fila-saldo {
    grid-template-columns: 48px minmax(0, 1fr) 100px;
    gap: 7px;
  }
  .importe-barra {
    font-size: var(--texto-xs);
  }
}
</style>
