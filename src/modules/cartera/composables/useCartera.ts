import { onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import { obtenerCartera, obtenerCarteraAgrupada } from '../services/carteraService'
import type { CarteraFilters } from '../components/MorosidadFilters.vue'
import type { CarteraItem, CarteraGrupo } from '../types/cartera'

const ORDENES = ['antiguedad', 'importe', 'nombre'] as const
const SEGMENTOS = ['temprana', 'inicial', 'tardia']
const ORIGENES = ['intendencia', 'sucive']
const CON_SIN = ['con', 'sin']

function leerParam(valor: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v ?? ''
}

// Si el valor de la URL no es uno de los válidos, se descarta
function permitido(valor: string, validos: readonly string[]) {
  return validos.includes(valor) ? valor : ''
}

function filtrosDesdeUrl(q: LocationQuery): CarteraFilters {
  const orden = leerParam(q.orden)

  return {
    search: leerParam(q.q),
    segmento: permitido(leerParam(q.segmento), SEGMENTOS),
    tipoPadron: leerParam(q.tipoPadron),
    origen: permitido(leerParam(q.origen), ORIGENES),
    multa: permitido(leerParam(q.multa), CON_SIN),
    contacto: permitido(leerParam(q.contacto), CON_SIN),
    agruparPor: leerParam(q.agrupar) === 'true',
    ordenarPor: (ORDENES as readonly string[]).includes(orden)
      ? (orden as CarteraFilters['ordenarPor'])
      : 'antiguedad',
  }
}

// En la URL la página es 1-based; internamente es 0-based
function paginaDesdeUrl(q: LocationQuery): number {
  const p = Number.parseInt(leerParam(q.pagina), 10)
  return Number.isFinite(p) && p > 1 ? p - 1 : 0
}

export function useCartera(tamanio = 20) {
  const route = useRoute()
  const router = useRouter()
  const rutaDeLaVista = route.path

  const cartera = ref<CarteraItem[]>([])
  const grupos = ref<CarteraGrupo[]>([])
  const cargando = ref(false)
  const error = ref('')
  const pagina = ref(paginaDesdeUrl(route.query))
  const totalElementos = ref(0)
  const totalPaginas = ref(0)

  const filtros = ref<CarteraFilters>(filtrosDesdeUrl(route.query))

  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  // La URL guarda solo lo que se sale del default
  function sincronizarUrl() {
    if (route.path !== rutaDeLaVista) return // ya se navegó a otra vista

    const f = filtros.value
    const query: Record<string, string> = {}

    if (f.search) query.q = f.search
    if (f.segmento) query.segmento = f.segmento
    if (f.tipoPadron) query.tipoPadron = f.tipoPadron
    if (f.origen) query.origen = f.origen
    if (f.multa) query.multa = f.multa
    if (f.contacto) query.contacto = f.contacto
    if (f.agruparPor) query.agrupar = 'true'
    if (f.ordenarPor !== 'antiguedad') query.orden = f.ordenarPor
    if (pagina.value > 0) query.pagina = String(pagina.value + 1)

    router.replace({ query })
  }

  async function cargar() {
    clearTimeout(timer)
    controller?.abort()
    const ctrl = new AbortController()
    controller = ctrl

    sincronizarUrl()
    cargando.value = true
    error.value = ''

    try {
      const filtrosApi = {
        busqueda: filtros.value.search,
        segmento: filtros.value.segmento,
        tipoPadron: filtros.value.tipoPadron,
        origen: filtros.value.origen,
        contacto: filtros.value.contacto,
        ordenarPor: filtros.value.ordenarPor,
      }
      const agrupada = filtros.value.agruparPor
      const r = agrupada
        ? await obtenerCarteraAgrupada(pagina.value, tamanio, filtrosApi, ctrl.signal)
        : await obtenerCartera(pagina.value, tamanio, filtrosApi, ctrl.signal)
      if (ctrl.signal.aborted) return

      grupos.value = agrupada ? (r.contenido as CarteraGrupo[]) : []
      cartera.value = agrupada ? [] : (r.contenido as CarteraItem[])
      totalElementos.value = r.totalElementos
      totalPaginas.value = r.totalPaginas

      // URL con una página que ya no existe (por ejemplo ?pagina=99): ir a la última
      if (pagina.value > 0 && pagina.value >= r.totalPaginas) {
        pagina.value = Math.max(r.totalPaginas - 1, 0)
        return cargar()
      }
    } catch (e) {
      if (ctrl.signal.aborted) return // request cancelado a propósito, no es un error
      console.error('Error al cargar la cartera:', e)
      error.value = 'No se pudo cargar la cartera. Intentá nuevamente.'
    } finally {
      // si ya hay un request más nuevo, ese es el que apaga el loading
      if (controller === ctrl) cargando.value = false
    }
  }

  function programarCarga(demoraMs: number) {
    clearTimeout(timer)
    pagina.value = 0
    timer = setTimeout(cargar, demoraMs)
  }

  function cambiarPagina(nueva: number) {
    if (nueva < 0 || nueva >= totalPaginas.value) return
    pagina.value = nueva
    cargar()
  }

  // Buscador: con debounce
  watch(
    () => filtros.value.search,
    () => programarCarga(300),
  )

  // Selects y orden: inmediato
  watch(
    () => {
      const f = filtros.value
      return [f.segmento, f.tipoPadron, f.origen, f.multa, f.contacto, f.ordenarPor, f.agruparPor]
    },
    () => programarCarga(0),
  )

  onScopeDispose(() => {
    clearTimeout(timer)
    controller?.abort()
  })

  cargar() // única carga inicial: ya arranca con lo que diga la URL

  return {
    cartera,
    grupos,
    cargando,
    error,
    pagina,
    totalElementos,
    totalPaginas,
    filtros,
    cargar,
    cambiarPagina,
  }
}
