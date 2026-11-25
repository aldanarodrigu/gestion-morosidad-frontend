<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bars3Icon, ChevronDownIcon, UserCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const etiquetasRol: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  NOTIFICADOR: 'Notificador',
  ANALISTA: 'Analista',
}

const rolLabel = computed(() =>
  (auth.user?.roles ?? []).map((rol) => etiquetasRol[rol] ?? rol).join(' / '),
)

interface Seccion {
  to: string
  etiqueta: string
  corta?: string
  visible: boolean
  incluye?: string[]
}

const secciones = computed<Seccion[]>(() =>
  [
    {
      to: '/cartera',
      etiqueta: 'Cartera',
      visible: auth.puedeVerCartera,
      incluye: ['/contribuyentes'],
    },
    {
      to: '/cancelaciones',
      etiqueta: 'Cancelaciones',
      visible: auth.puedeVerCartera,
    },
    {
      to: '/convenios',
      etiqueta: 'Convenios',
      visible: auth.puedeVerCartera,
    },
    { to: '/reportes', etiqueta: 'Reportes', visible: auth.puedeVerCartera },
    {
      to: '/comparar-cartera',
      etiqueta: 'Comparar cartera',
      corta: 'Comparar',
      visible: auth.puedeVerCartera,
    },
    {
      to: '/configuracion',
      etiqueta: 'Configuración',
      visible: auth.puedeConfigurar,
    },
  ].filter((s) => s.visible),
)

const rutaActual = computed(() => router.currentRoute?.value?.path ?? '')
function incluida(seccion: Seccion) {
  return (seccion.incluye ?? []).some((ruta) => rutaActual.value.startsWith(ruta))
}

const menuAbierto = ref(false)
const usuarioAbierto = ref(false)
const botonMenu = ref<HTMLButtonElement | null>(null)
const botonUsuario = ref<HTMLButtonElement | null>(null)
const navegacion = ref<HTMLElement | null>(null)
const menuUsuario = ref<HTMLElement | null>(null)

async function alternarMenu() {
  usuarioAbierto.value = false
  menuAbierto.value = !menuAbierto.value
  if (menuAbierto.value) {
    await nextTick()
    navegacion.value?.querySelector<HTMLElement>('a')?.focus()
  }
}

async function alternarUsuario() {
  menuAbierto.value = false
  usuarioAbierto.value = !usuarioAbierto.value
  if (usuarioAbierto.value) {
    await nextTick()
    menuUsuario.value?.querySelector<HTMLElement>('a, button')?.focus()
  }
}

function cerrarMenus(devolverFoco = false) {
  const habiaMenu = menuAbierto.value
  const habiaUsuario = usuarioAbierto.value
  menuAbierto.value = false
  usuarioAbierto.value = false
  if (!devolverFoco) return
  if (habiaMenu) botonMenu.value?.focus()
  else if (habiaUsuario) botonUsuario.value?.focus()
}

function alPresionarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && (menuAbierto.value || usuarioAbierto.value)) {
    evento.preventDefault()
    cerrarMenus(true)
  }
}

// Cierra el menú abierto al tocar o hacer clic fuera de él y de su botón.
function alTocarAfuera(evento: Event) {
  const destino = evento.target as Node
  if (
    menuAbierto.value &&
    !navegacion.value?.contains(destino) &&
    !botonMenu.value?.contains(destino)
  ) {
    menuAbierto.value = false
  }
  if (
    usuarioAbierto.value &&
    !menuUsuario.value?.contains(destino) &&
    !botonUsuario.value?.contains(destino)
  ) {
    usuarioAbierto.value = false
  }
}

// Si el foco sale del menú con Tab, se cierra para no dejar un panel abierto detrás.
function alSalirFoco(evento: FocusEvent, menu: 'navegacion' | 'usuario') {
  const siguiente = evento.relatedTarget as Node | null
  if (!siguiente) return
  if (
    menu === 'navegacion' &&
    !navegacion.value?.contains(siguiente) &&
    !botonMenu.value?.contains(siguiente)
  ) {
    menuAbierto.value = false
  }
  if (
    menu === 'usuario' &&
    !menuUsuario.value?.contains(siguiente) &&
    !botonUsuario.value?.contains(siguiente)
  ) {
    usuarioAbierto.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', alPresionarTecla)
  document.addEventListener('pointerdown', alTocarAfuera)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', alPresionarTecla)
  document.removeEventListener('pointerdown', alTocarAfuera)
})

