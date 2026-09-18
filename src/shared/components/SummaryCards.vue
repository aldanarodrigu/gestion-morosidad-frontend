<template>
  <section class="summary">
    <div class="summary-card">
      <span class="label">DEUDA TOTAL CARTERA</span>
      <strong>$ 250.330$</strong>
    </div>

    <div class="summary-card">
      <span class="label">CM EN MORA TEMPRANA</span>
      <strong>2</strong>
    </div>

    <div class="summary-card">
      <span class="label">CM EN MORA INICIAL</span>
      <strong>5</strong>
    </div>

    <div class="summary-card">
      <span class="label">CM EN MORA TARDIA</span>
      <strong>1</strong>
    </div>

    <div class="summary-card">
      <span class="label">SIN DATOS DE CONTACTO</span>
      <strong>1</strong>
    </div>

    <div class="summary-card">
      <span class="label">SIN GESTIÓN REALIZADA</span>
      <strong>1</strong>
    </div>
  </section>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: 1.4fr repeat(5, 1fr);
  gap: 1px;
  background-color: var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.summary-card {
  background-color: var(--color-background);
  padding: 10px 20px;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

strong {
  font-size: 24px;
  color: var(--color-text);
}
</style>
