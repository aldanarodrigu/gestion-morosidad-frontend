<script setup lang="ts">
import { WrenchScrewdriverIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

defineProps<{ titulo: string }>()
const auth = useAuthStore()
</script>

<template>
  <section class="en-desarrollo" aria-labelledby="en-desarrollo-titulo">
    <div class="tarjeta">
      <div class="icono-contenedor" aria-hidden="true"><WrenchScrewdriverIcon class="icono" /></div>
      <h1 id="en-desarrollo-titulo">{{ titulo }}</h1>
      <h2>Sección en desarrollo</h2>
      <p>Estamos trabajando en esta sección. Estará disponible próximamente.</p>
      <RouterLink :to="auth.inicio" class="volver">
        <ArrowLeftIcon class="flecha" aria-hidden="true" />
        {{ auth.puedeVerCartera ? 'Volver a la cartera' : 'Volver al inicio' }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.en-desarrollo {
  flex: 1;
  display: grid;
  place-items: center;
  padding: var(--spacing-xl) var(--spacing-md);
  background: var(--color-background);
}
.tarjeta {
  width: min(100%, 560px);
  padding: 40px var(--spacing-xl);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.icono-contenedor {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto var(--spacing-lg);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-primary);
}
.icono {
  width: 28px;
  height: 28px;
}
h1 {
  font-size: 20px;
  font-weight: 700;
}
h2 {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}
p {
  margin: 12px 0 var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: 13px;
}
.volver {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
}
.volver:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}
.volver:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.flecha {
  width: 16px;
  height: 16px;
}
@media (max-width: 600px) {
  .tarjeta {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
}
</style>
