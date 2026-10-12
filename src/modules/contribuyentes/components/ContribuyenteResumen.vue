<script setup lang="ts">
import type { ContribuyenteResumenResponse } from '../services/contribuyenteService'

defineProps<{
  contribuyente: ContribuyenteResumenResponse
}>()

const formatoImporte = (importe: number) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
  }).format(importe)

const formatoFecha = (fecha: string | null) => {
  if (!fecha) return '—'

  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function claseSegmento(segmento?: string | null): string {
  switch (segmento?.toLowerCase()) {
    case 'mora temprana':
      return 'temprana'
    case 'mora inicial':
      return 'inicial'
    case 'mora tardía':
    case 'mora tardia':
      return 'tardia'
    default:
      return ''
  }
}
</script>

<template>
  <section class="resumen">
    <header class="cabecera">
      <div class="identidad">
        <p class="meta">CM {{ contribuyente.cm }}</p>

        <h1>{{ contribuyente.nombre }}</h1>

        <p class="documento">Documento: {{ contribuyente.documento || 'Sin documento' }}</p>
      </div>

      <div class="deuda">
        <span class="deuda-label">DEUDA TOTAL</span>

        <span class="deuda-monto">
          {{ formatoImporte(contribuyente.deudaTotal) }}
        </span>

        <span class="segmento-badge" :class="claseSegmento(contribuyente.segmento)">
          {{ contribuyente.segmento || 'Sin segmento' }}
        </span>
      </div>
    </header>

    <dl class="stats">
      <div class="stat">
        <dt>Días máx. vencido</dt>
        <dd>
          {{ contribuyente.diasMaxVencido !== null ? `${contribuyente.diasMaxVencido} días` : '—' }}
        </dd>
      </div>

      <div class="stat">
        <dt>Deuda más antigua</dt>
        <dd>{{ formatoFecha(contribuyente.deudaMasAntigua) }}</dd>
      </div>

      <div class="stat">
        <dt>Deudas</dt>
        <dd>{{ contribuyente.cantidadDeudas }}</dd>
      </div>

      <div class="stat">
        <dt>Padrones</dt>
        <dd>{{ contribuyente.cantidadPadrones }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.resumen {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  padding: 20px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.identidad {
  min-width: 0;
}

.meta {
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.identidad h1 {
  margin-bottom: 6px;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.documento {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.deuda {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.deuda-label {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.deuda-monto {
  color: var(--color-primary);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.segmento-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.segmento-badge.temprana {
  color: #15803d;
}

.segmento-badge.inicial {
  color: #b45309;
}

.segmento-badge.tardia {
  color: #b42318;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

.stat {
  min-width: 0;
  padding: 16px 20px;
  border-right: 1px solid var(--color-border);
}

.stat:last-child {
  border-right: none;
}

.stat dt {
  margin-bottom: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.stat dd {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

@media (max-width: 600px) {
  .cabecera {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px 16px;
  }

  .deuda {
    align-items: flex-start;
  }

  .identidad h1 {
    font-size: 18px;
  }

  .deuda-monto {
    font-size: 22px;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat {
    padding: 14px 16px;
  }

  .stat:nth-child(2) {
    border-right: none;
  }

  .stat:nth-child(-n + 2) {
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
