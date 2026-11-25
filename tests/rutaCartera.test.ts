import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Cada test carga el módulo de cero para no arrastrar la copia en memoria.
async function modulo() {
  vi.resetModules()
  return import('../src/modules/cartera/rutaCartera')
}

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('última ruta de la Cartera', () => {
  it('sin nada guardado vuelve a /cartera', async () => {
    const { rutaCarteraGuardada } = await modulo()
    expect(rutaCarteraGuardada()).toBe('/cartera')
  })

  it('guarda la ruta con búsqueda, filtros y página', async () => {
    const { recordarRutaCartera, rutaCarteraGuardada } = await modulo()
    recordarRutaCartera('/cartera?q=perez&origen=sucive&filas=50&pagina=3')
    expect(rutaCarteraGuardada()).toBe('/cartera?q=perez&origen=sucive&filas=50&pagina=3')
  })

  it('sobrevive a recargar la página (sessionStorage)', async () => {
    ;(await modulo()).recordarRutaCartera('/cartera?segmento=tardia')
    const { rutaCarteraGuardada } = await modulo()
    expect(rutaCarteraGuardada()).toBe('/cartera?segmento=tardia')
  })

  it.each(['/reportes', 'https://otro.sitio/cartera', '//otro.sitio', '/carteraX'])(
    'ignora rutas que no son de la Cartera: %s', async (ruta) => {
      const { recordarRutaCartera, rutaCarteraGuardada } = await modulo()
      recordarRutaCartera(ruta)
      sessionStorage.setItem('cartera:ultima-ruta', ruta)
      expect(rutaCarteraGuardada()).toBe('/cartera')
    })

  it('si el almacenamiento falla, usa la copia en memoria', async () => {
    const { recordarRutaCartera, rutaCarteraGuardada } = await modulo()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    recordarRutaCartera('/cartera?pagina=2')
    expect(rutaCarteraGuardada()).toBe('/cartera?pagina=2')
  })
})
