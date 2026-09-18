<script setup lang="ts">
import { UserCircleIcon } from '@heroicons/vue/24/outline'
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

        <RouterLink to="/configuracion" class="nav-link"> Configuración </RouterLink>

        <RouterLink to="/reportes" class="nav-link">Reportes</RouterLink>
      </nav>

      <div class="user-placeholder">
        <UserCircleIcon class="user-icon" />

        <div class="user-info">
          <span class="user-name">Usuario</span>
          <span class="user-role">Administrador</span>
        </div>
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

.user-placeholder {
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
</style>
