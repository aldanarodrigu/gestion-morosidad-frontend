import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/auth.service'
import type { LoginRequest } from '../types'

interface UsuarioSesion {
  id: number
  username: string
  rol: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UsuarioSesion | null>(JSON.parse(localStorage.getItem('user') ?? 'null'))

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

  return { token, user, isAuthenticated, login, logout }
})
