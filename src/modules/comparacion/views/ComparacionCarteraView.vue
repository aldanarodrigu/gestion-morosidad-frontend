<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CameraIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import { listarCapturas, obtenerCaptura, crearCaptura, claveCuenta, validarCuenta } from '../services/capturaService'
import type { CapturaResumen, CapturaDetalle, CuentaCaptura, OrigenCaptura } from '../services/capturaService'
import { isAxiosError } from 'axios'
import ResumenCambiosGrafico from '../components/ResumenCambiosGrafico.vue'
import ComparacionSaldosGrafico from '../components/ComparacionSaldosGrafico.vue'
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
  return isAxiosError(e) && typeof e.response?.data?.mensaje === 'string' ? e.response.data.mensaje : fallback
}
watch(() => [route.query.cm, route.query.origen], () => {
  const c = Array.isArray(route.query.cm) ? route.query.cm[0] : route.query.cm
  const o = Array.isArray(route.query.origen) ? route.query.origen[0] : route.query.origen
  cm.value = c?.trim() ?? ''
  origen.value = o === 'SUCIVE' || o === 'INTENDENCIA' ? o : ''
}, { immediate: true })
async function cargarLista() {
  cargando.value = true; error.value = ''
  try {
    const datos = await listarCapturas(listado.signal)
    if (listado.signal.aborted) return
    capturas.value = datos
    if (!datos.some(c => c.id === posterior.value)) posterior.value = datos[0]?.id
    if (!datos.some(c => c.id === anterior.value)) anterior.value = datos[1]?.id
  } catch (e) { if (!listado.signal.aborted) error.value = mensaje(e, 'No se pudieron cargar las capturas.') }
  finally { cargando.value = false }
}
async function cargarComparacion() {
  lectura?.abort()
  const actual = new AbortController(); lectura = actual
  capturaAnterior.value = undefined; capturaPosterior.value = undefined; errorComparacion.value = ''
  cargandoComparacion.value = false
  if (!anterior.value || !posterior.value) return
  cargandoComparacion.value = true
  try {
    const [a,b] = await Promise.all([obtenerCaptura(anterior.value,actual.signal),obtenerCaptura(posterior.value,actual.signal)])
    if (!actual.signal.aborted) { capturaAnterior.value = a; capturaPosterior.value = b }
  } catch (e) { if (!actual.signal.aborted) errorComparacion.value = mensaje(e,'No se pudieron consultar las capturas seleccionadas.') }
  finally { if (lectura === actual) cargandoComparacion.value = false }
}
watch([anterior, posterior], cargarComparacion)
onMounted(cargarLista)
onScopeDispose(() => { listado.abort(); lectura?.abort(); validacion?.abort() })
watch([nuevoCm, nuevoOrigen, creando], () => {
  validacion?.abort()
  validandoCuenta.value = false
  errorCuenta.value = ''
})
function nuevaCaptura() {
  nombreCaptura.value = ''; seleccion.value = []; errorCaptura.value = ''; mensajeCaptura.value = ''
  nuevoCm.value = cm.value; nuevoOrigen.value = origen.value || 'INTENDENCIA'
  creando.value = true
}
async function agregarCuenta() {
  if (guardando.value || validandoCuenta.value) return
  const c = { cm: nuevoCm.value.trim(), origen: nuevoOrigen.value }
  errorCuenta.value = ''
  if (!c.cm || seleccion.value.length >= 100) return
  if (seleccion.value.some(s => claveCuenta(s) === claveCuenta(c))) {
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
    errorCuenta.value = isAxiosError(e) && e.response?.status === 404
      ? `No existe el CM ${c.cm} en ${c.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia'}.`
      : mensaje(e, 'No se pudo validar el CM. Intentá nuevamente.')
  } finally {
    if (validacion === actual) validandoCuenta.value = false
  }
}
async function guardar() {
  if (guardando.value || validandoCuenta.value || !seleccion.value.length || !nombreCaptura.value.trim()) return
  guardando.value = true; errorCaptura.value = ''
  try {
    const captura = await crearCaptura(nombreCaptura.value.trim(), seleccion.value.map(c => ({ ...c })))
    const anteriorId = posterior.value
    await cargarLista()
    posterior.value = captura.id
    if (anteriorId) anterior.value = anteriorId
    creando.value = false
    mensajeCaptura.value = `Captura «${captura.nombre}» guardada con ${captura.cuentas.length} CM. Podés consultarla después de reiniciar la aplicación.`
  } catch (e) { errorCaptura.value = mensaje(e,'No se pudo guardar la captura. Revisá la lista antes de reintentar.') }
  finally { guardando.value = false }
}
const listas = computed(() => !!capturaAnterior.value && !!capturaPosterior.value)
const valida = computed(() => listas.value && capturaAnterior.value!.fecha < capturaPosterior.value!.fecha)
const coincide = (c: CuentaCaptura) => (!origen.value || c.origen === origen.value) && (!cm.value.trim() || c.cm === cm.value.trim())
const comunes = computed(() => {
  if (!valida.value) return []
  const b = new Map(capturaPosterior.value!.cuentas.map(c => [claveCuenta(c),c]))
  return capturaAnterior.value!.cuentas.filter(coincide).flatMap(a => {
    const posterior = b.get(claveCuenta(a))
    return posterior ? [{ antes: a, despues: posterior, diferencia: Number(posterior.importe) - Number(a.importe) }] : []
  })
})
const excluidas = computed(() => !valida.value ? 0 : new Set([...capturaAnterior.value!.cuentas,...capturaPosterior.value!.cuentas].filter(coincide).map(claveCuenta)).size - comunes.value.length)
const visibles = computed(() => comunes.value.filter(c => !soloCambios.value || c.diferencia !== 0 || c.antes.estado !== c.despues.estado || c.antes.segmento !== c.despues.segmento))
const saldosGrafico = computed(() => visibles.value.map(c => ({
  cm: c.antes.cm, origen: c.antes.origen, antes: Number(c.antes.importe), despues: Number(c.despues.importe),
})))
const totalAntes = computed(() => comunes.value.reduce((s,c) => s + Number(c.antes.importe),0))
const totalDespues = computed(() => comunes.value.reduce((s,c) => s + Number(c.despues.importe),0))
const diferencia = computed(() => totalDespues.value - totalAntes.value)
const nuevas = computed(() => comunes.value.filter(c => Number(c.antes.importe) === 0 && Number(c.despues.importe) > 0).length)
const sinDeuda = computed(() => comunes.value.filter(c => Number(c.antes.importe) > 0 && Number(c.despues.importe) === 0).length)
const dinero = (n: number) => new Intl.NumberFormat('es-UY',{ style:'currency',currency:'UYU' }).format(n)
const fecha = (f: string) => { const [d,h] = f.split('T'); return `${d!.split('-').reverse().join('/')} ${h?.slice(0,8) ?? ''}` }
const variacion = (n: number) => `${n > 0 ? '+' : ''}${dinero(n)}`
function cambio(a: number,b: number) {
  return a === 0 && b > 0 ? 'Deuda pendiente nueva' : a > 0 && b === 0 ? 'Sin deuda pendiente' : b < a ? 'Saldo disminuyó' : b > a ? 'Saldo aumentó' : 'Saldo sin cambios'
}
function estadoTexto(valor: string) {
  const etiquetas: Record<string, string> = { PENDIENTE: 'Pendiente', CANCELADA: 'Cancelada', EN_CONVENIO: 'En convenio', FUERA_PERIODO: 'Fuera del período de gestión', SIN_DEUDA_PENDIENTE: 'Sin deuda pendiente' }
  return etiquetas[valor] ?? valor
}
function limpiar() { origen.value = ''; cm.value = ''; soloCambios.value = false }
</script>

