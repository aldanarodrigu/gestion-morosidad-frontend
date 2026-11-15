<script setup lang="ts">
import { computed } from 'vue'
import type {
  ProgresoSincronizacion,
  EjecucionSincronizacion,
} from '../services/sincronizacionService'
const props = defineProps<{
  progreso: ProgresoSincronizacion
  estado: EjecucionSincronizacion['estado']
}>()
const etapas = [
  { id: 'DEUDAS', nombre: 'Deudas' },
  { id: 'COBROS', nombre: 'Cobros' },
  { id: 'CONTACTOS', nombre: 'Contactos' },
  { id: 'GUARDANDO', nombre: 'Guardado' },
]
const indice = computed(() =>
  props.estado === 'COMPLETADA' || props.progreso.etapa === 'FINALIZADA'
    ? etapas.length
    : etapas.findIndex((e) => e.id === props.progreso.etapa),
)
const descargando = computed(() => ['DEUDAS', 'COBROS', 'CONTACTOS'].includes(props.progreso.etapa))
const cancelada = computed(() => ['CANCELANDO', 'CANCELADA'].includes(props.estado))
const completada = computed(() => props.estado === 'COMPLETADA')
const totalConocido = computed(() => descargando.value && props.progreso.totalRegistros != null)
const porcentaje = computed(() => {
  if (completada.value) return 100
  if (!totalConocido.value) return undefined
  const total = props.progreso.totalRegistros!
  return total === 0
    ? 100
    : Math.min(100, Math.max(0, (props.progreso.registrosDescargados / total) * 100))
})
const restantes = computed(() =>
  totalConocido.value
    ? Math.max(0, props.progreso.totalRegistros! - props.progreso.registrosDescargados)
    : null,
)
const paginasRestantes = computed(() =>
  descargando.value && props.progreso.totalPaginas != null
    ? Math.max(0, props.progreso.totalPaginas - props.progreso.paginasDescargadas)
    : null,
)
const formato = (n: number) => new Intl.NumberFormat('es-UY').format(n)
const textoAccesible = computed(() =>
  cancelada.value
    ? props.estado === 'CANCELADA'
      ? 'Sincronización cancelada.'
      : 'Cancelación solicitada.'
    : props.estado === 'ERROR'
      ? 'Sincronización detenida por un error.'
      : completada.value
        ? 'Sincronización completada.'
        : descargando.value
          ? `${formato(props.progreso.registrosDescargados)} registros descargados${totalConocido.value ? ` de ${formato(props.progreso.totalRegistros!)}` : '; total aún no informado'}.`
          : props.progreso.detalle,
)
</script>
<template>
  <div class="progreso-sincronizacion" :class="{ fallo: estado === 'ERROR' }">
    <ol class="etapas" aria-label="Etapas de la sincronización">
      <li
        v-for="(etapa, i) in etapas"
        :key="etapa.id"
        :class="{
          hecha: i < indice,
          actual: i === indice,
          detenida: i === indice && estado === 'ERROR',
        }"
        :aria-current="i === indice ? 'step' : undefined"
      >
        <span class="numero" aria-hidden="true">{{ i < indice ? '✓' : i + 1 }}</span
        ><span>{{ etapa.nombre }}</span>
        <span class="sr-only">{{
          i < indice
            ? 'Finalizada'
            : i === indice
              ? estado === 'ERROR'
                ? 'Detenida'
                : cancelada
                  ? 'Cancelada o cancelándose'
                  : 'En curso'
              : 'Pendiente'
        }}</span>
      </li>
    </ol>
    <div class="barra-cabecera">
      <span>{{
        cancelada
          ? estado === 'CANCELADA'
            ? 'Proceso cancelado'
            : 'Esperando la cancelación'
          : completada
            ? 'Proceso completado'
            : progreso.etapa === 'GUARDANDO'
              ? 'Guardando en la base'
              : progreso.etapa === 'PREPARANDO'
                ? 'Preparando'
                : `Descarga de ${etapas.find((e) => e.id === progreso.etapa)?.nombre.toLowerCase() || 'datos'}`
      }}</span
      ><strong v-if="porcentaje != null"
        >{{ Math.floor(porcentaje) }} %<span v-if="!completada"> de esta descarga</span></strong
      >
    </div>
    <div
      class="barra"
      :class="{ 'descarga-activa': estado === 'EN_CURSO' && descargando }"
      role="progressbar"
      aria-label="Progreso de sincronización"
      :aria-valuenow="porcentaje"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuetext="textoAccesible"
    >
      <span v-if="porcentaje != null" class="avance" :style="{ width: `${porcentaje}%` }"></span>
      <span v-else-if="estado === 'EN_CURSO'" class="indeterminado"></span>
    </div>
    <dl v-if="descargando && !completada" class="metricas">
      <div>
        <dt>Páginas validadas</dt>
        <dd>
          {{ formato(progreso.paginasDescargadas)
          }}<template v-if="progreso.totalPaginas != null">
            de {{ formato(progreso.totalPaginas) }}</template
          >
        </dd>
      </div>
      <div>
        <dt>Registros descargados</dt>
        <dd>
          {{ formato(progreso.registrosDescargados)
          }}<template v-if="totalConocido"> de {{ formato(progreso.totalRegistros!) }}</template>
        </dd>
      </div>
      <div v-if="restantes != null">
        <dt>Restan en esta descarga</dt>
        <dd>
          {{ formato(restantes) }} registros<template v-if="paginasRestantes != null">
            · {{ formato(paginasRestantes) }} páginas</template
          >
        </dd>
      </div>
    </dl>
    <p v-if="descargando && !completada && progreso.paginaActual != null" class="pagina-actual">
      {{ estado === 'ERROR' ? 'Última página consultada' : 'Consultando página' }}
      {{ formato(progreso.paginaActual)
      }}<strong v-if="progreso.intento > 1">
        · Reintento: intento {{ progreso.intento }} de 3</strong
      >
    </p>
    <p v-if="descargando && !totalConocido && estado === 'EN_CURSO'" class="ayuda">
      La API no informa el total de esta descarga; aún no se puede calcular cuántos registros
      faltan.
    </p>
    <p v-if="progreso.etapa === 'GUARDANDO' && estado === 'EN_CURSO'" class="ayuda">
      {{ formato(progreso.registrosDescargados) }} deudas para conciliar. Esperando la confirmación
      de la base de datos.
    </p>
  </div>
