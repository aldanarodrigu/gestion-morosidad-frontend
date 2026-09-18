<script setup lang="ts">
import NavBar from '../components/NavBar.vue'
import SummaryCards from '../components/SummaryCards.vue'
</script>

<template>
  <div class="app-layout">
    <NavBar />

    <SummaryCards />

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 0;
  background-color: var(--color-surface);
}
</style>
