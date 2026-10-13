import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/auth.service'
import type { LoginRequest } from '../types'
import { http } from '@/shared/api/http'

interface UsuarioSesion {
  id: number
  username: string
  roles: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const almacenado = JSON.parse(localStorage.getItem('user') ?? 'null')
  const user = ref<UsuarioSesion | null>(
    almacenado
      ? {
          id: almacenado.id,
          username: almacenado.username,
          roles: almacenado.roles ?? (almacenado.rol ? [almacenado.rol] : []),
        }
      : null,
  )
  function tieneRol(rol: string) {
    return user.value?.roles.includes(rol) ?? false
  }
  async function actualizarSesion() {
    const { data } = await http.get<UsuarioSesion>('/auth/me')
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  const puedeVerCartera = computed(
    () => tieneRol('ADMINISTRADOR') || tieneRol('NOTIFICADOR') || tieneRol('ANALISTA'),
  )
  const inicio = computed(() => (puedeVerCartera.value ? '/cartera' : '/configuracion'))
  const isAuthenticated = computed(() => !!token.value)

  async function login(credentials: LoginRequest) {
    const { token: t, ...datos } = await authService.login(credentials)
    token.value = t
    user.value = datos
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(datos))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    tieneRol,
    actualizarSesion,
    puedeVerCartera,
    inicio,
  }
})
