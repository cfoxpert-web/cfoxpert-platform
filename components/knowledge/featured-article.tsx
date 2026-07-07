import Link from "next/link";
import type { Article } from "@/types";

interface FeaturedArticleProps {
  article: Article;
}

export function FeaturedArticle({ article }: FeaturedArticleProps) {
  return (
    <Link
      href={`/knowledge/${article.slug}`}
      className="mb-14 grid grid-cols-1 overflow-hidden rounded-card-lg bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] text-white shadow-elevation-3 md:grid-cols-2"
    >
      <div className="flex flex-col justify-center p-10 sm:p-12">
        <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-wider text-teal-bright">
          Featured · {article.category}
        </div>
        <h2 className="mb-3.5 font-display text-2xl font-medium sm:text-[28px]">{article.title}</h2>
        <p className="mb-5 max-w-md text-[15px] text-white/70">{article.description}</p>
        <div className="flex gap-4 text-[12.5px] text-white/50">
          <span>{article.readingTimeMinutes} min read</span>
          <span>By {article.author}</span>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white/4 p-10">
        <svg viewBox="0 0 280 140" className="w-full max-w-[280px]">
          {[70, 50, 85, 30, 60, 15].map((y, i) => (
            <rect
              key={i}
              x={10 + i * 42}
              y={y}
              width={26}
              height={130 - y}
              rx={6}
              fill="#1FB894"
              opacity={0.55 + (i % 2) * 0.35}
            />
          ))}
        </svg>
      </div>
    </Link>
  );
}
