"use client"

import useSWR from "swr"
import * as React from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { NewsCardCollapsible, type NewsItem } from "./news-card-collapsible"

type ApiItem = NewsItem

const fetcher = (url: string) => {
  console.log("[v0] Fetching:", url) // debug
  return fetch(url).then((r) => r.json())
}

function utcKeyAndDisplay(iso: string | null): { key: string; display: string } {
  if (!iso) return { key: "unknown", display: "Unknown" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { key: "unknown", display: "Unknown" }
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(
    2,
    "0",
  )}`
  const display = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
  return { key, display }
}

export default function NewsFeedCollapsible() {
  const { data, error, isLoading, isValidating } = useSWR<ApiItem[]>("/api/news?noCache=1", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  React.useEffect(() => {
    if (data) {
      const now = new Date()
      setLastUpdated(now)
      console.log("[v0] SWR data updated at:", now.toISOString())
    }
  }, [data])

  const grouped = React.useMemo(() => {
    const groups = new Map<string, { display: string; items: NewsItem[]; maxTs: number }>()
    if (Array.isArray(data)) {
      for (const item of data) {
        const { key, display } = utcKeyAndDisplay(item.date)
        if (key === "unknown") continue // skip unknown dates
        const entry = groups.get(key) ?? { display, items: [], maxTs: 0 }
        entry.items.push(item)
        entry.maxTs = Math.max(entry.maxTs, item.date ? new Date(item.date).getTime() : 0)
        groups.set(key, entry)
      }
    }
    const sorted = Array.from(groups.entries()).sort((a, b) => b[1].maxTs - a[1].maxTs)
    return { groups: new Map(sorted), sortedKeys: sorted.map(([k]) => k) }
  }, [data])

  if (error) {
    return <div className="text-destructive">Failed to load news.</div>
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Latest News Updates</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-GB")}` : "Waiting for first load…"}
          {isValidating ? " • Updating…" : ""}
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading news…</div>}

      {grouped?.sortedKeys?.map((key) => {
        const entry = grouped.groups.get(key)!
        return <DateGroup key={key} dateLabel={entry.display} items={entry.items} />
      })}
    </div>
  )
}

function DateGroup({ dateLabel, items }: { dateLabel: string; items: NewsItem[] }) {
  const [open, setOpen] = React.useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6">
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between rounded-md bg-muted px-4 py-2 hover:bg-muted/80 transition"
          aria-expanded={open}
        >
          <span className="font-medium text-foreground">{dateLabel}</span>
          <span className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-background px-2 py-0.5 border border-border">{items.length}</span>
            <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-3">
          {items.map((item, idx) => (
            <NewsCardCollapsible key={`${item.link}-${idx}`} item={item} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