function cerrarSesion() {
  cerrarMenus()
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="navbar">
    <button
      ref="botonMenu"
      type="button"
      class="boton-menu"
      :aria-expanded="menuAbierto"
      aria-controls="navegacion-principal"
      :aria-label="menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'"
      @click="alternarMenu"
    >
      <XMarkIcon v-if="menuAbierto" class="icono" aria-hidden="true" />
      <Bars3Icon v-else class="icono" aria-hidden="true" />
    </button>

    <RouterLink :to="auth.inicio" class="marca" aria-label="Gestión de Morosidad, ir al inicio">
      <img src="../../assets/images/logo-intendencia.png" alt="" />
      <span class="marca-textos">
        <span class="sistema">Gestión de Morosidad</span>
        <span class="institucion">Intendencia de San José</span>
      </span>
    </RouterLink>

    <div v-if="menuAbierto" class="fondo-menu" aria-hidden="true" @click="cerrarMenus()" />

    <nav
      id="navegacion-principal"
      ref="navegacion"
      class="navegacion"
      :class="{ abierta: menuAbierto }"
      aria-label="Principal"
      @focusout="alSalirFoco($event, 'navegacion')"
    >
      <div class="cabecera-panel">
        <p class="titulo-panel">Secciones</p>
        <button
          type="button"
          class="cerrar-panel"
          aria-label="Cerrar menú de navegación"
          @click="cerrarMenus(true)"
        >
          <XMarkIcon class="icono" aria-hidden="true" />
        </button>
      </div>
      <ul>
        <li v-for="seccion in secciones" :key="seccion.to">
          <RouterLink
            :to="seccion.to"
            class="enlace"
            :class="{ 'router-link-active': incluida(seccion) }"
            @click="cerrarMenus()"
          >
            <span class="etiqueta" :class="{ 'con-corta': seccion.corta }">{{
              seccion.etiqueta
            }}</span>
            <span v-if="seccion.corta" class="etiqueta-corta">{{ seccion.corta }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="usuario">
      <button
        ref="botonUsuario"
        type="button"
        class="boton-usuario"
        :aria-expanded="usuarioAbierto"
        aria-controls="menu-usuario"
        :aria-label="`Menú de la cuenta de ${auth.user?.username ?? 'usuario'}`"
        @click="alternarUsuario"
      >
        <UserCircleIcon class="icono" aria-hidden="true" />
        <span class="usuario-textos">
          <span class="usuario-nombre">{{ auth.user?.username }}</span>
          <span class="usuario-rol">{{ rolLabel }}</span>
        </span>
        <ChevronDownIcon class="flecha" :class="{ girada: usuarioAbierto }" aria-hidden="true" />
      </button>

      <div
        v-show="usuarioAbierto"
        id="menu-usuario"
        ref="menuUsuario"
        class="menu-usuario"
        @focusout="alSalirFoco($event, 'usuario')"
      >
        <div class="cuenta">
          <span class="cuenta-nombre">{{ auth.user?.username }}</span>
          <span class="cuenta-rol">{{ rolLabel }}</span>
        </div>
        <RouterLink
          :to="{ name: 'cambiar-contrasena' }"
          class="opcion-usuario"
          @click="cerrarMenus()"
        >
          Cambiar contraseña
        </RouterLink>
        <button type="button" class="opcion-usuario salir" @click="cerrarSesion">
          Cerrar sesión
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  --navbar-alto: 64px;
  /* Gris oscuro para texto e íconos: ~10:1 de contraste sobre blanco */
  --navbar-texto: #344054;
  --navbar-texto-suave: var(--color-text-secondary);
  --navbar-destacado: var(--color-primary);

  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  height: var(--navbar-alto);
  padding: 0 var(--spacing-lg);
  background-color: var(--color-surface);
  color: var(--navbar-texto);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.icono {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

button,
.enlace,
.marca,
.opcion-usuario {
  border-radius: var(--radius-sm);
}

button:focus-visible,
.enlace:focus-visible,
.marca:focus-visible,
.opcion-usuario:focus-visible {
  outline: 2px solid var(--navbar-destacado);
  outline-offset: 2px;
}

/* Marca: escudo + nombre como una unidad */
.marca {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  height: 40px;
  border-radius: 0;
  color: var(--color-text);
}

/* El PNG trae un margen transparente (más ancho a la derecha); el margen negativo
   lo compensa para que el escudo quede visualmente pegado al texto y centrado. */
.marca img {
  display: block;
  height: 44px;
  width: auto;
  margin: 0 -2px 0 -1px;
  object-fit: contain;
}

.marca-textos {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  line-height: 1.15;
}

.sistema {
  font-family: 'Montserrat', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  white-space: nowrap;
}

.institucion {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--navbar-texto-suave);
  white-space: nowrap;
}

/* Navegación de escritorio */
.navegacion {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.navegacion ul {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.navegacion li {
  display: flex;
}

.cabecera-panel {
  display: none;
}

.enlace {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  margin: 10px 0;
  color: var(--navbar-texto);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.15s ease;
}

/* Hover sutil: solo cambia el color del texto */
.enlace:hover {
  color: var(--navbar-destacado);
}

.enlace.router-link-active {
  color: var(--navbar-destacado);
  font-weight: 600;
}

/* Línea del estado activo apoyada sobre el borde inferior del navbar */
.enlace.router-link-active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -10px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background-color: var(--navbar-destacado);
}

.etiqueta-corta {
  display: none;
}

/* Menú de usuario */
.usuario {
  position: relative;
  margin-left: auto;
  flex-shrink: 0;
}

.boton-usuario {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: var(--navbar-texto);
  text-align: left;
  transition: color 0.15s ease;
}

.boton-usuario:hover,
.boton-usuario[aria-expanded='true'] {
  color: var(--navbar-destacado);
}

.boton-usuario .icono {
  width: 28px;
  height: 28px;
}

.usuario-textos {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.usuario-nombre {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.usuario-rol {
  font-size: 12px;
  color: var(--navbar-texto-suave);
}

.flecha {
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
}

.flecha.girada {
  transform: rotate(180deg);
}

.menu-usuario {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 40;
  width: 240px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
}

.cuenta {
  display: flex;
  flex-direction: column;
  padding: 8px 10px 12px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.cuenta-nombre {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.cuenta-rol {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.opcion-usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  text-align: left;
}

.opcion-usuario:hover {
  background: var(--color-background);
}

.opcion-usuario:focus-visible {
  outline-color: var(--color-primary);
  outline-offset: -2px;
}

.opcion-usuario.salir {
  color: var(--color-tardia);
}

/* Botón hamburguesa: solo en pantallas chicas */
.boton-menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--navbar-texto);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.boton-menu:hover,
.boton-menu[aria-expanded='true'] {
  color: var(--navbar-destacado);
}

.fondo-menu {
  display: none;
}

/* Notebooks chicas y tablet horizontal: menú compacto en una sola fila */
@media (max-width: 1365px) {
  .navbar {
    gap: var(--spacing-md);
    padding: 0 var(--spacing-md);
  }

  .enlace {
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
  }

  .enlace.router-link-active::after {
    left: 10px;
    right: 10px;
  }

  .etiqueta.con-corta {
    display: none;
  }

  .etiqueta-corta {
    display: inline;
  }

  .usuario-textos {
    display: none;
  }
}

@media (max-width: 1199px) {
  .marca-textos {
    display: none;
  }
}

/* Tablet vertical y móvil: menú hamburguesa con panel lateral */
@media (max-width: 1023px) {
  .boton-menu {
    display: flex;
  }

  .marca-textos {
    display: flex;
  }

  .fondo-menu {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 35;
    background: rgba(16, 24, 40, 0.45);
  }

  .navegacion {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 36;
    display: none;
    flex: none;
    width: min(300px, 85vw);
    height: 100vh;
    height: 100dvh;
    padding: var(--spacing-md) var(--spacing-sm);
    overflow-y: auto;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-md);
  }

  .navegacion.abierta {
    display: block;
  }

  .cabecera-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 8px 12px;
  }

  .cerrar-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
  }

  .cerrar-panel:hover {
    color: var(--color-text);
    background: var(--color-background);
  }

  .cerrar-panel:focus-visible {
    outline-color: var(--color-primary);
  }

  .titulo-panel {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .navegacion ul {
    flex-direction: column;
    height: auto;
    gap: 2px;
  }

  .enlace {
    flex: 1;
    gap: 12px;
    margin: 0;
    padding: 12px;
    color: var(--color-text);
    font-size: 15px;
  }

  .enlace:hover {
    color: var(--color-primary);
  }

  .enlace.router-link-active {
    color: var(--color-primary);
    background-color: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  }

  .enlace.router-link-active::after {
    left: 0;
    right: auto;
    top: 8px;
    bottom: 8px;
    width: 3px;
    height: auto;
    border-radius: 0 3px 3px 0;
    background-color: var(--color-primary);
  }

  .enlace:focus-visible {
    outline-color: var(--color-primary);
    outline-offset: -2px;
  }

  /* En el panel hay espacio para la etiqueta completa */
  .etiqueta.con-corta {
    display: inline;
  }

  .etiqueta-corta {
    display: none;
  }
}

@media (max-width: 599px) {
  .navbar {
    gap: var(--spacing-sm);
    padding: 0 var(--spacing-sm);
  }

  .marca {
    gap: 8px;
  }

  .marca img {
    height: 38px;
  }

  .institucion {
    display: none;
  }

  .sistema {
    font-size: 14px;
  }

  .boton-usuario {
    padding: 6px;
  }

  .boton-usuario .flecha {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .enlace,
  .flecha,
  .boton-usuario,
  .boton-menu {
    transition: none;
  }
}
</style>
