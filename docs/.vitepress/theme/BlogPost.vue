<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { frontmatter, lang } = useData()
const route = useRoute()

const isBlogPost = computed(() => {
  const p = route.path
  // Match /blog/post or /xx-XX/blog/post, but not /blog/ index pages
  return /\/(blog\/)(?!$).+/.test(p)
})

const dateLocaleMap = {
  'en-US': 'en-US', 'en-GB': 'en-GB', 'es-419': 'es', 'es-ES': 'es-ES',
  'fr-FR': 'fr-FR', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ko-KR': 'ko-KR',
  'hi-IN': 'hi-IN', 'ar-SA': 'ar-SA', 'fil-PH': 'fil-PH', 'he-IL': 'he-IL',
  'fa-IR': 'fa-IR', 'pt-BR': 'pt-BR', 'de-DE': 'de-DE', 'it-IT': 'it-IT',
  'ja-JP': 'ja-JP', 'nb-NO': 'nb-NO', 'nl-NL': 'nl-NL', 'sv-SE': 'sv-SE',
  'ur-PK': 'ur-PK', 'kn-IN': 'kn-IN', 'mr-IN': 'mr-IN', 'ta-IN': 'ta-IN',
  'ms-MY': 'ms-MY',
}

const backLabel: Record<string, string> = {
  'en-US': '← Blog', 'en-GB': '← Blog', 'es-419': '← Blog', 'es-ES': '← Blog',
  'fr-FR': '← Blog', 'zh-CN': '← 博客', 'zh-TW': '← 部落格', 'ko-KR': '← 블로그',
  'hi-IN': '← ब्लॉग', 'ar-SA': 'المدونة →', 'fil-PH': '← Blog',
  'he-IL': 'בלוג →', 'fa-IR': 'وبلاگ →', 'pt-BR': '← Blog',
  'de-DE': '← Blog', 'it-IT': '← Blog',
  'ja-JP': '← ブログ', 'nb-NO': '← Blogg', 'nl-NL': '← Blog',
  'sv-SE': '← Blogg', 'ur-PK': 'بلاگ →', 'kn-IN': '← ಬ್ಲಾಗ್',
  'mr-IN': '← ब्लॉग', 'ta-IN': '← வலைப்பதிவு', 'ms-MY': '← Blog',
}

const blogLink = computed(() => {
  const l = lang.value
  if (!l || l === 'en-US') return '/blog/'
  return `/${l}/blog/`
})

const formattedDate = computed(() => {
  if (!frontmatter.value.date) return ''
  const locale = dateLocaleMap[lang.value] || 'en-US'
  const [y, m, d] = String(frontmatter.value.date).split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div v-if="isBlogPost" class="blog-post-header">
    <a :href="blogLink" class="blog-back-link">{{ backLabel[lang] || '← Blog' }}</a>
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
.blog-back-link {
  display: inline-block;
  font-size: 14px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  margin-bottom: 16px;
}

.blog-back-link:hover {
  text-decoration: underline;
}

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
