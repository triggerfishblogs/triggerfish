import { createContentLoader } from "vitepress";

interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  author: string;
  tags?: string[];
  draft?: boolean;
}

export interface Post {
  title: string;
  url: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  draft: boolean;
}

export default createContentLoader("mr-IN/blog/*.md", {
  transform(raw): Post[] {
    return raw
      .filter((page) => {
        if (page.url === "/mr-IN/blog/") return false;
        const fm = page.frontmatter as PostFrontmatter;
        if (process.env.NODE_ENV === "production" && fm.draft) return false;
        return true;
      })
      .map((page) => {
        const fm = page.frontmatter as PostFrontmatter;
        return {
          title: fm.title,
          url: page.url,
          date: fm.date,
          description: fm.description,
          author: fm.author || "Triggerfish",
          tags: fm.tags || [],
          draft: fm.draft || false,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
});
