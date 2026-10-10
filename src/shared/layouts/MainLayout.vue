<script setup lang="ts">
import NavBar from '../components/NavBar.vue'
</script>

<template>
  <div class="app-layout">
    <NavBar />

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background-color: var(--color-surface);
}
</style>
