<script setup lang="ts">
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  listarCapturas,
  obtenerCaptura,
  crearCaptura,
  claveCuenta,
  validarCuenta,
} from '../services/capturaService'
import type {
  CapturaResumen,
  CapturaDetalle,
  CuentaCaptura,
  OrigenCaptura,
} from '../services/capturaService'
import { isAxiosError } from 'axios'
import ResumenCambiosGrafico from '../components/ResumenCambiosGrafico.vue'
import ComparacionSaldosGrafico from '../components/ComparacionSaldosGrafico.vue'
import PaginaLayout from '@/shared/layouts/PaginaLayout.vue'
import {
  fecha as soloFecha,
  fechaHora,
  importe,
  origen as nombreOrigen,
} from '@/shared/utils/formato'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import SkeletonDetalle from '@/shared/components/esqueleto/SkeletonDetalle.vue'
import SkeletonFilas from '@/shared/components/esqueleto/SkeletonFilas.vue'
import SkeletonTarjeta from '@/shared/components/esqueleto/SkeletonTarjeta.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
const route = useRoute()
const capturas = ref<CapturaResumen[]>([])
const anterior = ref<number>()
const posterior = ref<number>()
const capturaAnterior = ref<CapturaDetalle>()
const capturaPosterior = ref<CapturaDetalle>()
const origen = ref<OrigenCaptura | ''>('')
const cm = ref('')
const soloCambios = ref(false)
const cargando = ref(false)
const cargandoComparacion = ref(false)
const esqueletoLista = useEsqueleto(() => cargando.value)
const esqueletoComparacion = useEsqueleto(() => cargandoComparacion.value)
const guardando = ref(false)
const error = ref('')
const errorComparacion = ref('')
const errorCaptura = ref('')
const errorCuenta = ref('')
const validandoCuenta = ref(false)
let validacion: AbortController | undefined
const creando = ref(false)
const seleccion = ref<CuentaCaptura[]>([])
const nombreCaptura = ref('')
const nuevoCm = ref('')
const nuevoOrigen = ref<OrigenCaptura>('INTENDENCIA')
const mensajeCaptura = ref('')
let lectura: AbortController | undefined
const listado = new AbortController()
function mensaje(e: unknown, fallback: string) {
  return isAxiosError(e) && typeof e.response?.data?.mensaje === 'string'
    ? e.response.data.mensaje
    : fallback
}
watch(
  () => [route.query.cm, route.query.origen],
  () => {
    const c = Array.isArray(route.query.cm) ? route.query.cm[0] : route.query.cm
    const o = Array.isArray(route.query.origen) ? route.query.origen[0] : route.query.origen
    cm.value = c?.trim() ?? ''
    origen.value = o === 'SUCIVE' || o === 'INTENDENCIA' ? o : ''
  },
  { immediate: true },
)
async function cargarLista() {
  cargando.value = true
  error.value = ''
  try {
    const datos = await listarCapturas(listado.signal)
    if (listado.signal.aborted) return
    capturas.value = datos
    if (!datos.some((c) => c.id === posterior.value)) posterior.value = datos[0]?.id
    if (!datos.some((c) => c.id === anterior.value)) anterior.value = datos[1]?.id
  } catch (e) {
    if (!listado.signal.aborted) error.value = mensaje(e, 'No se pudieron cargar las capturas.')
  } finally {
    cargando.value = false
  }
}
async function cargarComparacion() {
  lectura?.abort()
  const actual = new AbortController()
  lectura = actual
  capturaAnterior.value = undefined
  capturaPosterior.value = undefined
  errorComparacion.value = ''
  cargandoComparacion.value = false
  if (!anterior.value || !posterior.value) return
  cargandoComparacion.value = true
  try {
    const [a, b] = await Promise.all([
      obtenerCaptura(anterior.value, actual.signal),
      obtenerCaptura(posterior.value, actual.signal),
    ])
    if (!actual.signal.aborted) {
      capturaAnterior.value = a
      capturaPosterior.value = b
    }
  } catch (e) {
    if (!actual.signal.aborted)
      errorComparacion.value = mensaje(e, 'No se pudieron consultar las capturas seleccionadas.')
  } finally {
    if (lectura === actual) cargandoComparacion.value = false
  }
}
watch([anterior, posterior], cargarComparacion)
onMounted(cargarLista)
onScopeDispose(() => {
  listado.abort()
  lectura?.abort()
  validacion?.abort()
})
watch([nuevoCm, nuevoOrigen, creando], () => {
  validacion?.abort()
  validandoCuenta.value = false
  errorCuenta.value = ''
})
function nuevaCaptura() {
  nombreCaptura.value = ''
  seleccion.value = []
  errorCaptura.value = ''
  mensajeCaptura.value = ''
  nuevoCm.value = cm.value
  nuevoOrigen.value = origen.value || 'INTENDENCIA'
  creando.value = true
}
async function agregarCuenta() {
  if (guardando.value || validandoCuenta.value) return
  const c = { cm: nuevoCm.value.trim(), origen: nuevoOrigen.value }
  errorCuenta.value = ''
  if (!c.cm || seleccion.value.length >= 100) return
  if (seleccion.value.some((s) => claveCuenta(s) === claveCuenta(c))) {
    errorCuenta.value = 'Ese CM ya está agregado para el origen seleccionado.'
    return
  }
  const actual = new AbortController()
  validacion = actual
  validandoCuenta.value = true
  try {
    await validarCuenta(c, actual.signal)
    if (actual.signal.aborted || !creando.value) return
    seleccion.value.push(c)
    nuevoCm.value = ''
  } catch (e) {
    if (actual.signal.aborted) return
    errorCuenta.value =
      isAxiosError(e) && e.response?.status === 404
        ? `No existe el CM ${c.cm} en ${nombreOrigen(c.origen)}.`
        : mensaje(e, 'No se pudo validar el CM. Intentá nuevamente.')
  } finally {
    if (validacion === actual) validandoCuenta.value = false
  }
}
async function guardar() {
  if (
    guardando.value ||
    validandoCuenta.value ||
    !seleccion.value.length ||
    !nombreCaptura.value.trim()
  )
    return
  guardando.value = true
  errorCaptura.value = ''
  try {
    const captura = await crearCaptura(
      nombreCaptura.value.trim(),
      seleccion.value.map((c) => ({ ...c })),
    )
    const anteriorId = posterior.value
    await cargarLista()
    posterior.value = captura.id
    if (anteriorId) anterior.value = anteriorId
    creando.value = false
    mensajeCaptura.value = `Captura «${captura.nombre}» guardada con ${captura.cuentas.length} CM. Podés consultarla después de reiniciar la aplicación.`
  } catch (e) {
    errorCaptura.value = mensaje(
      e,
      'No se pudo guardar la captura. Revisá la lista antes de reintentar.',
    )
  } finally {
    guardando.value = false
  }
}
const listas = computed(() => !!capturaAnterior.value && !!capturaPosterior.value)
const valida = computed(
  () => listas.value && capturaAnterior.value!.fecha < capturaPosterior.value!.fecha,
)
const coincide = (c: CuentaCaptura) =>
  (!origen.value || c.origen === origen.value) && (!cm.value.trim() || c.cm === cm.value.trim())
