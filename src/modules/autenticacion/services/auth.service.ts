import { http } from '@/shared/api/http'
import type { LoginRequest, LoginResponse } from '../types'

export const authService = {
  async cambiarPassword(passwordActual: string, passwordNueva: string) {
    await http.put('/auth/me/password', { passwordActual, passwordNueva })
  },
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/auth/login', data)
    return res.data
  },
}
