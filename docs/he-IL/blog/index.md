---
title: בלוג
editLink: false
lastUpdated: false
---

<script setup>
import { data as posts } from './posts.data.ts'
</script>

<div class="blog-index">
  <h1>בלוג</h1>
  <div v-if="posts.length === 0" class="no-posts">
    <p>אין עדיין פוסטים. חזרו בקרוב!</p>
  </div>
  <article v-for="post of posts" :key="post.url" class="post-card">
    <div class="post-header">
      <a :href="post.url" class="post-title">{{ post.title }}</a>
      <span v-if="post.draft" class="draft-badge">Draft</span>
    </div>
    <div class="post-meta">
      <time :datetime="post.date">{{ new Date(post.date).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }) }}</time>
      <span class="meta-sep">·</span>
      <span>{{ post.author }}</span>
    </div>
    <p class="post-desc">{{ post.description }}</p>
    <div v-if="post.tags.length" class="post-tags">
      <span v-for="tag of post.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </article>
</div>

<style>
.blog-index {
  padding: 8px 0;
}

.blog-index h1 {
  font-size: 32px;
  margin-bottom: 32px;
}

.no-posts {
  color: var(--vp-c-text-2);
}

.post-card {
  padding: 24px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.post-card:last-child {
  border-bottom: none;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.post-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  line-height: 1.4;
}

.post-title:hover {
  color: var(--vp-c-brand-1);
}

.draft-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
}

.post-meta {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-sep {
  opacity: 0.5;
}

.post-desc {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 10px;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}
</style>