const comunes = computed(() => {
  if (!valida.value) return []
  const b = new Map(capturaPosterior.value!.cuentas.map((c) => [claveCuenta(c), c]))
  return capturaAnterior.value!.cuentas.filter(coincide).flatMap((a) => {
    const posterior = b.get(claveCuenta(a))
    return posterior
      ? [
          {
            antes: a,
            despues: posterior,
            diferencia: Number(posterior.importe) - Number(a.importe),
          },
        ]
      : []
  })
})
const excluidas = computed(() =>
  !valida.value
    ? 0
    : new Set(
        [...capturaAnterior.value!.cuentas, ...capturaPosterior.value!.cuentas]
          .filter(coincide)
          .map(claveCuenta),
      ).size - comunes.value.length,
)
const visibles = computed(() =>
  comunes.value.filter(
    (c) =>
      !soloCambios.value ||
      c.diferencia !== 0 ||
      c.antes.estado !== c.despues.estado ||
      c.antes.segmento !== c.despues.segmento,
  ),
)
const saldosGrafico = computed(() =>
  visibles.value.map((c) => ({
    cm: c.antes.cm,
    origen: c.antes.origen,
    antes: Number(c.antes.importe),
    despues: Number(c.despues.importe),
  })),
)
const totalAntes = computed(() => comunes.value.reduce((s, c) => s + Number(c.antes.importe), 0))
const totalDespues = computed(() =>
  comunes.value.reduce((s, c) => s + Number(c.despues.importe), 0),
)
const diferencia = computed(() => totalDespues.value - totalAntes.value)
const nuevas = computed(
  () =>
    comunes.value.filter((c) => Number(c.antes.importe) === 0 && Number(c.despues.importe) > 0)
      .length,
)
const sinDeuda = computed(
  () =>
    comunes.value.filter((c) => Number(c.antes.importe) > 0 && Number(c.despues.importe) === 0)
      .length,
)
const dinero = importe
const fecha = fechaHora
const variacion = (n: number) => `${n > 0 ? '+' : ''}${dinero(n)}`
function cambio(a: number, b: number) {
  return a === 0 && b > 0
    ? 'Deuda pendiente nueva'
    : a > 0 && b === 0
      ? 'Sin deuda pendiente'
      : b < a
        ? 'Saldo disminuyó'
        : b > a
          ? 'Saldo aumentó'
          : 'Saldo sin cambios'
}
function estadoTexto(valor: string) {
  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CANCELADA: 'Cancelada',
    EN_CONVENIO: 'En convenio',
    FUERA_PERIODO: 'Fuera del período de gestión',
    SIN_DEUDA_PENDIENTE: 'Sin deuda pendiente',
  }
  return etiquetas[valor] ?? valor
}
function limpiar() {
  origen.value = ''
  cm.value = ''
  soloCambios.value = false
}
</script>

