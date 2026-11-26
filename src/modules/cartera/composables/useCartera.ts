import { onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import { obtenerCartera, obtenerCarteraAgrupada } from '../services/carteraService'
import type { FiltrosCarteraApi } from '../services/carteraService'
import type { CarteraFilters } from '../components/MorosidadFilters.vue'
import type { CarteraItem, CarteraGrupo, PaginaResponse } from '../types/cartera'
import { useConsulta } from '@/shared/composables/useConsulta'

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

/** Filtros que se envían a la API: los mismos para el listado y la exportación. */
export function filtrosApiDesde(f: CarteraFilters): FiltrosCarteraApi {
  return {
    busqueda: f.search,
    segmento: f.segmento,
    tipoPadron: f.tipoPadron,
    origen: f.origen,
    contacto: f.contacto,
    ordenarPor: f.ordenarPor,
  }
}

/** Tamaños de página que puede elegir el usuario. */
export const TAMANIOS_PAGINA = [20, 50, 100] as const

function tamanioDesdeUrl(q: LocationQuery, porDefecto: number): number {
  const t = Number.parseInt(leerParam(q.filas), 10)
  return (TAMANIOS_PAGINA as readonly number[]).includes(t) ? t : porDefecto
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
  const { cargando, error, ejecutar } = useConsulta<
    PaginaResponse<CarteraItem> | PaginaResponse<CarteraGrupo>
  >()
  const pagina = ref(paginaDesdeUrl(route.query))
  const tamanioPagina = ref(tamanioDesdeUrl(route.query, tamanio))
  const totalElementos = ref(0)
  const totalPaginas = ref(0)

  const filtros = ref<CarteraFilters>(filtrosDesdeUrl(route.query))

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
    if (tamanioPagina.value !== tamanio) query.filas = String(tamanioPagina.value)
    if (pagina.value > 0) query.pagina = String(pagina.value + 1)

    router.replace({ query })
  }

  async function cargar(): Promise<void> {
    clearTimeout(timer)
    sincronizarUrl()

    const filtrosApi = filtrosApiDesde(filtros.value)
    const agrupada = filtros.value.agruparPor
    // Cada consulta cancela la anterior; solo la última actualiza la tabla
    const r = await ejecutar(
      (signal) =>
        agrupada
          ? obtenerCarteraAgrupada(pagina.value, tamanioPagina.value, filtrosApi, signal)
          : obtenerCartera(pagina.value, tamanioPagina.value, filtrosApi, signal),
      'No se pudo cargar la cartera. Intentá nuevamente.',
    )
    if (!r) return

    grupos.value = agrupada ? (r.contenido as CarteraGrupo[]) : []
    cartera.value = agrupada ? [] : (r.contenido as CarteraItem[])
    totalElementos.value = r.totalElementos
    totalPaginas.value = r.totalPaginas

    // URL con una página que ya no existe (por ejemplo ?pagina=99): ir a la última
    if (pagina.value > 0 && pagina.value >= r.totalPaginas) {
      pagina.value = Math.max(r.totalPaginas - 1, 0)
      return cargar()
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

  // Mantiene a la vista la primera fila que se estaba mirando: con 20 filas en la página 3
  // (filas 41–60), al pasar a 50 se va a la página 1 (filas 1–50), que la incluye.
  function cambiarTamanio(nuevo: number) {
    if (!(TAMANIOS_PAGINA as readonly number[]).includes(nuevo) || nuevo === tamanioPagina.value)
      return
    const primeraFila = pagina.value * tamanioPagina.value
    tamanioPagina.value = nuevo
    pagina.value = Math.floor(primeraFila / nuevo)
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

  onScopeDispose(() => clearTimeout(timer))

  cargar() // única carga inicial: ya arranca con lo que diga la URL

  return {
    cartera,
    grupos,
    cargando,
    error,
    pagina,
    tamanioPagina,
    totalElementos,
    totalPaginas,
    filtros,
    cargar,
    cambiarPagina,
    cambiarTamanio,
  }
}