</template>
<style scoped>
.progreso-sincronizacion {
  margin-top: 18px;
}
.etapas {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 0;
  margin: 0 0 22px;
  list-style: none;
}
.etapas li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.numero {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  font-variant-numeric: tabular-nums;
}
.actual {
  color: var(--color-primary) !important;
  font-weight: 600;
}
.actual .numero {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.hecha .numero {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
.detenida,
.detenida .numero {
  color: var(--color-tardia) !important;
  border-color: var(--color-tardia);
}
.barra-cabecera {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}
.barra-cabecera strong span {
  font-weight: 400;
}
.barra {
  position: relative;
  height: 10px;
  overflow: hidden;
  background: var(--color-border);
  border-radius: 10px;
}
.avance {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transition: width 0.25s ease;
}
.fallo .avance {
  background: var(--color-tardia);
}
.indeterminado {
  position: absolute;
  inset: 0 auto 0 0;
  width: 42%;
  background: linear-gradient(90deg, transparent, var(--color-primary) 35%, color-mix(in srgb, var(--color-primary) 65%, white) 65%, transparent);
  border-radius: 10px;
  animation: descargando 1.8s linear infinite;
}
.descarga-activa .avance {
  background-image: repeating-linear-gradient(115deg, transparent 0 10px, rgb(255 255 255 / 22%) 10px 20px);
  background-size: 44px 100%;
  animation: rayas-descarga 1.2s linear infinite;
}
@keyframes rayas-descarga {
  from { background-position: 0 0; }
  to { background-position: 44px 0; }
}
.metricas {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
  margin: 16px 0 0;
}
.metricas dt {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.metricas dd {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pagina-actual,
.ayuda {
  margin-top: 12px;
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.pagina-actual strong {
  color: var(--color-primary);
  font-weight: 500;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@keyframes descargando {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(340%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .indeterminado {
    animation: none;
    width: 100%;
    background: repeating-linear-gradient(90deg, var(--color-primary) 0 8px, transparent 8px 16px);
    opacity: 0.35;
  }
  .avance {
    transition: none;
  }
  .descarga-activa .avance { animation: none; }
}
@media (max-width: 600px) {
  .etapas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}
</style>