<template>
  <PaginaLayout>
    <template #barra>
      <section v-if="esqueletoLista" class="controles" aria-hidden="true">
        <SkeletonDetalle
          class="esqueleto-fechas"
          :etiquetas="['Captura anterior', 'Captura posterior']"
          tipo="campo"
          :columnas="2"
        />
        <SkeletonDetalle
          class="esqueleto-filtros"
          :etiquetas="['Origen', 'CM (opcional)']"
          tipo="campo"
          :columnas="2"
        />
      </section>
      <section
        v-else-if="!cargando && !error && capturas.length"
        class="controles"
        aria-label="Opciones de comparación"
      >
        <div class="fechas">
          <label
            >Captura anterior<select v-model="anterior">
              <option :value="undefined">Elegir captura</option>
              <option v-for="c in capturas" :key="c.id" :value="c.id">
                {{ fecha(c.fecha) }} · {{ c.nombre }} · {{ c.cantidadCuentas }} CM · {{ c.usuario }}
              </option>
            </select></label
          ><label
            >Captura posterior<select v-model="posterior">
              <option :value="undefined">Elegir captura</option>
              <option v-for="c in capturas" :key="c.id" :value="c.id">
                {{ fecha(c.fecha) }} · {{ c.nombre }} · {{ c.cantidadCuentas }} CM · {{ c.usuario }}
              </option>
            </select></label
          >
        </div>
        <div class="filtros">
          <label
            >Origen<select v-model="origen">
              <option value="">Todos los orígenes</option>
              <option value="INTENDENCIA">Intendencia</option>
              <option value="SUCIVE">SUCIVE</option>
            </select></label
          ><label
            >CM (opcional)<input
              v-model="cm"
              type="search"
              placeholder="Filtrar CM guardados" /></label
          ><button type="button" @click="limpiar">Limpiar filtros</button>
        </div>
        <p class="ayuda">
          Sin filtro de CM se comparan todas las cuentas incluidas en ambas capturas.
        </p>
      </section>
      <div class="acciones-captura">
        <p class="aviso">
          La captura copia el estado actual de la base local de los CM que elegís seguir. No ejecuta
          una sincronización: su fecha de creación puede ser distinta de la fecha de actualización
          de los datos.
        </p>
        <button
          class="nueva boton"
          type="button"
          :disabled="guardando || validandoCuenta"
          @click="nuevaCaptura"
        >
          Nueva captura
        </button>
      </div>
    </template>
    <form
      v-enfocar
      v-if="creando"
      class="panel crear-captura"
      aria-label="Crear captura"
      @submit.prevent="guardar"
    >
      <h2>Crear captura de CM seleccionados</h2>
      <fieldset :disabled="guardando" class="formulario-captura">
        <label
          ><span class="requerido">Nombre de la captura</span
          ><input
            v-model="nombreCaptura"
            maxlength="100"
            required
            placeholder="Ej.: Seguimiento de noviembre"
        /></label>
        <div class="filtros">
          <label
            >Origen<select v-model="nuevoOrigen">
              <option value="INTENDENCIA">Intendencia</option>
              <option value="SUCIVE">SUCIVE</option>
            </select></label
          ><label
            >CM<input
              v-model="nuevoCm"
              placeholder="Ingresá el CM"
              :aria-invalid="!!errorCuenta"
              aria-describedby="error-cuenta"
              @keydown.enter.prevent="agregarCuenta" /></label
          ><button
            type="button"
            :disabled="validandoCuenta || !nuevoCm.trim() || seleccion.length >= 100"
            @click="agregarCuenta"
          >
            {{ validandoCuenta ? 'Validando...' : 'Agregar CM' }}
          </button>
        </div>
        <p v-if="errorCuenta" id="error-cuenta" role="alert" class="error">{{ errorCuenta }}</p>
        <p>
          Agregá los CM a incluir. Cada CM se valida en la base local antes de añadirlo. Hasta 100
          CM por captura.
        </p>
        <ul class="seleccion">
          <li v-for="c in seleccion" :key="claveCuenta(c)">
            {{ nombreOrigen(c.origen) }} · CM {{ c.cm
            }}<button
              type="button"
              :aria-label="`Quitar CM ${c.cm} de ${c.origen}`"
              @click="seleccion = seleccion.filter((s) => claveCuenta(s) !== claveCuenta(c))"
            >
              Quitar
            </button>
          </li>
        </ul>
        <p>{{ seleccion.length }} CM seleccionados. Ningún CM se incluye automáticamente.</p>
        <div class="botones-captura">
          <button type="button" @click="creando = false">Cancelar</button
          ><button
            type="submit"
            :disabled="validandoCuenta || !seleccion.length || !nombreCaptura.trim()"
          >
            {{ guardando ? 'Guardando...' : 'Guardar captura' }}
          </button>
        </div>
      </fieldset>
      <p v-if="errorCaptura" role="alert" class="error">{{ errorCaptura }}</p>
    </form>
    <p v-if="mensajeCaptura" role="status" class="confirmacion">{{ mensajeCaptura }}</p>
    <AvisoCarga
      :activo="cargando || cargandoComparacion"
      :texto="cargando ? 'Cargando capturas' : 'Consultando capturas'"
    />
    <template v-if="cargando" />
    <div v-else-if="error" role="alert" class="mensaje-error">
      <p>{{ error }}</p>
      <button type="button" class="boton" @click="cargarLista">Reintentar</button>
    </div>
    <p v-else-if="!capturas.length" class="panel alcance-capturas">
      Todavía no hay capturas guardadas. Creá la primera seleccionando los CM que querés seguir.
    </p>
    <template v-else>
      <p v-if="capturas.length < 2" class="nota">
        Creá otra captura más adelante para comparar cómo cambió la deuda.
      </p>
      <div v-if="esqueletoComparacion" aria-hidden="true">
        <section class="panel alcance-capturas">
          <SkeletonBloque ancho="70%" /><SkeletonBloque ancho="60%" /><SkeletonBloque
            ancho="14em"
          />
        </section>
        <div class="indicadores">
          <SkeletonTarjeta
            v-for="t in [
              'Saldo en captura anterior',
              'Saldo en captura posterior',
              'Variación de saldo',
            ]"
            :key="t"
            class="panel indicador esqueleto-indicador"
            :titulo="t"
            :nota="false"
          />
        </div>
        <section class="panel detalle">
          <header>
            <div>
              <h2>Detalle de cambios por CM</h2>
              <p>Comparación de saldos entre las capturas seleccionadas</p>
            </div>
          </header>
          <div class="tabla-contenedor tabla-contenedor-datos">
            <table class="tabla-datos tabla-a-ras">
              <thead>
                <tr>
                  <th scope="col">Cuenta / padrón</th>
                  <th scope="col">Contribuyente</th>
                  <th scope="col" class="numero">Anterior</th>
                  <th scope="col" class="numero">Posterior</th>
                  <th scope="col" class="numero">Variación</th>
                  <th scope="col">Cambio observado</th>
                  <th scope="col">Último movimiento informado</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonFilas
                  :columnas="7"
                  :filas="6"
                  :con-detalle="[0, 1]"
                  :derecha="[2, 3, 4]"
                  :anchos="['5em', '11em', '6em', '6em', '6em', '8em', '8em']"
                  relleno-extremos="var(--pagina-margen)"
                />
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <template v-else-if="cargandoComparacion" />
      <div v-else-if="errorComparacion" role="alert" class="mensaje-error">
        <p>{{ errorComparacion }}</p>
        <button type="button" class="boton" @click="cargarComparacion">Reintentar</button>
      </div>
      <p v-else-if="listas && !valida" class="error" role="alert">
        La captura posterior debe ser más reciente que la anterior.
      </p>
      <template v-else-if="valida">
        <section class="panel alcance-capturas">
          <p>
            <strong>CM incluidos en la captura anterior:</strong>
            {{ capturaAnterior!.cuentas.map((c) => `${c.origen} · ${c.cm}`).join(' / ') }}
          </p>
          <p>
            <strong>CM incluidos en la captura posterior:</strong>
            {{ capturaPosterior!.cuentas.map((c) => `${c.origen} · ${c.cm}`).join(' / ') }}
          </p>
          <p>Se comparan {{ comunes.length }} cuentas incluidas en ambas capturas.</p>
          <p v-if="excluidas" class="cuentas-excluidas">
            {{ excluidas }} cuentas no se comparan porque no fueron incluidas en ambas capturas.
            Esto no indica que hayan pagado.
          </p>
        </section>
        <div v-if="comunes.length" class="indicadores">
          <article class="panel indicador">
            <span>Saldo en captura anterior</span><strong>{{ dinero(totalAntes) }}</strong>
          </article>
          <article class="panel indicador">
            <span>Saldo en captura posterior</span><strong>{{ dinero(totalDespues) }}</strong>
          </article>
          <article class="panel indicador">
            <span>Variación de saldo</span
            ><strong :class="{ baja: diferencia < 0, sube: diferencia > 0 }">{{
              variacion(diferencia)
            }}</strong>
          </article>
        </div>
        <div v-if="comunes.length" class="movimientos panel">
          <div>
            <span>CM con deuda pendiente nueva</span><strong>{{ nuevas }}</strong>
          </div>
          <div>
            <span>CM que quedaron sin deuda pendiente</span><strong>{{ sinDeuda }}</strong>
          </div>
          <div>
            <span>Alcance</span><strong>Saldo por CM</strong
            ><small>No es una comparación de facturas individuales</small>
          </div>
        </div>
        <ResumenCambiosGrafico v-if="comunes.length" :cuentas="saldosGrafico" />
        <ComparacionSaldosGrafico
          v-if="comunes.length"
          :cuentas="saldosGrafico"
          :anterior="`${capturaAnterior!.nombre} (${fecha(capturaAnterior!.fecha)})`"
          :posterior="`${capturaPosterior!.nombre} (${fecha(capturaPosterior!.fecha)})`"
        />
        <section class="panel detalle" aria-labelledby="titulo-detalle-cambios">
          <header>
            <div>
              <h2 id="titulo-detalle-cambios">Detalle de cambios por CM</h2>
              <p>Comparación de saldos entre las capturas seleccionadas</p>
            </div>
            <label class="checkbox"
              ><input v-model="soloCambios" type="checkbox" />Solo mostrar cambios</label
            >
          </header>
          <div class="tabla-contenedor tabla-contenedor-datos">
            <table class="tabla-datos tabla-a-ras">
              <thead>
                <tr>
                  <th scope="col">Cuenta / padrón</th>
                  <th scope="col">Contribuyente</th>
                  <th scope="col" class="numero">Anterior</th>
                  <th scope="col" class="numero">Posterior</th>
                  <th scope="col" class="numero">Variación</th>
                  <th scope="col">Cambio observado</th>
                  <th scope="col">Último movimiento informado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in visibles" :key="claveCuenta(c.antes)">
                  <td class="cuenta-detalle">
                    <strong>CM {{ c.despues.cm }}</strong
                    ><small
                      >{{ nombreOrigen(c.despues.origen) }} · Padrón
                      {{ c.despues.numeroPadron || '—' }}</small
                    >
                  </td>
                  <td class="persona-detalle">
                    {{ c.despues.nombre || 'Sin nombre'
                    }}<small>{{
                      c.despues.documento ? `Documento: ${c.despues.documento}` : 'Sin documento'
                    }}</small>
                  </td>
                  <td
                    class="numero saldo-detalle"
                    :title="`Sincronizado: ${c.antes.fechaSincronizacion ? fecha(c.antes.fechaSincronizacion) : 'sin fecha'}`"
                  >
                    {{ dinero(Number(c.antes.importe)) }}
                  </td>
                  <td
                    class="numero saldo-detalle"
                    :title="`Sincronizado: ${c.despues.fechaSincronizacion ? fecha(c.despues.fechaSincronizacion) : 'sin fecha'}`"
                  >
                    {{ dinero(Number(c.despues.importe)) }}
                  </td>
                  <td
                    class="numero variacion-detalle"
                    :class="{
                      baja: c.diferencia < 0,
                      sube: c.diferencia > 0,
                      'sin-cambios': c.diferencia === 0,
                    }"
                  >
                    {{ variacion(c.diferencia) }}
                  </td>
                  <td class="cambio-detalle">
                    <span
                      :class="{
                        baja: c.diferencia < 0,
                        sube: c.diferencia > 0 && Number(c.antes.importe) > 0,
                        nueva: Number(c.antes.importe) === 0 && Number(c.despues.importe) > 0,
                        'sin-cambios': c.diferencia === 0,
                      }"
                      >{{ cambio(Number(c.antes.importe), Number(c.despues.importe)) }}</span
                    >
                    <small v-if="c.antes.estado !== c.despues.estado"
                      >{{ estadoTexto(c.antes.estado) }} →
                      {{ estadoTexto(c.despues.estado) }}</small
                    >
                    <small v-if="c.antes.segmento !== c.despues.segmento"
                      >{{ c.antes.segmento || 'Sin segmento' }} →
                      {{ c.despues.segmento || 'Sin segmento' }}</small
                    >
                  </td>
                  <td class="cobro-detalle">
                    <template v-if="c.despues.fechaUltimoCobro"
                      ><span>{{
                        c.despues.importeUltimoCobro != null
                          ? dinero(Number(c.despues.importeUltimoCobro))
                          : 'Importe sin informar'
                      }}</span
                      ><small>{{ soloFecha(c.despues.fechaUltimoCobro) }}</small
                      ><small
                        >Motivo: {{ c.despues.motivoUltimoCobro || 'Sin informar' }}</small
                      ></template
                    ><span v-else class="sin-cobro">Sin información</span>
                  </td>
                </tr>
                <tr v-if="!visibles.length">
                  <td colspan="7" class="vacio">
                    {{
                      comunes.length
                        ? 'No hay cambios para la selección.'
                        : 'No hay CM incluidos en ambas capturas para estos filtros.'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </PaginaLayout>
</template>
<style scoped>
/* Campos y botones (estilo común del sistema) */
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  font-weight: 500;
}
select,
input[type='search'],
.formulario-captura input:not([type='checkbox']) {
  width: 100%;
  height: var(--control-alto);
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--texto-base);
  font-weight: 400;
}
select:focus,
input:focus {
  outline: none;
  border-color: var(--color-primary);
}
button {
  height: var(--boton-alto);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--texto-base);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: var(--color-primary);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.filtros button,
