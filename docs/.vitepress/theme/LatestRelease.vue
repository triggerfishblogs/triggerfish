<script setup>
import { ref, computed, onMounted } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()

const version = ref('')
const publishedAt = ref('')
const loaded = ref(false)

const i18n = {
  'en-US': { pre: 'The latest version is', mid: 'and it was released', post: '' },
  'en-GB': { pre: 'The latest version is', mid: 'and it was released', post: '' },
  'es-419': { pre: 'La última versión es', mid: 'y fue publicada el', post: '' },
  'es-ES': { pre: 'La última versión es', mid: 'y fue publicada el', post: '' },
  'fr-FR': { pre: 'La dernière version est', mid: 'et elle a été publiée le', post: '' },
  'zh-CN': { pre: '最新版本为', mid: '，发布于', post: '' },
  'zh-TW': { pre: '最新版本為', mid: '，發佈於', post: '' },
  'ko-KR': { pre: '최신 버전은', mid: '이며,', post: '에 출시되었습니다' },
  'hi-IN': { pre: 'नवीनतम संस्करण', mid: 'है और यह', post: 'को जारी किया गया' },
  'ar-SA': { pre: 'أحدث إصدار هو', mid: 'وقد صدر في', post: '' },
  'fil-PH': { pre: 'Ang pinakabagong bersyon ay', mid: 'at inilabas noong', post: '' },
  'he-IL': { pre: 'הגרסה האחרונה היא', mid: 'והיא שוחררה ב-', post: '' },
  'fa-IR': { pre: 'آخرین نسخه', mid: 'است و در تاریخ', post: 'منتشر شده است' },
  'pt-BR': { pre: 'A versão mais recente é', mid: 'e foi lançada em', post: '' },
  'de-DE': { pre: 'Die neueste Version ist', mid: 'und wurde am', post: 'veröffentlicht' },
  'it-IT': { pre: "L'ultima versione è", mid: 'ed è stata rilasciata il', post: '' },
}

const t = computed(() => i18n[lang.value] || i18n['en-US'])

const dateLocaleMap = {
  'en-US': 'en-US', 'en-GB': 'en-GB', 'es-419': 'es', 'es-ES': 'es-ES',
  'fr-FR': 'fr-FR', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ko-KR': 'ko-KR',
  'hi-IN': 'hi-IN', 'ar-SA': 'ar-SA', 'fil-PH': 'fil-PH', 'he-IL': 'he-IL',
  'fa-IR': 'fa-IR', 'pt-BR': 'pt-BR', 'de-DE': 'de-DE', 'it-IT': 'it-IT',
}

const date = computed(() => {
  if (!publishedAt.value) return ''
  const locale = dateLocaleMap[lang.value] || 'en-US'
  return new Date(publishedAt.value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

onMounted(async () => {
  try {
    const res = await fetch(
      'https://api.github.com/repos/greghavens/triggerfish/releases/latest'
    )
    if (res.ok) {
      const data = await res.json()
      version.value = data.tag_name
      publishedAt.value = data.published_at
      loaded.value = true
    }
  } catch {
    // Silent — component just won't render
  }
})
</script>

<template>
  <p v-if="loaded" class="latest-release">
    {{ t.pre }}
    <a :href="`https://github.com/greghavens/triggerfish/releases/tag/${version}`">
      <strong>{{ version }}</strong>
    </a>
    {{ t.mid }} <strong>{{ date }}</strong>{{ t.post ? ' ' + t.post : '' }}.
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
