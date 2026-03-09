<script setup>
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { frontmatter } = useData()
const route = useRoute()

const isBlogPost = computed(() =>
  route.path.startsWith('/blog/') && route.path !== '/blog/'
)

const formattedDate = computed(() => {
  if (!frontmatter.value.date) return ''
  return new Date(frontmatter.value.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div v-if="isBlogPost" class="blog-post-header">
    <h1>{{ frontmatter.title }}</h1>
    <div class="blog-post-meta">
      <time v-if="formattedDate">{{ formattedDate }}</time>
      <span v-if="formattedDate && frontmatter.author" class="meta-sep">·</span>
      <span v-if="frontmatter.author">{{ frontmatter.author }}</span>
    </div>
    <div v-if="frontmatter.tags?.length" class="blog-post-tags">
      <span v-for="tag of frontmatter.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style>
.blog-post-header {
  margin-bottom: 32px;
}

.blog-post-header h1 {
  font-size: 32px;
  line-height: 1.3;
  margin: 0 0 12px;
}

.blog-post-meta {
  font-size: 15px;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.blog-post-meta .meta-sep {
  opacity: 0.5;
}

.blog-post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blog-post-tags .tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}
</style>
