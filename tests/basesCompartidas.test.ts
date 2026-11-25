import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { fecha, fechaHora, importe, numero, origen, porcentaje } from '../src/shared/utils/formato'
import { descargarArchivo } from '../src/shared/utils/descarga'
import { mensajeDeError, useConsulta } from '../src/shared/composables/useConsulta'
import { useFiltrosAutomaticos } from '../src/shared/composables/useFiltrosAutomaticos'
import { vEnfocar } from '../src/shared/directives/enfocar'
import DialogoConfirmacion from '../src/shared/components/DialogoConfirmacion.vue'
import EstadoConsulta from '../src/shared/components/EstadoConsulta.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('formatos', () => {
  it('importe: números, textos numéricos de la API, negativos y vacíos', () => {
    expect(importe(12500.5)).toBe('$ 12.500,50')
    expect(importe('123.45000')).toBe('$ 123,45')
    expect(importe(-15000)).toBe('-$ 15.000,00')
    expect(importe(null)).toBe('—')
    expect(importe('no numérico')).toBe('no numérico')
  })

  it('fecha y fechaHora sin desplazar la hora local informada', () => {
    expect(fecha('2026-11-25')).toBe('25/11/2026')
    expect(fecha('2026-11-25T23:30:00')).toBe('25/11/2026')
    expect(fechaHora('2026-11-25T08:05:59')).toBe('25/11/2026 08:05')
    expect(fechaHora('2026-11-25')).toBe('25/11/2026')
    expect(fecha(null)).toBe('—')
  })

  it('número, porcentaje y origen', () => {
    expect(numero(12480)).toBe('12.480')
    expect(porcentaje(18.73)).toBe('18,7 %')
    expect(origen('SUCIVE')).toBe('SUCIVE')
    expect(origen('sucive')).toBe('SUCIVE')
    expect(origen('INTENDENCIA')).toBe('Intendencia')
    expect(origen(null)).toBe('Intendencia')
  })
})

describe('descargarArchivo', () => {
  it('descarga con el nombre indicado y libera la URL después', async () => {
    vi.useFakeTimers()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    descargarArchivo(new Blob(['a']), 'reporte.xlsx')
    expect(clic.mock.instances[0]?.download).toBe('reporte.xlsx')
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revocar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(revocar).toHaveBeenCalledWith('blob:x')
  })
})

describe('useConsulta', () => {
  function montar() {
    let consulta!: ReturnType<typeof useConsulta<string>>
    const w = mount(defineComponent({ setup: () => ((consulta = useConsulta<string>()), () => h('div')) }))
    return { w, consulta: () => consulta }
  }

  it('solo la última ejecución actualiza los datos y el estado', async () => {
    const { consulta } = montar()
    let primera!: (v: string) => void
    const p1 = consulta().ejecutar(() => new Promise((r) => (primera = r)), 'error')
    const p2 = consulta().ejecutar(async () => 'nueva', 'error')
    await p2
    primera('vieja')
    expect(await p1).toBeUndefined()
    expect(consulta().datos.value).toBe('nueva')
    expect(consulta().cargando.value).toBe(false)
  })

  it('informa el error del backend o el mensaje por defecto', async () => {
    const { consulta } = montar()
    await consulta().ejecutar(() => Promise.reject({ response: { data: { mensaje: 'Sin conexión' } } }), (e) =>
      mensajeDeError(e, 'Falló'),
    )
    expect(consulta().error.value).toBe('Sin conexión')
    await consulta().ejecutar(() => Promise.reject(new Error('x')), (e) => mensajeDeError(e, 'Falló'))
    expect(consulta().error.value).toBe('Falló')
  })

  it('cancela lo pendiente al desmontar', async () => {
    const { w, consulta } = montar()
    let signal!: AbortSignal
    void consulta().ejecutar((s) => ((signal = s), new Promise(() => {})), 'error')
    w.unmount()
    expect(signal.aborted).toBe(true)
  })
})

describe('useFiltrosAutomaticos', () => {
  it('aplica al instante los desplegables y espera en los campos de texto', async () => {
    vi.useFakeTimers()
    const filtros = reactive({ texto: '', origen: '' })
    const aplicar = vi.fn()
    let api!: ReturnType<typeof useFiltrosAutomaticos>
    mount(defineComponent({ setup: () => ((api = useFiltrosAutomaticos(filtros, ['texto'], aplicar)), () => h('div')) }))
    filtros.origen = 'SUCIVE'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    expect(aplicar).toHaveBeenLastCalledWith(false)
    aplicar.mockClear()
    filtros.texto = 'per'
    await nextTick()
    await vi.advanceTimersByTimeAsync(399)
    expect(aplicar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(aplicar).toHaveBeenCalledTimes(1)
    api.aplicarAhora()
    expect(aplicar).toHaveBeenLastCalledWith(true)
  })
})

describe('v-enfocar', () => {
  it('lleva el foco al primer campo editable al mostrarse', async () => {
    const w = mount(
      defineComponent({
        directives: { enfocar: vEnfocar },
        template: '<form v-enfocar><input readonly /><input id="primero" /><select /></form>',
      }),
      { attachTo: document.body },
    )
    await flushPromises()
    expect(document.activeElement?.id).toBe('primero')
    w.unmount()
  })
})

describe('DialogoConfirmacion', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true
    }
  })

  it('se abre con la prop, confirma y no se cancela mientras procesa', async () => {
    const w = mount(DialogoConfirmacion, {
      props: { abierto: true, titulo: 'Eliminar', textoConfirmar: 'Eliminar', procesando: true },
      slots: { default: '¿Seguro?' },
      attachTo: document.body,
    })
    await flushPromises()
    expect((w.get('dialog').element as HTMLDialogElement).open).toBe(true)
    expect(w.text()).toContain('¿Seguro?')
    await w.get('dialog').trigger('cancel')
    expect(w.emitted('cancelar')).toBeUndefined()
    await w.setProps({ procesando: false })
    await w.get('button.primario').trigger('click')
    expect(w.emitted('confirmar')).toHaveLength(1)
    await w.get('button.secundario').trigger('click')
    expect(w.emitted('cancelar')).toHaveLength(1)
  })
})

describe('EstadoConsulta', () => {
  const montar = (props: Record<string, unknown>) =>
    mount(EstadoConsulta, { props: { cargando: false, ...props }, slots: { default: '<p class="datos">Datos</p>' } })

  it('muestra error con reintentar, vacío o el contenido', async () => {
    const conError = montar({ error: 'Falló la consulta' })
    expect(conError.get('[role="alert"]').text()).toContain('Falló la consulta')
    await conError.get('button').trigger('click')
    expect(conError.emitted('reintentar')).toHaveLength(1)

    expect(montar({ vacio: true, textoVacio: 'Sin resultados' }).text()).toContain('Sin resultados')
    expect(montar({}).find('.datos').exists()).toBe(true)
  })
})
