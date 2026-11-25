import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import NavBar from '../src/shared/components/NavBar.vue'

const push = vi.fn()
const currentRoute = ref({ path: '/cartera' })
vi.mock('vue-router', () => ({ useRouter: () => ({ push, currentRoute }) }))

const RouterLinkStub = {
  props: ['to'],
  template: '<a href="#" @click.prevent="$emit(\'click\', $event)"><slot /></a>',
}

let w: VueWrapper | undefined
function montar(roles = ['ADMINISTRADOR']) {
  useAuthStore().user = { id: 1, username: 'mlopez', roles }
  w = mount(NavBar, { attachTo: document.body, global: { stubs: { RouterLink: RouterLinkStub } } })
  return w
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
  currentRoute.value = { path: '/cartera' }
})
afterEach(() => {
  w?.unmount()
  w = undefined
})

describe('menú de navegación', () => {
  it('el botón hamburguesa abre y cierra el panel y actualiza su estado accesible', async () => {
    const w = montar()
    const boton = w.get('.boton-menu')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(boton.attributes('aria-controls')).toBe('navegacion-principal')
    expect(boton.attributes('aria-label')).toBe('Abrir menú de navegación')

    await boton.trigger('click')
    expect(boton.attributes('aria-expanded')).toBe('true')
    expect(boton.attributes('aria-label')).toBe('Cerrar menú de navegación')
    expect(w.get('nav').classes()).toContain('abierta')

    await boton.trigger('click')
    expect(w.get('nav').classes()).not.toContain('abierta')
  })

  it('cierra el panel al elegir una sección', async () => {
    const w = montar()
    await w.get('.boton-menu').trigger('click')
    await w.findAll('nav a')[1]!.trigger('click')
    expect(w.get('nav').classes()).not.toContain('abierta')
  })

  it('cierra con Escape y devuelve el foco al botón', async () => {
    const w = montar()
    await w.get('.boton-menu').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.get('nav').classes()).not.toContain('abierta')
    expect(document.activeElement).toBe(w.get('.boton-menu').element)
  })

  it('cierra al tocar afuera del panel', async () => {
    const w = montar()
    await w.get('.boton-menu').trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(w.get('nav').classes()).not.toContain('abierta')
  })

  it('marca Cartera como activa también en la ficha del contribuyente', () => {
    currentRoute.value = { path: '/contribuyentes/15' }
    const w = montar(['NOTIFICADOR'])
    const cartera = w.findAll('nav a').find((a) => a.text().includes('Cartera'))!
    expect(cartera.classes()).toContain('router-link-active')
  })

  it('mantiene los permisos: sin Administrador no aparece Configuración', () => {
    const w = montar(['ANALISTA'])
    const textos = w.findAll('nav a').map((a) => a.text())
    expect(textos).toHaveLength(5)
    expect(textos.join(' ')).not.toContain('Configuración')
  })
})

describe('menú de usuario', () => {
  it('muestra nombre, rol y las opciones de la cuenta', async () => {
    const w = montar(['ADMINISTRADOR', 'NOTIFICADOR'])
    const boton = w.get('.boton-usuario')
    expect(w.get('#menu-usuario').isVisible()).toBe(false)
    await boton.trigger('click')
    expect(boton.attributes('aria-expanded')).toBe('true')
    const menu = w.get('#menu-usuario')
    expect(menu.isVisible()).toBe(true)
    expect(menu.text()).toContain('mlopez')
    expect(menu.text()).toContain('Administrador / Notificador')
    expect(menu.text()).toContain('Cambiar contraseña')
    expect(menu.text()).toContain('Cerrar sesión')
  })

  it('cierra con Escape y devuelve el foco al botón de la cuenta', async () => {
    const w = montar()
    await w.get('.boton-usuario').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.get('#menu-usuario').isVisible()).toBe(false)
    expect(document.activeElement).toBe(w.get('.boton-usuario').element)
  })

  it('cerrar sesión limpia la sesión y va al login', async () => {
    const w = montar()
    const auth = useAuthStore()
    auth.token = 'token-prueba'
    await w.get('.boton-usuario').trigger('click')
    await w.get('.salir').trigger('click')
    expect(auth.isAuthenticated).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })
})
