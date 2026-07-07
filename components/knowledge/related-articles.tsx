import Link from "next/link";
import type { Article } from "@/types";

interface RelatedArticlesProps {
  articles: Article[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <div className="mt-16">
      <h3 className="mb-4 font-display text-lg text-navy">Related reading</h3>
      <div className="flex flex-col gap-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/knowledge/${article.slug}`}
            className="flex items-center justify-between gap-4 rounded-sm border border-line px-5 py-4 transition-colors hover:border-slate-light hover:bg-mist"
          >
            <span className="text-[14.5px] font-semibold text-navy">{article.title}</span>
            <span className="shrink-0 text-xs text-slate-light">{article.readingTimeMinutes} min read</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
