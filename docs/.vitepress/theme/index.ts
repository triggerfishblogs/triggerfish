import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import ComingSoon from "./ComingSoon.vue";
import StatusBadge from "./StatusBadge.vue";
import LatestRelease from "./LatestRelease.vue";
import BlogPost from "./BlogPost.vue";
import "./custom.css";
import "./rtl.css";

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "doc-before": () => h(BlogPost),
    });
  },
  enhanceApp({ app }) {
    app.component("ComingSoon", ComingSoon);
    app.component("StatusBadge", StatusBadge);
    app.component("LatestRelease", LatestRelease);
  },
};
