import Link from "next/link";
import { Card } from "@/components/cards/card";
import { ARTICLE_CATEGORY_STYLES } from "@/constants/article-categories";
import type { Article } from "@/types";

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const style = ARTICLE_CATEGORY_STYLES[article.category];

  return (
    <Link href={`/knowledge/${article.slug}`}>
      <Card interactive className="h-full p-6">
        <span
          className="mb-4 inline-block rounded-pill px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: style.bg, color: style.fg }}
        >
          {article.category}
        </span>
        <h3 className="mb-2 text-[16.5px] font-semibold leading-snug text-navy">{article.title}</h3>
        <p className="mb-4 text-[13.5px] text-slate">{article.description}</p>
        <div className="flex justify-between border-t border-line pt-3.5 text-[12px] text-slate-light">
          <span>{article.readingTimeMinutes} min read</span>
          <span>{article.author}</span>
        </div>
      </Card>
    </Link>
  );
}
