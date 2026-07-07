import type { ArticleBlock } from "@/types";

interface ArticleBodyProps {
  blocks: ArticleBlock[];
}

export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i} className="text-[17px] leading-relaxed text-ink">
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h2 key={i} className="mt-4 font-display text-2xl font-medium text-navy">
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-[3px] border-teal py-1 pl-6 font-display text-xl italic text-navy"
              >
                {block.text}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i} className="ml-5 flex list-disc flex-col gap-2.5">
                {block.items.map((item, j) => (
                  <li key={j} className="text-[16px] text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "stats":
            return (
              <div key={i} className="my-2 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {block.items.map((stat, j) => (
                  <div key={j} className="rounded-sm bg-mist p-5 text-center">
                    <div className="mb-1 font-display text-[26px] font-semibold text-navy">{stat.value}</div>
                    <div className="text-[12.5px] text-slate">{stat.label}</div>
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
