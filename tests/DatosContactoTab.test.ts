import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import DatosContactoTab from '../src/modules/contribuyentes/components/DatosContactoTab.vue'
import * as api from '../src/modules/contribuyentes/services/contactoService'
import type { Contacto } from '../src/modules/contribuyentes/services/contactoService'
vi.mock('../src/modules/contribuyentes/services/contactoService')
const contacto: Contacto = {
  id: 7,
  tipoContacto: 'EMAIL',
  valor: 'ana@example.test',
  origen: 'API_PERSONAS',
  esDeContribuyente: true,
}
const montar = () =>
  mount(DatosContactoTab, { props: { cm: '123' }, global: { plugins: [createPinia()] } })
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 1, username: 'operador', roles: ['NOTIFICADOR'] }),
  )
  vi.mocked(api.obtenerContactos).mockResolvedValue([{ ...contacto }])
  vi.mocked(api.guardarContacto).mockImplementation(async (_cm, request) => ({
    ...request,
    id: request.id ?? 8,
  }))
})
async function nuevo(w: ReturnType<typeof montar>) {
  await w.get('.cabecera button').trigger('click')
  await w.get('#contacto-tipo').setValue('TELEFONO')
  await w.get('#contacto-valor').setValue(' 099123456 ')
  await w.get('#contacto-origen').setValue(' Llamada ')
}
describe('datos de contacto', () => {
  it('consulta el CM y muestra los contactos con su origen', async () => {
    const w = montar()
    await flushPromises()
    expect(api.obtenerContactos).toHaveBeenCalledWith('123', expect.any(AbortSignal))
    expect(w.text()).toContain('ana@example.test')
    expect(w.text()).toContain('API Personas')
    expect(w.findAll('.contacto')).toHaveLength(1)
    w.unmount()
  })
  it('permite agregar cuando no hay contactos y conserva el origen indicado', async () => {
    vi.mocked(api.obtenerContactos).mockResolvedValue([])
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No hay contactos registrados')
    await nuevo(w)
    await w.get('.propietario input').setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.guardarContacto).toHaveBeenCalledWith('123', {
      tipoContacto: 'TELEFONO',
      valor: '099123456',
      origen: 'Llamada',
      esDeContribuyente: false,
    })
    expect(w.text()).toContain('099123456')
    expect(w.text()).toContain('Origen: Llamada')
    expect(w.text()).toContain('Contacto de un tercero')
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it('edita por ID sin duplicar el contacto y vuelve a consultarlo al montar', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#contacto-valor').setValue('nuevo@example.test')
    await w.get('#contacto-origen').setValue('Declaracion jurada')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.guardarContacto).toHaveBeenCalledWith('123', {
      ...contacto,
      valor: 'nuevo@example.test',
      origen: 'Declaracion jurada',
    })
    expect(w.findAll('.contacto')).toHaveLength(1)
    expect(w.text()).not.toContain('ana@example.test')
    vi.mocked(api.obtenerContactos).mockResolvedValue([
      { ...contacto, valor: 'nuevo@example.test', origen: 'Declaracion jurada' },
    ])
    w.unmount()
    const recargado = montar()
    await flushPromises()
    expect(recargado.text()).toContain('nuevo@example.test')
    expect(api.obtenerContactos).toHaveBeenCalledTimes(2)
    recargado.unmount()
  })
  it('exige origen y valor antes de guardar', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.cabecera button').trigger('click')
    await w.get('form').trigger('submit')
    expect(api.guardarContacto).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    await w.get('#contacto-valor').setValue('ana@example.test')
    await w.get('form').trigger('submit')
    expect(api.guardarContacto).not.toHaveBeenCalled()
    w.unmount()
  })
  it('rechaza un correo invalido', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.cabecera button').trigger('click')
    await w.get('#contacto-valor').setValue('correo-invalido')
    await w.get('#contacto-origen').setValue('Llamada')
    await w.get('form').trigger('submit')
    expect(api.guardarContacto).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    w.unmount()
  })
  it('cancelar una edicion conserva los datos originales', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#contacto-valor').setValue('otra@example.test')
    await w.get('form button[type="button"]').trigger('click')
    expect(api.guardarContacto).not.toHaveBeenCalled()
    expect(w.text()).toContain('ana@example.test')
    expect(w.text()).not.toContain('otra@example.test')
    w.unmount()
  })
  it('conserva el formulario si falla el guardado', async () => {
    vi.mocked(api.guardarContacto).mockRejectedValue(new Error('Sin conexion'))
    const w = montar()
    await flushPromises()
    await nuevo(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get<HTMLInputElement>('#contacto-valor').element.value).toBe(' 099123456 ')
    expect(w.findAll('.contacto')).toHaveLength(1)
    expect(w.text()).toContain('No se pudo guardar')
    w.unmount()
  })
  it('evita envios duplicados mientras esta guardando', async () => {
    let resolver!: (value: Contacto) => void
    vi.mocked(api.guardarContacto).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = montar()
    await flushPromises()
    await nuevo(w)
    await w.get('form').trigger('submit')
    await w.get('form').trigger('submit')
    expect(api.guardarContacto).toHaveBeenCalledTimes(1)
    expect(w.get('fieldset').attributes('disabled')).toBeDefined()
    resolver({ ...contacto, id: 8, tipoContacto: 'TELEFONO', valor: '099123456' })
    await flushPromises()
    expect(w.findAll('.contacto')).toHaveLength(2)
    w.unmount()
  })
  it('permite reintentar la carga sin mostrar un vacio falso', async () => {
    vi.mocked(api.obtenerContactos).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar')
    expect(w.text()).not.toContain('No hay contactos registrados')
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('ana@example.test')
    w.unmount()
  })
  it('ignora respuestas del contribuyente anterior', async () => {
    let resolver!: (value: Contacto[]) => void
    vi.mocked(api.obtenerContactos).mockReturnValueOnce(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = montar()
    await flushPromises()
    vi.mocked(api.obtenerContactos).mockResolvedValue([])
    await w.setProps({ cm: '456' })
    await flushPromises()
    resolver([contacto])
    await flushPromises()
    expect(w.text()).not.toContain('ana@example.test')
    expect(w.text()).toContain('No hay contactos registrados')
    w.unmount()
  })
  it('Administrador consulta, agrega y edita contactos indicando su origen', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }),
    )
    const w = montar()
    await flushPromises()
    expect(api.obtenerContactos).toHaveBeenCalledWith('123', expect.any(AbortSignal))
    expect(w.text()).toContain('ana@example.test')
    expect(w.text()).toContain('API Personas')
    expect(w.find('.cabecera button').exists()).toBe(true)
    expect(w.find('.editar').exists()).toBe(true)
    await nuevo(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.guardarContacto).toHaveBeenCalledWith('123', {
      tipoContacto: 'TELEFONO',
      valor: '099123456',
      origen: 'Llamada',
      esDeContribuyente: true,
    })
    await w.get('.editar').trigger('click')
    await w.get('#contacto-valor').setValue('nuevo@example.test')
    await w.get('#contacto-origen').setValue('Atención presencial')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.guardarContacto).toHaveBeenLastCalledWith('123', {
      ...contacto,
      valor: 'nuevo@example.test',
      origen: 'Atención presencial',
    })
    expect(w.findAll('.contacto')).toHaveLength(2)
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it.each([['ANALISTA'], ['ADMINISTRADOR', 'ANALISTA'], ['ADMINISTRADOR', 'NOTIFICADOR']])(
    'conserva la edición por los roles habilitados: %s',
    async (...roles: string[]) => {
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'usuario', roles }))
      const w = montar()
      await flushPromises()
      expect(w.find('.cabecera button').exists()).toBe(true)
      await w.get('.editar').trigger('click')
      expect(w.find('form').exists()).toBe(true)
      w.unmount()
    },
  )
})
