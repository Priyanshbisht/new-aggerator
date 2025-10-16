import Parser from "rss-parser"
import { SITES } from "@/lib/rss-sources"

type Article = {
  title: string
  link: string
  date: string // ISO string
  source: string
  description?: string
}

const COMMON_HEADERS = {
  "User-Agent": "NewsFeedPreview/1.0 (+https://v0.app)",
  // Prefer RSS/Atom/XML explicitly to avoid 406 from strict servers (e.g., InfoQ)
  Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
}

const parser = new Parser({
  timeout: 15000,
  headers: COMMON_HEADERS,
})

// simple in-memory cache
let cache: {
  at: number
  data: Article[]
} | null = null

const TTL_MS = 5 * 60 * 1000

function coerceIsoDate(item: any): string | null {
  const candidates = [item.isoDate, item.pubDate, item.published, item.updated, item.date]
  for (const c of candidates) {
    if (!c) continue
    const d = new Date(c)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

function normalize(item: any, source: string): Article {
  return {
    title: item.title ?? "(untitled)",
    link: item.link ?? item.guid ?? "#",
    date: coerceIsoDate(item),
    source,
    description: item.contentSnippet || item.summary || item.content || item.description,
  }
}

function dedupe(articles: Article[]): Article[] {
  const seen = new Set<string>()
  const out: Article[] = []
  for (const a of articles) {
    const key = a.link || `${a.source}:${a.title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const noCache = searchParams.get("noCache") === "1"

  if (!noCache && cache && Date.now() - cache.at < TTL_MS) {
    return Response.json(cache.data, { headers: { "Cache-Control": "no-store" } })
  }

  const results = await Promise.all(
    SITES.map(async (site) => {
      try {
        const feed = await parser.parseURL(site.url)
        const items = (feed.items ?? [])
          .map((it) => {
            const iso = coerceIsoDate(it)
            if (!iso) return null
            return {
              title: it.title ?? "(untitled)",
              link: it.link ?? it.guid ?? "#",
              date: iso,
              source: site.name,
              description: it.contentSnippet || it.summary || it.content || it.description,
            }
          })
          .filter(Boolean) as Article[]
        return items
      } catch (err) {
        try {
          const res = await fetch(site.url, { headers: COMMON_HEADERS })
          if (!res.ok) throw new Error(`status ${res.status}`)
          const xml = await res.text()
          const feed = await parser.parseString(xml)
          const items = (feed.items ?? [])
            .map((it: any) => {
              const iso = coerceIsoDate(it)
              if (!iso) return null
              return {
                title: it.title ?? "(untitled)",
                link: it.link ?? it.guid ?? "#",
                date: iso,
                source: site.name,
                description: it.contentSnippet || it.summary || it.content || it.description,
              }
            })
            .filter(Boolean) as Article[]
          return items
        } catch (err2) {
          console.error(`[rss:fallback] ${site.name} failed:`, (err2 as Error).message)
          return [] as Article[]
        }
      }
    }),
  )

  const merged = dedupe(results.flat()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const now = new Date()
const cutoff = new Date(now)
cutoff.setDate(now.getDate() - 14) // last 15 days including today

const filtered = merged.filter((a) => {
  const d = new Date(a.date)
  return d >= cutoff && d <= now
})

// Update cache with filtered articles
cache = { at: Date.now(), data: filtered }

return Response.json(filtered, { headers: { "Cache-Control": "no-store" } })
}
