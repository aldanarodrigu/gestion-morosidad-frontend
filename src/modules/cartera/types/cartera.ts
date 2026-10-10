export interface DeudaApi {
  id: number
  padron: {
    cm: string
    numeroPadron: string
  }
  contribuyente: {
    cm: string
    nombre: string
    documento: string
  }
  tributos: {
    id: number
    codigo: string
    descripcion: string | null
  }[]
  importe: number
  diasAtraso: number | null
  convenio: boolean
  segmentoMora: {
    id: number
    nombre: string
    descripcion: string
    orden: number
  } | null
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
  cm: string
  contribuyente: string
  documento: string
  tributo: string
  codigosTributo: string[]
  deuda: number
  diasVencido: number
  segmento: string
  convenio: boolean
  contacto: string
  accionSugerida: string
  gestiones: number | null
}
