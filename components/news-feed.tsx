"use client"

import useSWR from "swr"
import { useMemo, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NewsCard } from "./news-card"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

type Article = {
  title: string
  link: string
  date: string
  source: string
  description?: string
}

const fetcher = (url: string) => {
  console.log("[v0] Fetching:", url)
  return fetch(url).then((r) => r.json())
}

function toUtcDateKey(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function displayUtcDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
}

export default function NewsFeed() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Article[]>("/api/news?noCache=1", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  useEffect(() => {
    if (data) {
      const now = new Date()
      setLastUpdated(now)
      console.log("[v0] SWR data updated at:", now.toISOString())
    }
  }, [data])

  const grouped = useMemo(() => {
    const map = new Map<string, { display: string; items: Article[]; maxTs: number }>()
    for (const item of data ?? []) {
      const d = new Date(item.date)
      if (Number.isNaN(d.getTime())) continue
      const key = toUtcDateKey(d) // use UTC key
      const entry = map.get(key) ?? {
        display: displayUtcDate(d), // UTC display
        items: [],
        maxTs: 0,
      }
      entry.items.push(item)
      entry.maxTs = Math.max(entry.maxTs, d.getTime())
      map.set(key, entry)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].maxTs - a[1].maxTs)
      .map(([key, val]) => ({ key, ...val }))
  }, [data])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Latest News Updates</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-GB")}` : "Waiting for first load…"}
            {isValidating ? " • Updating…" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              console.log("[v0] Manual refresh clicked")
              mutate()
            }}
          >
            Refresh
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-6 w-40 mt-6" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">Could not load news. Please try again.</p>}

      {!isLoading && !error && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">No news available.</p>
      )}

      {!isLoading &&
        !error &&
        grouped.map((group) => (
          <Collapsible key={group.key} defaultOpen className="mb-4">
            <div className="mb-2">
              <CollapsibleTrigger asChild>
                <button
                  className="group inline-flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent hover:text-accent-foreground"
                  aria-label={`Toggle ${group.display} posts`}
                >
                  <ChevronDown
                    className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                  <span className="text-lg font-semibold">{group.display}</span>
                  <span className="text-sm text-muted-foreground">({group.items.length})</span>
                </button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="grid gap-4">
                {group.items.map((item, i) => (
                  <NewsCard
                    key={item.link || `${group.key}-${i}`}
                    title={item.title}
                    link={item.link}
                    isoDate={item.date}
                    source={item.source}
                    description={item.description}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
    </main>
  )
}
