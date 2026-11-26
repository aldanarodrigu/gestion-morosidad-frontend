import axios from 'axios'

export const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Qué hacer cuando el backend rechaza la sesión (401) de alguien que estaba ingresado.
 * Dentro del sistema, el layout registra un manejador que pide volver a ingresar sin salir de la
 * pantalla (así no se pierde lo que se estaba escribiendo). Sin manejador —por ejemplo, al abrir
 * la aplicación con un token vencido— se va directo a la pantalla de ingreso.
 */
let manejarSesionVencida: (() => void) | null = null

export function alVencerSesion(manejador: (() => void) | null) {
  manejarSesionVencida = manejador
}

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login')
    const habiaSesion = !!localStorage.getItem('token')
    if (error.response?.status === 401 && !esLogin && habiaSesion) {
      if (manejarSesionVencida) {
        manejarSesionVencida()
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
