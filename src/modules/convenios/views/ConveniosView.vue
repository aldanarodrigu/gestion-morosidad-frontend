<script setup lang="ts">
import { useFiltrosAutomaticos } from '@/shared/composables/useFiltrosAutomaticos'
import { computed, ref, reactive, onMounted } from 'vue'
import {
  obtenerConvenios,
  type FiltrosConvenio,
  type PaginaConvenios,
} from '../services/convenioService'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import { mensajeDeError, useConsulta } from '@/shared/composables/useConsulta'
import PaginacionTabla from '@/shared/components/PaginacionTabla.vue'
import {
  formatoNumero,
  origen as nombreOrigen,
  importe as formatoImporte,
  fecha,
} from '@/shared/utils/formato'
import EstadoConsulta from '@/shared/components/EstadoConsulta.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
const filtros = reactive<FiltrosConvenio>({
  origen: 'INTENDENCIA',
  cm: '',
  documento: '',
  nombre: '',
  desde: '',
  hasta: '',
})
let aplicados = { ...filtros }
const { datos, cargando, error, ejecutar } = useConsulta<PaginaConvenios>()
const detalle = ref<number>()
const ENCABEZADOS = [
  'Convenio / CM',
  'Contribuyente',
  'Cuotas vencidas / totales',
  'Deuda desde',
  'Importe neto',
  'Detalle',
]
function cargar(pagina = 1) {
  detalle.value = undefined
  return ejecutar(
    (signal) => obtenerConvenios(aplicados, pagina, signal),
    (e) => mensajeDeError(e, 'No se pudieron consultar los convenios. Intentá nuevamente.'),
    { limpiar: true },
  )
}
const CM_VALIDO = /^[1-9][0-9]*$/
const cmInvalido = computed(() => !!filtros.cm.trim() && !CM_VALIDO.test(filtros.cm.trim()))
const mismosFiltros = (a: FiltrosConvenio, b: FiltrosConvenio) =>
  (Object.keys(a) as (keyof FiltrosConvenio)[]).every((campo) => a[campo] === b[campo])

