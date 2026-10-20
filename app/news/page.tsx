import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { FeedList } from "@/components/feed-list";
import { loadCatalog, loadNews } from "@/lib/data/load";
import { requireUser } from "@/lib/db/ssr";

const PAGE_SIZE = 50;
const TAGS = [
  { value: "", label: "All" },
  { value: "product", label: "My products" },
  { value: "monitor", label: "Monitors" },
  { value: "speaker", label: "Speakers" },
  { value: "toronto", label: "Toronto / in-store" },
];
const SOURCES = [
  { value: "", label: "All sources" },
  { value: "rfd", label: "RedFlagDeals" },
  { value: "reddit", label: "Reddit" },
];

export default function NewsPage({ searchParams }: PageProps<"/news">) {
  return (
    <AppShell>
      <h1 className="text-3xl">Deals feed</h1>
      <p className="mt-1 text-sm text-muted-foreground">Newest first, from RedFlagDeals Hot Deals and r/bapcsalescanada.</p>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-xl bg-card" aria-busy="true" />}>
        <NewsContent searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function NewsContent({ searchParams }: { searchParams: PageProps<"/news">["searchParams"] }) {
  const { db } = await requireUser();
  const sp = await searchParams;
  const tag = TAGS.some((t) => t.value === one(sp.tag)) ? one(sp.tag) : "";
  const source = one(sp.source) === "rfd" || one(sp.source) === "reddit" ? (one(sp.source) as "rfd" | "reddit") : undefined;
  const page = Math.max(1, Math.min(100, parseInt(one(sp.page) || "1", 10) || 1));
  const now = new Date();

  const [{ products }, items] = await Promise.all([
    loadCatalog(db),
    loadNews(db, { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE, source, tag: tag || undefined, sort: "recent" }),
  ]);
  const href = (over: Record<string, string>) => {
    const q = new URLSearchParams({ ...(tag && { tag }), ...(source && { source }), ...over });
    for (const [k, v] of [...q]) if (!v || (k === "page" && v === "1")) q.delete(k);
    return `/news${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {TAGS.map((t) => (
          <Link key={t.value} href={href({ tag: t.value, page: "1" })} className={`rounded-full border px-3 py-1 ${t.value === tag ? "border-oak text-oak" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden />
        {SOURCES.map((s) => (
          <Link key={s.value} href={href({ source: s.value, page: "1" })} className={`rounded-full border px-3 py-1 ${s.value === (source ?? "") ? "border-oak text-oak" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {s.label}
          </Link>
        ))}
      </div>
      <FeedList items={items.slice(0, PAGE_SIZE)} products={products} now={now} />
      <div className="flex justify-between text-sm">
        {page > 1 ? <Link href={href({ page: String(page - 1) })} className="text-oak hover:underline">← Newer</Link> : <span />}
        {items.length > PAGE_SIZE && <Link href={href({ page: String(page + 1) })} className="text-oak hover:underline">Older →</Link>}
      </div>
    </div>
  );
}
