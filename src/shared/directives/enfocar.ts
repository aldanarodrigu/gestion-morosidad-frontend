import { nextTick, type Directive } from 'vue'

/**
 * v-enfocar: al mostrarse un formulario o panel, lleva el foco a su primer campo editable
 * (o al primer botón si no tiene campos), para que el teclado y los lectores de pantalla
 * continúen ahí. Uso: <form v-if="abierto" v-enfocar>.
 */
const SELECTOR =
  'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'

export const vEnfocar: Directive<HTMLElement> = {
  async mounted(el) {
    await nextTick()
    const destino =
      el.querySelector<HTMLElement>(SELECTOR) ??
      el.querySelector<HTMLElement>('button:not([disabled])')
    destino?.focus()
  },
}
