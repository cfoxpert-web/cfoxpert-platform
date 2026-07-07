"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CTABanner } from "@/components/layout/cta-banner";
import { SearchBar } from "@/components/knowledge/search-bar";
import { CategoryFilter } from "@/components/knowledge/category-filter";
import { FeaturedArticle } from "@/components/knowledge/featured-article";
import { ArticleCard } from "@/components/knowledge/article-card";
import { Pagination } from "@/components/knowledge/pagination";
import { MOCK_ARTICLES } from "@/lib/mock-data/articles";
import { filterArticles, paginateArticles, totalPages } from "@/lib/knowledge/filter-articles";
import type { ArticleCategory } from "@/types";

const PAGE_SIZE = 6;

export default function KnowledgeHubPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<ArticleCategory | "All">("All");
  const [page, setPage] = useState(1);

  const featured = MOCK_ARTICLES.find((a) => a.featured);
  const nonFeatured = MOCK_ARTICLES.filter((a) => !a.featured);

  const filtered = useMemo(() => {
    const result = filterArticles(nonFeatured, { category, searchTerm });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchTerm]);

  const pageCount = totalPages(filtered.length, PAGE_SIZE);
  const pageItems = paginateArticles(filtered, page, PAGE_SIZE);

  function handleFilterChange(next: ArticleCategory | "All") {
    setCategory(next);
    setPage(1);
  }
  function handleSearchChange(next: string) {
    setSearchTerm(next);
    setPage(1);
  }

  return (
    <>
      <Section spacing="compact" className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%)] pt-24 text-center">
        <Container>
          <p className="mb-5 inline-flex items-center justify-center gap-2 text-eyebrow font-bold uppercase text-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Knowledge Hub
          </p>
          <h1 className="mx-auto max-w-2xl font-display text-display-md font-medium text-navy">
            Executive thinking for businesses ready to <em className="text-teal not-italic">scale.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate">
            Straight-talking guides on cash flow, governance, and enterprise value — written for
            owners, not accountants.
          </p>
          <SearchBar value={searchTerm} onChange={handleSearchChange} />
        </Container>
      </Section>

      <Section>
        <Container>
          <CategoryFilter active={category} onChange={handleFilterChange} />

          {featured && !searchTerm && category === "All" && <FeaturedArticle article={featured} />}

          {pageItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-slate">
              No articles match your search — try a different term or category.
            </p>
          )}

          <Pagination currentPage={page} totalPages={pageCount} onChange={setPage} />
        </Container>
      </Section>

      <CTABanner
        heading="Ready to see where your business stands?"
        description="Start with a free Business Health Check — no cost, no obligation, just clarity."
      />
    </>
  );
}
