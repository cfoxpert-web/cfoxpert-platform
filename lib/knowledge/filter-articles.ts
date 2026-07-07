import type { Article, ArticleCategory } from "@/types";

export interface ArticleFilters {
  category: ArticleCategory | "All";
  searchTerm: string;
}

export function filterArticles(articles: Article[], filters: ArticleFilters): Article[] {
  const term = filters.searchTerm.trim().toLowerCase();

  return articles.filter((article) => {
    const matchesCategory = filters.category === "All" || article.category === filters.category;
    const matchesSearch =
      !term ||
      article.title.toLowerCase().includes(term) ||
      article.description.toLowerCase().includes(term) ||
      article.category.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
}

export function paginateArticles(articles: Article[], page: number, pageSize: number): Article[] {
  const start = (page - 1) * pageSize;
  return articles.slice(start, start + pageSize);
}

export function totalPages(articleCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(articleCount / pageSize));
}

export function getRelatedArticles(articles: Article[], current: Article, limit = 3): Article[] {
  return articles
    .filter((a) => a.slug !== current.slug && a.category === current.category)
    .slice(0, limit)
    .concat(
      articles.filter((a) => a.slug !== current.slug && a.category !== current.category).slice(0, limit)
    )
    .slice(0, limit);
}
