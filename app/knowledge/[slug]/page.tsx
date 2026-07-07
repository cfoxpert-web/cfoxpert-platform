import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CTABanner } from "@/components/layout/cta-banner";
import { ArticleBody } from "@/components/knowledge/article-body";
import { RelatedArticles } from "@/components/knowledge/related-articles";
import { ARTICLE_CATEGORY_STYLES } from "@/constants/article-categories";
import { MOCK_ARTICLES } from "@/lib/mock-data/articles";
import { getRelatedArticles } from "@/lib/knowledge/filter-articles";

interface ArticlePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return MOCK_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: ArticlePageProps): Metadata {
  const article = MOCK_ARTICLES.find((a) => a.slug === params.slug);
  if (!article) return {};
  return { title: article.title, description: article.description };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = MOCK_ARTICLES.find((a) => a.slug === params.slug);
  if (!article) notFound();

  const style = ARTICLE_CATEGORY_STYLES[article.category];
  const related = getRelatedArticles(MOCK_ARTICLES, article);

  return (
    <>
      <Section spacing="compact" className="border-b border-line pt-24 text-center">
        <Container size="narrow">
          <p className="mb-5 text-[13px] text-slate-light">
            <Link href="/knowledge" className="hover:text-navy">
              Knowledge Hub
            </Link>{" "}
            / {article.category}
          </p>
          <span
            className="mb-5 inline-block rounded-pill px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: style.bg, color: style.fg }}
          >
            {article.category}
          </span>
          <h1 className="mx-auto mb-5 max-w-2xl font-display text-[clamp(28px,4vw,44px)] font-medium leading-tight text-navy">
            {article.title}
          </h1>
          <p className="mx-auto mb-6 max-w-xl text-lg text-slate">{article.description}</p>
          <div className="flex justify-center gap-4 text-[13px] text-slate-light">
            <span>{article.readingTimeMinutes} min read</span>
            <span>By {article.author}</span>
          </div>
        </Container>
      </Section>

      <Section>
        <Container size="narrow">
          {article.blocks ? (
            <ArticleBody blocks={article.blocks} />
          ) : (
            <div className="rounded-card border border-line bg-mist p-10 text-center">
              <p className="text-[15px] text-slate">
                The full article isn&apos;t written yet — this is a teaser card only. Check back
                soon, or explore one of the related pieces below.
              </p>
            </div>
          )}

          <RelatedArticles articles={related} />
        </Container>
      </Section>

      <CTABanner
        heading="Ready to see where your business stands?"
        description="Start with a free Business Health Check — no cost, no obligation, just clarity."
      />
    </>
  );
}
