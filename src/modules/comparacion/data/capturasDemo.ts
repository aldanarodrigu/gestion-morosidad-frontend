// Ejemplos ficticios y temporales. No son capturas de la base local.
export type OrigenCaptura = 'INTENDENCIA' | 'SUCIVE'
export interface DeudaCaptura {
  factura: string
  cm: string
  origen: OrigenCaptura
  padron: string
  tributo: string
  importe: number
}
export interface CuentaCaptura { cm: string; origen: OrigenCaptura }
export interface CapturaDemo { id: string; nombre: string; fecha: string; cuentas: CuentaCaptura[]; deudas: DeudaCaptura[] }
export const claveCuenta = (c: CuentaCaptura) => `${c.origen}|${c.cm}`
export const cuentasDemo: CuentaCaptura[] = [
  { origen: 'INTENDENCIA', cm: '1001' },
  { origen: 'INTENDENCIA', cm: '1002' },
  { origen: 'SUCIVE', cm: '1001' },
]
const cuentaA = { cm: '1001', origen: 'INTENDENCIA' as const, padron: '10101', tributo: 'Contribución inmobiliaria' }
const cuentaB = { cm: '1002', origen: 'INTENDENCIA' as const, padron: '10102', tributo: 'Tasa de saneamiento' }
// El mismo CM de otra fuente representa otra cuenta.
const cuentaC = { cm: '1001', origen: 'SUCIVE' as const, padron: '20201', tributo: 'Patente de rodados' }
export const capturasDemo: CapturaDemo[] = [
  { id: '2026-09-30', nombre: 'Seguimiento inicial', cuentas: cuentasDemo.map(c => ({ ...c })), fecha: '2026-09-30', deudas: [
    { ...cuentaA, factura: 'EJ-01', importe: 10000 },
    { ...cuentaA, factura: 'EJ-02', importe: 5000 },
    { ...cuentaB, factura: 'EJ-03', importe: 3000 },
    { ...cuentaC, factura: 'EJ-04', importe: 12000 },
  ] },
  { id: '2026-10-15', nombre: 'Seguimiento intermedio', cuentas: cuentasDemo.map(c => ({ ...c })), fecha: '2026-10-15', deudas: [
    { ...cuentaA, factura: 'EJ-01', importe: 6000 },
    { ...cuentaB, factura: 'EJ-03', importe: 3000 },
    { ...cuentaC, factura: 'EJ-04', importe: 12000 },
    { ...cuentaA, factura: 'EJ-05', importe: 8000 },
  ] },
  { id: '2026-10-30', nombre: 'Seguimiento final', cuentas: cuentasDemo.map(c => ({ ...c })), fecha: '2026-10-30', deudas: [
    { ...cuentaA, factura: 'EJ-01', importe: 6000 },
    { ...cuentaC, factura: 'EJ-04', importe: 14000 },
    { ...cuentaA, factura: 'EJ-05', importe: 8000 },
    { ...cuentaB, factura: 'EJ-06', importe: 4500 },
  ] },
]
// Evidencia de cobros simulada, independiente de las diferencias entre capturas.
export const cobrosDemo = [
  { origen: 'INTENDENCIA', cm: '1001', factura: 'EJ-01', fecha: '2026-10-08', importe: 4000 },
  { origen: 'INTENDENCIA', cm: '1001', factura: 'EJ-02', fecha: '2026-10-10', importe: 5000 },
] as const
export const claveDeuda = (d: Pick<DeudaCaptura, 'origen' | 'cm' | 'factura'>) => `${d.origen}|${d.cm}|${d.factura}`
