"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

type Props = {
  title: string
  link: string
  isoDate: string
  source: string
  description?: string
}

export function NewsCard({ title, link, isoDate, source, description }: Props) {
  const dt = new Date(isoDate)
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt)

  const excerpt =
    (description || "").replace(/\s+/g, " ").trim().slice(0, 600) + ((description || "").length > 600 ? "…" : "")

  return (
    <Collapsible>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <CollapsibleTrigger asChild>
            <button
              className="group w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50 transition"
              aria-label="Toggle article details"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ChevronDown
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline font-medium text-pretty"
                  >
                    {title}
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="sr-only">Source and time: </span>
                    <span>{source}</span>
                    {" • "}
                    <time dateTime={isoDate}>{time}</time>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 mr-4">
                {source}
              </Badge>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 pt-1">
              {excerpt && <p className="text-sm text-muted-foreground">{excerpt}</p>}
              <div className="mt-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  Read original
                </a>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}
