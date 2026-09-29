<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const etiquetasRol: Record<string, string> = {
  ADMIN: 'Administrador',
}

const rolLabel = computed(() => {
  const rol = auth.user?.rol ?? ''
  return etiquetasRol[rol] ?? rol
})

function cerrarSesion() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-brand">
      <img src="../../assets/images/logo-intendencia.png" alt="Intendencia de San José" />

      <div class="navbar-title">
        <span class="institution-name">Intendencia de San José</span>
        <span class="system-name">Gestión de Morosidad</span>
      </div>
    </div>

    <div class="navbar-right">
      <nav class="navbar-nav">
        <RouterLink to="/cartera" class="nav-link">Cartera</RouterLink>
        <RouterLink to="/convenios" class="nav-link">Convenios</RouterLink>
        <RouterLink to="/configuracion" class="nav-link">Configuración</RouterLink>
        <RouterLink to="/reportes" class="nav-link">Reportes</RouterLink>
      </nav>

      <div class="user-session">
        <UserCircleIcon class="user-icon" />

        <div class="user-info">
          <span class="user-name">{{ auth.user?.username }}</span>
          <span class="user-role">{{ rolLabel }}</span>
        </div>

        <button
          type="button"
          class="logout-button"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          @click="cerrarSesion"
        >
          <ArrowRightOnRectangleIcon class="logout-icon" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  height: 70px;
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 var(--spacing-lg);

  background-color: var(--color-primary-dark);
  color: white;

  box-shadow: var(--shadow-sm);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  color: white;
}

.navbar-brand img {
  height: 55px;
  width: auto;
  object-fit: contain;
}

.navbar-title {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.institution-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 600;
}

.system-name {
  margin-top: 2px;

  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 400;

  opacity: 0.85;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.nav-link {
  position: relative;

  padding: 22px 16px 19px;

  color: rgba(255, 255, 255, 0.75);

  font-size: 14px;
  font-weight: 500;

  text-decoration: none;

  transition: color 0.2s ease;
}

.nav-link:hover {
  color: white;
}

.nav-link.router-link-active {
  color: white;
}

.nav-link.router-link-active::after {
  content: '';

  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;

  height: 2px;

  background-color: white;
}

.user-session {
  display: flex;
  align-items: center;
  gap: 8px;

  padding-left: var(--spacing-lg);

  border-left: 1px solid rgba(255, 255, 255, 0.25);

  color: white;
}

.user-icon {
  width: 30px;
  height: 30px;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
}

.user-role {
  margin-top: 3px;

  font-size: 10px;
  font-weight: 400;

  opacity: 0.7;
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 6px;
  margin-left: var(--spacing-sm);

  color: rgba(255, 255, 255, 0.75);
  background: transparent;
  border: none;

  transition: color 0.2s ease;
}

.logout-button:hover {
  color: white;
}

.logout-icon {
  width: 22px;
  height: 22px;
}
</style>
