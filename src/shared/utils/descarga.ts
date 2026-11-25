/**
 * Descarga un archivo generado en memoria (Excel, CSV...) con el nombre indicado.
 * La URL temporal se libera un segundo después, cuando el navegador ya inició la descarga.
 */
export function descargarArchivo(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  try {
    enlace.click()
  } finally {
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
