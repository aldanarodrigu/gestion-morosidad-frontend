import { http } from '@/shared/api/http'
import type { LoginRequest, LoginResponse } from '../types'

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/auth/login', data)
    return res.data
  },
}