// Los filtros se aplican solos; un CM mal escrito no dispara la consulta.
function buscar(forzar = false) {
  if (cmInvalido.value) return
  if (!forzar && mismosFiltros(filtros, aplicados) && (datos.value || cargando.value)) return
  aplicados = { ...filtros }
  void cargar()
}
const { aplicarAhora } = useFiltrosAutomaticos(filtros, ['cm', 'documento', 'nombre'], buscar)
function limpiar() {
  Object.assign(filtros, {
    origen: 'INTENDENCIA',
    cm: '',
    documento: '',
    nombre: '',
    desde: '',
    hasta: '',
  })
  aplicarAhora()
}
onMounted(() => cargar())
const importe = (valor: string | null) => formatoImporte(valor)
</script>
<template>
  <PaginaLayout a-ras>
    <template #barra>
      <form
        class="filtros grilla-formulario"
        aria-label="Filtros de convenios"
        @submit.prevent="aplicarAhora"
      >
        <label class="campo-form"
          >Origen
          <select v-model="filtros.origen">
            <option value="INTENDENCIA">Intendencia</option>
            <option value="SUCIVE">SUCIVE</option>
          </select>
        </label>
        <label class="campo-form"
          >CM<input
            v-model="filtros.cm"
            type="text"
            inputmode="numeric"
            pattern="[1-9][0-9]*"
            :aria-invalid="cmInvalido"
            aria-describedby="convenios-cm-error"
          />
          <span v-if="cmInvalido" id="convenios-cm-error" class="error-campo"
            >Ingresá solo números, sin ceros al inicio.</span
          ></label
        >
        <label class="campo-form"
          >Documento<input v-model="filtros.documento" maxlength="150"
        /></label>
        <label class="campo-form"
          >Contribuyente<input v-model="filtros.nombre" maxlength="150"
        /></label>
        <label class="campo-form"
          >Vencimiento desde<input v-model="filtros.desde" type="date"
        /></label>
        <label class="campo-form"
          >Vencimiento hasta (excluido)<input v-model="filtros.hasta" type="date"
        /></label>
        <div class="acciones-formulario">
          <button type="button" class="boton boton-control" :disabled="cargando" @click="limpiar">
            Limpiar
          </button>
        </div>
      </form>
      <p class="ayuda-texto">
        Convenios activos con deuda vencida, consultados en el momento a la Intendencia o SUCIVE.
        Los importes se muestran como los informa la fuente, sin conversión de monedas. Las cuotas
        vencidas no incluyen la entrega inicial; el importe puede incluirla.
      </p>
    </template>

    <template v-if="datos && !cargando" #totales>
      <strong class="total">{{ formatoNumero(datos.meta.total) }} convenios</strong>
      <span>{{ nombreOrigen(aplicados.origen) }}</span>
    </template>

    <section class="resultados" aria-label="Convenios" aria-live="polite" :aria-busy="cargando">
      <EstadoConsulta
        :cargando="cargando"
        :error="error"
        :vacio="!!datos && !datos.data.length"
        texto-carga="Consultando convenios"
        texto-vacio="No se encontraron convenios para esta consulta."
        @reintentar="cargar()"
      >
        <template #esqueleto>
          <div class="tabla-contenedor-datos">
            <table class="tabla-datos tabla-a-ras">
              <thead>
                <tr>
                  <th v-for="e in ENCABEZADOS" :key="e" scope="col">{{ e }}</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonFilas
                  :columnas="6"
                  :filas="20"
                  :con-detalle="[0, 1]"
                  :derecha="[4]"
                  :anchos="['6em', '12em', '4em', '6em', '6em', '6em']"
                  relleno-extremos="var(--pagina-margen)"
                />
              </tbody>
            </table>
          </div>
        </template>
        <template v-if="datos">
          <div class="tabla-contenedor-datos">
            <table class="tabla-datos tabla-a-ras">
              <thead>
                <tr>
                  <th
                    v-for="e in ENCABEZADOS"
                    :key="e"
                    scope="col"
                    :class="{ numero: e === 'Importe neto' }"
                  >
                    {{ e }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="c in datos.data" :key="c.CM">
                  <tr>
                    <td>
                      <strong>{{ c.NUMERO_CONVENIO ?? '—' }}</strong
                      ><small
                        >CM {{ c.CM
                        }}<template v-if="c.MATRICULA"> · {{ c.MATRICULA }}</template></small
                      >
                    </td>
                    <td>
                      {{ c.PERSONA || 'Sin nombre informado'
                      }}<small>Documento: {{ c.DOCUMENTO || '—' }}</small>
                    </td>
                    <td>{{ c.CANT_CUOTAS_VENC ?? '—' }} / {{ c.CANT_CUOTAS_CONVENIOS ?? '—' }}</td>
                    <td>{{ fecha(c.DEUDA_DESDE) }}</td>
                    <td class="numero importe">{{ importe(c.IMPORTE_DEUDA) }}</td>
                    <td>
                      <button
                        type="button"
                        class="enlace"
                        :aria-expanded="detalle === c.CM"
                        @click="detalle = detalle === c.CM ? undefined : c.CM"
                      >
                        {{ detalle === c.CM ? 'Ocultar' : 'Ver detalle' }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="detalle === c.CM" class="fila-detalle">
                    <td colspan="6">
                      <dl class="detalle-convenio">
                        <div>
                          <dt>Deuda de facturas</dt>
                          <dd>{{ importe(c.DEUDA_FACTURAS) }}</dd>
                        </div>
                        <div>
                          <dt>Saldo a favor</dt>
                          <dd>{{ importe(c.SALDO_A_FAVOR) }}</dd>
                        </div>
                        <div>
                          <dt>Crédito descontado</dt>
                          <dd>{{ importe(c.CREDITO_DESCONTADO) }}</dd>
                        </div>
                        <div>
                          <dt>Tributos</dt>
                          <dd>{{ c.TRIBUTOS_DEUDA || '—' }}</dd>
                        </div>
                        <div>
                          <dt>Último vencimiento</dt>
                          <dd>{{ fecha(c.ULTIMO_VENCIMIENTO) }}</dd>
                        </div>
                        <div>
                          <dt>Teléfono / correo</dt>
                          <dd>{{ c.TELEFONO || '—' }} / {{ c.EMAIL || '—' }}</dd>
                        </div>
                        <div>
                          <dt>Dirección / localidad</dt>
                          <dd>
                            {{
                              [c.DIRECCION, c.NUMERO_PUERTA, c.LOCALIDAD]
                                .filter(Boolean)
                                .join(' · ') || '—'
                            }}
                          </dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <PaginacionTabla
            :pagina="datos.meta.current_page - 1"
            :total-paginas="datos.meta.last_page"
            :total-elementos="datos.meta.total"
            :tamanio="20"
            :tamanios="[20]"
            elementos="convenios"
            :deshabilitado="cargando"
            @cambiar-pagina="(p) => cargar(p + 1)"
          />
        </template>
      </EstadoConsulta>
    </section>
  </PaginaLayout>
</template>

<style scoped>
.total {
  color: var(--color-text);
  font-size: var(--texto-base);
}

.importe {
  font-weight: 600;
}

.enlace {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--texto-sm);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.enlace:hover {
  text-decoration: underline;
}

.enlace:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.fila-detalle > td {
  padding: var(--spacing-md) var(--pagina-margen);
  background: var(--color-background);
}

.detalle-convenio {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md) var(--spacing-lg);
  margin: 0;
}

.detalle-convenio dt {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}

.detalle-convenio dd {
  margin: 2px 0 0;
  overflow-wrap: anywhere;
}

.mensaje-pagina button {
  margin-top: var(--spacing-sm);
}
</style>
