<script setup>
defineProps({
  inline: { type: Boolean, default: false }
})
</script>

<template>
  <div v-if="!inline" class="coming-soon-banner">
    <span class="coming-soon-icon">🚧</span>
    <span class="coming-soon-text">
      <strong>Coming Soon</strong> — This feature is planned but not yet implemented.
    </span>
  </div>
  <span v-else class="coming-soon-inline">🚧 Coming Soon</span>
</template>

<style scoped>
.coming-soon-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin: 16px 0 24px;
  border-radius: 8px;
  border: 1px solid var(--coming-soon-border);
  background: var(--coming-soon-bg);
  color: var(--coming-soon-text);
  font-size: 15px;
  line-height: 1.5;
}

.coming-soon-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.coming-soon-text strong {
  color: var(--coming-soon-strong);
}

.coming-soon-inline {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: var(--coming-soon-bg);
  border: 1px solid var(--coming-soon-border);
  color: var(--coming-soon-strong);
  vertical-align: middle;
  margin-left: 8px;
}
</style>
