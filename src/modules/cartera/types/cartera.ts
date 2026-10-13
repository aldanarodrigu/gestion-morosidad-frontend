export interface DeudaApi {
  id: number
  contribuyenteId: number
  conContacto: boolean
  padron: {
    cm: string
    numeroPadron: string
    tipoPadron?: string | null
    localidad?: string | null
    block?: string | null
    unidad?: string | null
    contribuyente?: {
      cm: string
      nombre: string
      documento: string | null
    } | null
  }
  contribuyente: {
    cm: string
    nombre: string
    documento: string | null
  }
  tributos: {
    id: number
    codigo: string
    descripcion: string | null
  }[]
  accionesSugeridas: {
    id: number
    nombre: string
    activo: boolean
  }[]
  cantidadGestiones: number
  importe: number
  deudaDesde: string
  ultimoVencimiento: string | null
  diasAtraso: number | null
  aniosDeuda: string | null
  convenio: boolean
  segmentoMora: {
    id: number
    nombre: string
    descripcion: string
    orden: number
  } | null
  fechaUltimoCobro: string | null
  importeUltimoCobro: number | null
  estado: string
  fechaSincronizacion: string | null
}

export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamanio: number
  totalElementos: number
  totalPaginas: number
}

export interface CarteraItem {
  id: number
  contribuyenteId: number
  cm: string
  numeroPadron: string
  contribuyente: string
  documento: string | null
  tributo: string
  codigosTributo: string[]
  deuda: number
  diasVencido: number
  segmento: string
  convenio: boolean
  contacto: string
  accionesSugeridas: string[]
  gestiones: number | null
}

export interface DeudasAgrupadasApi {
  clave: string
  documento: string | null
  nombres: string[]
  importeTotal: number
  diasAtrasoMaximos: number | null
  segmentoMora: DeudaApi['segmentoMora']
  deudas: DeudaApi[]
}

export interface CarteraGrupo extends Omit<DeudasAgrupadasApi, 'deudas'> {
  deudas: CarteraItem[]
}
