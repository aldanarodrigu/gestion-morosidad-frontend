import { afterEach, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MainLayout from '../src/shared/layouts/MainLayout.vue'

enableAutoUnmount(afterEach)

it('el enlace «Saltar al contenido» lleva el foco al contenido principal sin cambiar la URL', async () => {
  const w = mount(MainLayout, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
      stubs: { NavBar: true, RouterView: true, DialogoSesionVencida: true },
    },
  })
  const enlace = w.get('a.saltar-contenido')
  expect(w.findAll('main')).toHaveLength(1)
  const antes = location.href
  await enlace.trigger('click')
  expect(document.activeElement?.id).toBe('contenido-principal')
  expect(location.href).toBe(antes)
})
