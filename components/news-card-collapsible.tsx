"use client"

import * as React from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import Link from "next/link"

export type NewsItem = {
  title: string
  link: string
  date: string | null
  source: string
  description?: string
}

export function NewsCardCollapsible({ item }: { item: NewsItem }) {
  const [open, setOpen] = React.useState(false)

  const timeLabel = item.date
    ? new Date(item.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : ""

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition text-left"
          aria-expanded={open}
        >
          <span
            className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          >
            <ChevronDown className="size-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <Link
              href={item.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {item.title}
            </Link>
            <div className="mt-1 text-sm text-muted-foreground">
              <span>{item.source}</span>
              {timeLabel ? (
                <span>
                  {" • "}
                  {timeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
        {item.description ? item.description : "No description available."}
      </CollapsibleContent>
    </Collapsible>
  )
}