<template>
<section class="comparacion" aria-labelledby="titulo-comparacion"><div class="contenido">
  <header class="cabecera"><div><h1 id="titulo-comparacion">Comparar estados de cartera</h1><p>Capturas guardadas de los CM que elegís seguir</p></div><button class="nueva" type="button" :disabled="guardando || validandoCuenta" @click="nuevaCaptura">Nueva captura</button></header>
  <div class="aviso"><CameraIcon aria-hidden="true"/><p>La captura copia el estado actual de la base local. No ejecuta una sincronización. Su fecha de creación puede ser distinta de la fecha de actualización de los datos.</p></div>
  <form v-if="creando" class="panel crear-captura" aria-label="Crear captura" @submit.prevent="guardar">
    <h2>Crear captura de CM seleccionados</h2>
    <fieldset :disabled="guardando" class="formulario-captura">
      <label>Nombre de la captura<input v-model="nombreCaptura" maxlength="100" required placeholder="Ej.: Seguimiento de noviembre" /></label>
      <div class="filtros"><label>Origen<select v-model="nuevoOrigen"><option value="INTENDENCIA">Intendencia</option><option value="SUCIVE">SUCIVE</option></select></label><label>CM<input v-model="nuevoCm" placeholder="Ingresá el CM" :aria-invalid="!!errorCuenta" aria-describedby="error-cuenta" @keydown.enter.prevent="agregarCuenta" /></label><button type="button" :disabled="validandoCuenta || !nuevoCm.trim() || seleccion.length >= 100" @click="agregarCuenta">{{ validandoCuenta ? 'Validando...' : 'Agregar CM' }}</button></div>
      <p v-if="errorCuenta" id="error-cuenta" role="alert" class="error">{{ errorCuenta }}</p>
      <p>Agregá los CM a incluir. Cada CM se valida en la base local antes de añadirlo. Hasta 100 CM por captura.</p>
      <ul class="seleccion"><li v-for="c in seleccion" :key="claveCuenta(c)">{{ c.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }} · CM {{ c.cm }}<button type="button" :aria-label="`Quitar CM ${c.cm} de ${c.origen}`" @click="seleccion = seleccion.filter(s => claveCuenta(s) !== claveCuenta(c))">Quitar</button></li></ul>
      <p>{{ seleccion.length }} CM seleccionados. Ningún CM se incluye automáticamente.</p>
      <div class="botones-captura"><button type="button" @click="creando = false">Cancelar</button><button type="submit" :disabled="validandoCuenta || !seleccion.length || !nombreCaptura.trim()">{{ guardando ? 'Guardando...' : 'Guardar captura' }}</button></div>
    </fieldset>
    <p v-if="errorCaptura" role="alert" class="error">{{ errorCaptura }}</p>
  </form>
  <p v-if="mensajeCaptura" role="status" class="confirmacion">{{ mensajeCaptura }}</p>
  <p v-if="cargando" role="status">Cargando capturas...</p>
  <div v-else-if="error" role="alert"><p>{{ error }}</p><button type="button" @click="cargarLista">Reintentar</button></div>
  <p v-else-if="!capturas.length" class="panel alcance-capturas">Todavía no hay capturas guardadas. Creá la primera seleccionando los CM que querés seguir.</p>
  <template v-else>
    <section class="panel controles" aria-label="Opciones de comparación">
      <div class="fechas"><label>Captura anterior<select v-model="anterior"><option :value="undefined">Elegir captura</option><option v-for="c in capturas" :key="c.id" :value="c.id">{{ fecha(c.fecha) }} · {{ c.nombre }} · {{ c.cantidadCuentas }} CM · {{ c.usuario }}</option></select></label><ArrowsRightLeftIcon class="flecha" aria-hidden="true"/><label>Captura posterior<select v-model="posterior"><option :value="undefined">Elegir captura</option><option v-for="c in capturas" :key="c.id" :value="c.id">{{ fecha(c.fecha) }} · {{ c.nombre }} · {{ c.cantidadCuentas }} CM · {{ c.usuario }}</option></select></label></div>
      <div class="filtros"><label>Origen<select v-model="origen"><option value="">Todos los orígenes</option><option value="INTENDENCIA">Intendencia</option><option value="SUCIVE">SUCIVE</option></select></label><label>CM (opcional)<input v-model="cm" type="search" placeholder="Filtrar CM guardados" /></label><button type="button" @click="limpiar">Limpiar filtros</button></div>
      <p class="ayuda">Sin filtro de CM se comparan todas las cuentas incluidas en ambas capturas.</p>
    </section>
    <p v-if="capturas.length < 2" class="nota">Creá otra captura más adelante para comparar cómo cambió la deuda.</p>
    <p v-if="cargandoComparacion" role="status">Consultando capturas...</p>
    <div v-else-if="errorComparacion" role="alert"><p>{{ errorComparacion }}</p><button type="button" @click="cargarComparacion">Reintentar</button></div>
    <p v-else-if="listas && !valida" class="error" role="alert">La captura posterior debe ser más reciente que la anterior.</p>
    <template v-else-if="valida">
      <section class="panel alcance-capturas"><p><strong>CM incluidos en la captura anterior:</strong> {{ capturaAnterior!.cuentas.map(c => `${c.origen} · ${c.cm}`).join(' / ') }}</p><p><strong>CM incluidos en la captura posterior:</strong> {{ capturaPosterior!.cuentas.map(c => `${c.origen} · ${c.cm}`).join(' / ') }}</p><p>Se comparan {{ comunes.length }} cuentas incluidas en ambas capturas.</p><p v-if="excluidas" class="cuentas-excluidas">{{ excluidas }} cuentas no se comparan porque no fueron incluidas en ambas capturas. Esto no indica que hayan pagado.</p></section>
      <div v-if="comunes.length" class="indicadores"><article class="panel indicador"><span>Saldo en captura anterior</span><strong>{{ dinero(totalAntes) }}</strong></article><article class="panel indicador"><span>Saldo en captura posterior</span><strong>{{ dinero(totalDespues) }}</strong></article><article class="panel indicador"><span>Variación de saldo</span><strong :class="{baja:diferencia < 0,sube:diferencia > 0}">{{ variacion(diferencia) }}</strong></article></div>
      <div v-if="comunes.length" class="movimientos panel"><div><span>CM con deuda pendiente nueva</span><strong>{{ nuevas }}</strong></div><div><span>CM que quedaron sin deuda pendiente</span><strong>{{ sinDeuda }}</strong></div><div><span>Alcance</span><strong>Saldo por CM</strong><small>No es una comparación de facturas individuales</small></div></div>
      <ResumenCambiosGrafico v-if="comunes.length" :cuentas="saldosGrafico" />
      <ComparacionSaldosGrafico v-if="comunes.length" :cuentas="saldosGrafico"
        :anterior="`${capturaAnterior!.nombre} (${fecha(capturaAnterior!.fecha)})`"
        :posterior="`${capturaPosterior!.nombre} (${fecha(capturaPosterior!.fecha)})`" />
      <section class="panel detalle" aria-labelledby="titulo-detalle-cambios">
        <header><div><h2 id="titulo-detalle-cambios">Detalle de cambios por CM</h2><p>Comparación de saldos entre las capturas seleccionadas</p></div><label class="checkbox"><input v-model="soloCambios" type="checkbox"/>Solo mostrar cambios</label></header>
        <div class="tabla-contenedor">
          <table>
            <thead><tr>
              <th scope="col">Cuenta / padrón</th>
              <th scope="col">Contribuyente</th>
              <th scope="col" class="numero">Anterior</th>
              <th scope="col" class="numero">Posterior</th>
              <th scope="col" class="numero">Variación</th>
              <th scope="col">Cambio observado</th>
              <th scope="col">Último movimiento informado</th>
            </tr></thead>
            <tbody>
              <tr v-for="c in visibles" :key="claveCuenta(c.antes)">
                <td class="cuenta-detalle"><strong>CM {{ c.despues.cm }}</strong><small>{{ c.despues.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia' }} · Padrón {{ c.despues.numeroPadron || '—' }}</small></td>
                <td class="persona-detalle">{{ c.despues.nombre || 'Sin nombre' }}<small>{{ c.despues.documento ? `Documento: ${c.despues.documento}` : 'Sin documento' }}</small></td>
                <td class="numero saldo-detalle" :title="`Sincronizado: ${c.antes.fechaSincronizacion ? fecha(c.antes.fechaSincronizacion) : 'sin fecha'}`">{{ dinero(Number(c.antes.importe)) }}</td>
                <td class="numero saldo-detalle" :title="`Sincronizado: ${c.despues.fechaSincronizacion ? fecha(c.despues.fechaSincronizacion) : 'sin fecha'}`">{{ dinero(Number(c.despues.importe)) }}</td>
                <td class="numero variacion-detalle" :class="{ baja: c.diferencia < 0, sube: c.diferencia > 0, 'sin-cambios': c.diferencia === 0 }">{{ variacion(c.diferencia) }}</td>
                <td class="cambio-detalle">
                  <span :class="{ baja: c.diferencia < 0, sube: c.diferencia > 0 && Number(c.antes.importe) > 0, nueva: Number(c.antes.importe) === 0 && Number(c.despues.importe) > 0, 'sin-cambios': c.diferencia === 0 }">{{ cambio(Number(c.antes.importe),Number(c.despues.importe)) }}</span>
                  <small v-if="c.antes.estado !== c.despues.estado">{{ estadoTexto(c.antes.estado) }} → {{ estadoTexto(c.despues.estado) }}</small>
                  <small v-if="c.antes.segmento !== c.despues.segmento">{{ c.antes.segmento || 'Sin segmento' }} → {{ c.despues.segmento || 'Sin segmento' }}</small>
                </td>
                <td class="cobro-detalle"><template v-if="c.despues.fechaUltimoCobro"><span>{{ c.despues.importeUltimoCobro != null ? dinero(Number(c.despues.importeUltimoCobro)) : 'Importe sin informar' }}</span><small>{{ c.despues.fechaUltimoCobro.split('-').reverse().join('/') }}</small><small>Motivo: {{ c.despues.motivoUltimoCobro || 'Sin informar' }}</small></template><span v-else class="sin-cobro">Sin información</span></td>
              </tr>
              <tr v-if="!visibles.length"><td colspan="7" class="vacio">{{ comunes.length ? 'No hay cambios para la selección.' : 'No hay CM incluidos en ambas capturas para estos filtros.' }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </template>
</div></section>
</template>
<style scoped>
.formulario-captura { border: 0; padding: 0; display: grid; gap: 14px; min-width: 0; }
.formulario-captura input:not([type=checkbox]) { padding: 9px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%; }
.seleccion { list-style: none; margin: 0; padding: 0; }
.seleccion li { display: flex; align-items: center; gap: 12px; margin: 6px 0; font-size: 13px; }
.seleccion button, .nueva { width: auto; }
.comparacion { flex: 1; background: var(--color-background); color: var(--color-text); }
.contenido { width: min(1280px, calc(100% - 48px)); margin: 24px auto 32px; }
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
h1 { font-size: 20px; } h2 { font-size: 15px; }
.cabecera p, .detalle header p { margin-top: 5px; font-size: 13px; color: var(--color-text-secondary); }
.boceto { font-size: 10px; letter-spacing: 0.8px; color: var(--color-text-secondary); white-space: nowrap; }
.panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
.aviso { display: flex; align-items: center; gap: 12px; padding: 15px 18px; margin-bottom: 20px; border: 1px solid var(--color-border); border-left: 3px solid var(--color-accent); border-radius: var(--radius-md); background: var(--color-surface); font-size: 12px; color: var(--color-text-secondary); }
.aviso svg { width: 24px; height: 24px; flex-shrink: 0; color: var(--color-primary); }
.acciones-captura { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; font-size: 12px; color: var(--color-text-secondary); }
.acciones-captura button { width: auto; }
.crear-captura { padding: 22px; margin-bottom: 20px; display: grid; gap: 16px; }
.crear-captura p, .alcance-capturas, .confirmacion { font-size: 12px; color: var(--color-text-secondary); }
.crear-captura input:not([type=checkbox]) { padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.crear-captura fieldset { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 14px; }
.crear-captura legend { font-size: 12px; }
.cuenta-opcion { flex-direction: row; align-items: center; margin: 8px 0; }
.botones-captura { display: flex; justify-content: flex-end; gap: 12px; }
.botones-captura button { width: auto; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.alcance-capturas { padding: 16px 22px; margin-top: 18px; }
.alcance-capturas p + p { margin-top: 6px; }
.confirmacion { margin-bottom: 18px; }
.controles { padding: 22px; }
.fechas { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr) minmax(0, 1.5fr); gap: 16px; align-items: end; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
label { display: flex; flex-direction: column; gap: 7px; color: var(--color-text-secondary); font-size: 12px; }
select, input[type=search], button { min-height: 40px; width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--color-surface); color: var(--color-text); }
.flecha { width: 21px; height: 40px; color: var(--color-primary); }
.alcance { padding-bottom: 3px; font-size: 12px; }
.alcance span { display: block; margin-top: 5px; color: var(--color-text-secondary); }
.filtros { display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: end; margin-top: 18px; }
button { color: var(--color-primary); }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.ayuda { margin-top: 12px; font-size: 11px; color: var(--color-text-secondary); }
.indicadores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 20px 0; }
.indicador { padding: 22px; }
.indicador > span { color: var(--color-text-secondary); font-size: 12px; }
.indicador > strong { display: block; margin: 10px 0 7px; font-size: clamp(20px, 2.4vw, 28px); letter-spacing: -0.5px; color: var(--color-primary); font-variant-numeric: tabular-nums; }
small { display: block; color: var(--color-text-secondary); font-size: 11px; margin-top: 5px; }
.movimientos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 20px 0; margin-bottom: 20px; }
.movimientos > div { padding: 0 22px; }
.movimientos > div + div { border-left: 1px solid var(--color-border); }
.movimientos span { display: block; font-size: 12px; color: var(--color-text-secondary); }
.movimientos strong { display: block; margin-top: 7px; font-size: 17px; }
.detalle { overflow: hidden; }
.detalle .checkbox { white-space: nowrap; }
.detalle td { vertical-align: middle; padding: 16px 18px; }
.detalle th { padding: 13px 18px; }
.detalle tbody tr:last-child td { border-bottom: 0; }
.detalle tbody tr:hover { background: var(--color-surface-secondary); }
.detalle .cuenta-detalle { white-space: nowrap; }
.detalle .cuenta-detalle strong { font-size: 12px; font-weight: 600; }
.detalle .persona-detalle { min-width: 160px; max-width: 230px; overflow-wrap: anywhere; line-height: 1.5; }
.detalle small { font-size: 10px; margin-top: 5px; line-height: 1.5; }
.detalle .saldo-detalle, .detalle .variacion-detalle { font-size: 12px; font-weight: 400; }
.detalle .cambio-detalle { min-width: 145px; font-size: 11px; line-height: 1.5; }
.detalle .cobro-detalle { white-space: nowrap; font-size: 11px; }
.detalle .sin-cambios { color: var(--color-text-secondary); }
.detalle header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; }
.checkbox { flex-direction: row; align-items: center; font-size: 12px; }
.checkbox input { accent-color: var(--color-primary); }
.tabla-contenedor { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 15px 18px; text-align: left; border-bottom: 1px solid var(--color-border); }
th { background: var(--color-background); font-weight: 500; font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; }
td { vertical-align: top; }
.numero { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.cambio { font-size: 11px; white-space: nowrap; }
.baja, .indicador > strong.baja { color: var(--color-temprana); }
.sube, .indicador > strong.sube { color: var(--color-tardia); }
.nueva { color: var(--color-primary); }
.baja { color: var(--color-temprana); }
.ausente { color: var(--color-text-secondary); }
.igual, .sin-cobro { color: var(--color-text-secondary); }
.nota { margin: 18px 0; padding: 16px 18px; border-left: 3px solid var(--color-accent); font-size: 12px; background: var(--color-surface); border-radius: var(--radius-sm); }
.nota p { color: var(--color-text-secondary); margin-top: 4px; }
.pie { margin-top: 18px; font-size: 11px; text-align: center; color: var(--color-text-secondary); }
.error, .crear-captura .error { margin-top: 18px; color: var(--color-tardia); font-size: 13px; font-weight: 600; }
.vacio { padding: 28px; text-align: center; color: var(--color-text-secondary); }
@media (max-width: 900px) { .fechas { grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); } .alcance { grid-column: 1 / -1; } }
@media (max-width: 600px) { .contenido { width: calc(100% - 28px); } .cabecera { align-items: flex-start; flex-direction: column; } .indicadores, .movimientos { grid-template-columns: 1fr; } .movimientos { gap: 18px; } .movimientos > div + div { border-left: 0; border-top: 1px solid var(--color-border); padding-top: 18px; } .filtros { grid-template-columns: 1fr; } .detalle header { align-items: flex-start; flex-direction: column; } }
</style>
