import type { DeudaApi, DeudasAgrupadasApi } from '../src/modules/cartera/types/cartera'
export function deuda(id = 10, documento = '90000001'): DeudaApi {
  return {
    id,
    contribuyenteId: id + 100,
    conContacto: false,
    padron: { cm: String(id), numeroPadron: String(id + 1000) },
    contribuyente: { cm: String(id), nombre: 'Ana Alvarez', documento },
    tributos: [{ id: 1, codigo: '201', descripcion: 'Contribución' }],
    accionesSugeridas: [{ id: 1, nombre: 'Llamada', activo: true }],
    cantidadGestiones: 2,
    importe: 100,
    deudaDesde: '2026-01-01',
    ultimoVencimiento: null,
    diasAtraso: 200,
    aniosDeuda: null,
    convenio: false,
    segmentoMora: { id: 2, nombre: 'Mora Inicial', descripcion: '', orden: 2 },
    fechaUltimoCobro: null,
    importeUltimoCobro: null,
    estado: 'PENDIENTE',
    fechaSincronizacion: null,
  }
}
export function grupo(documento = '90000001'): DeudasAgrupadasApi {
  return {
    clave: 'DOC:' + documento,
    documento,
    nombres: ['Ana Alvarez'],
    importeTotal: 200,
    diasAtrasoMaximos: 200,
    segmentoMora: deuda().segmentoMora,
    deudas: [deuda(10, documento), deuda(20, documento)],
  }
}
export const pagina = <T>(contenido: T[]) => ({
  contenido,
  pagina: 0,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas: contenido.length ? 1 : 0,
})
