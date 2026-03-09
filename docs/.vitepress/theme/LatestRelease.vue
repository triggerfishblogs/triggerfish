<script setup>
import { ref, onMounted } from 'vue'

const version = ref('')
const date = ref('')
const loaded = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(
      'https://api.github.com/repos/greghavens/triggerfish/releases/latest'
    )
    if (res.ok) {
      const data = await res.json()
      version.value = data.tag_name
      date.value = new Date(data.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      loaded.value = true
    }
  } catch {
    // Silent — component just won't render
  }
})
</script>

<template>
  <p v-if="loaded" class="latest-release">
    The latest version is
    <a :href="`https://github.com/greghavens/triggerfish/releases/tag/${version}`">
      <strong>{{ version }}</strong>
    </a>
    and it was released <strong>{{ date }}</strong>.
  </p>
</template>

<style scoped>
.latest-release {
  text-align: center;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 1.5rem 0 0;
  letter-spacing: 0.01em;
}
.latest-release a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.latest-release a:hover {
  text-decoration: underline;
}
.latest-release strong {
  color: rgba(255, 255, 255, 0.9);
}
.latest-release a strong {
  color: var(--vp-c-brand-1);
}
</style>
