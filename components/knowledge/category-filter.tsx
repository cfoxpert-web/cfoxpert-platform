import { ARTICLE_CATEGORIES } from "@/constants/article-categories";
import { cn } from "@/lib/utils";
import type { ArticleCategory } from "@/types";

interface CategoryFilterProps {
  active: ArticleCategory | "All";
  onChange: (category: ArticleCategory | "All") => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  const categories: (ArticleCategory | "All")[] = ["All", ...ARTICLE_CATEGORIES];

  return (
    <div className="mb-14 flex flex-wrap justify-center gap-2.5">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "rounded-pill border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors",
            active === cat
              ? "border-navy bg-navy text-white"
              : "border-line bg-white text-slate hover:border-slate-light"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
