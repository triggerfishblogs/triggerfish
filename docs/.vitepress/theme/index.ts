import DefaultTheme from 'vitepress/theme'
import ComingSoon from './ComingSoon.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ComingSoon', ComingSoon)
  }
}