.formulario-captura .filtros button {
  height: var(--control-alto);
}
.botones-captura button[type='submit'] {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}
h2 {
  font-size: var(--titulo-panel);
  font-weight: 600;
}

/* Banda superior: selección de capturas, filtros y acciones */
.controles {
  display: grid;
  gap: var(--spacing-md);
  --esqueleto-etiqueta-tamano: 12px;
  --esqueleto-campo-alto: 40px;
}
.fechas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr);
  gap: var(--spacing-md);
  align-items: end;
}
.alcance {
  padding-bottom: 3px;
  font-size: var(--texto-sm);
}
.alcance span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
}
.filtros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: var(--spacing-md);
  align-items: end;
}
.ayuda {
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
.esqueleto-fechas {
  padding-bottom: 0;
}
.acciones-captura {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}
.aviso {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}

/* Crear captura */
.crear-captura {
  display: grid;
  gap: var(--spacing-md);
  padding: 20px var(--pagina-margen);
}
.formulario-captura {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 0;
  border: 0;
}
.crear-captura p,
.alcance-capturas,
.confirmacion {
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
.seleccion {
  list-style: none;
  margin: 0;
  padding: 0;
}
.seleccion li {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 6px 0;
  font-size: var(--texto-base);
}
.botones-captura {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

/* Resultados */
.alcance-capturas {
  padding: 16px var(--pagina-margen);
}
.alcance-capturas p + p {
  margin-top: 6px;
}
.mensaje-error {
  display: grid;
  justify-items: start;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--texto-base);
}
.indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
}
.indicador {
  padding: 20px var(--pagina-margen);
}
.indicador > span {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
}
.indicador > strong {
  display: block;
  margin: 10px 0 6px;
  font-size: clamp(20px, 2.2vw, 28px);
  letter-spacing: -0.5px;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.esqueleto-indicador {
  --esqueleto-valor-tamano: clamp(20px, 2.2vw, 28px);
  gap: 10px;
}
.movimientos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 20px 0;
}
.movimientos > div {
  padding: 0 var(--pagina-margen);
}
.movimientos > div + div {
  border-left: 1px solid var(--color-border);
}
.movimientos span {
  display: block;
  font-size: var(--texto-sm);
  color: var(--color-text-secondary);
}
.movimientos strong {
  display: block;
  margin-top: 6px;
  font-size: 17px;
}
.movimientos small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
}
.detalle {
  overflow: hidden;
}
.detalle header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px var(--pagina-margen);
}
.detalle header p {
  margin-top: 4px;
  font-size: var(--texto-base);
  color: var(--color-text-secondary);
}
.detalle .checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: var(--texto-sm);
}
.detalle .checkbox input {
  accent-color: var(--color-primary);
}
.detalle tbody tr:last-child td {
  border-bottom: 0;
}
.detalle tbody tr:hover {
  background: var(--color-surface-secondary);
}
.detalle .cuenta-detalle {
  white-space: nowrap;
}
.detalle .cuenta-detalle strong {
  font-weight: 600;
}
.detalle .persona-detalle {
  min-width: 160px;
  max-width: 260px;
  overflow-wrap: anywhere;
}
.detalle .cambio-detalle {
  min-width: 145px;
  font-size: var(--texto-sm);
}
.detalle .cobro-detalle {
  white-space: nowrap;
  font-size: var(--texto-sm);
}
.detalle .sin-cambios,
.sin-cobro,
.igual,
.ausente {
  color: var(--color-text-secondary);
}
.baja,
.indicador > strong.baja {
  color: var(--color-temprana);
}
.sube,
.indicador > strong.sube {
  color: var(--color-tardia);
}
.nueva:not(.boton) {
  color: var(--color-primary);
}
.nota {
  padding: 14px var(--pagina-margen);
  border-left: 3px solid var(--color-accent);
  font-size: var(--texto-sm);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}
.error,
.crear-captura .error {
  color: var(--color-tardia);
  font-size: var(--texto-base);
  font-weight: 600;
}
.vacio {
  padding: 28px;
  text-align: center;
  color: var(--color-text-secondary);
}

@media (max-width: 1279px) {
  .fechas {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .alcance {
    grid-column: 1 / -1;
  }
}
@media (max-width: 599px) {
  .indicadores,
  .movimientos {
    grid-template-columns: 1fr;
  }
  .movimientos > div + div {
    border-left: 0;
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
    margin-top: 16px;
  }
  .filtros {
    grid-template-columns: 1fr;
  }
  .acciones-captura {
    flex-direction: column;
    align-items: flex-start;
  }
  .detalle header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
