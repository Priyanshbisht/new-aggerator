import nodemailer from "nodemailer"
import Parser from "rss-parser"
import { SITES } from "@/lib/rss-sources"
import fs from "fs"
import path from "path"

// ================= CONFIG =================
const EMAIL_FROM = process.env.EMAIL_FROM!
const EMAIL_TO = process.env.EMAIL_TO!
const EMAIL_PASS = process.env.EMAIL_PASS!

// Cache file path (for remembering what’s already emailed)
const CACHE_FILE = path.join(process.cwd(), "news-cache.json")

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_PASS, // Gmail App Password (not normal password)
  },
})

// ================= RSS PARSER SETUP =================
const parser = new Parser({
  headers: {
    "User-Agent": "NewsFeedNotifier/1.0 (+https://quantifyd.tech)",
    Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
  },
  timeout: 20000,
})

// ================= TYPES =================
type Article = {
  title: string
  link: string
  date: string
  source: string
}

// ================= CACHE HELPERS =================
function loadCache(): string[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"))
    }
  } catch (err) {
    console.error("[rss] Failed to read cache:", err)
  }
  return []
}

function saveCache(links: string[]) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(links, null, 2))
  } catch (err) {
    console.error("[rss] Failed to save cache:", err)
  }
}

// ================= MAIN HANDLER =================
export async function GET() {
  try {
    console.log("[rss] Fetching feeds from", SITES.length, "sources...")

    const results = await Promise.all(
      SITES.map(async (site) => {
        try {
          const feed = await parser.parseURL(site.url)
          return (feed.items ?? []).map((item) => ({
            title: item.title ?? "(untitled)",
            link: item.link ?? item.guid ?? "#",
            date: item.isoDate ?? new Date().toISOString(),
            source: site.name,
          }))
        } catch (err) {
          console.error(`[rss] Failed to fetch ${site.name}:`, (err as Error).message)
          return []
        }
      })
    )

    // Flatten and deduplicate
    const merged: Article[] = results.flat()
    const uniqueArticles = Array.from(new Map(merged.map((a) => [a.link, a])).values())
    uniqueArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Filter for last 15 days
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const recentArticles = uniqueArticles.filter(
      (a) => now - new Date(a.date).getTime() <= FIFTEEN_DAYS
    )

    console.log(`[rss] Found ${recentArticles.length} recent articles (15 days window)`)

    // Compare against cache
    const oldLinks = loadCache()
    const newArticles = recentArticles.filter((a) => !oldLinks.includes(a.link))

    if (newArticles.length > 0) {
      console.log(`[rss] Found ${newArticles.length} new article(s). Sending email...`)

      // Send only the NEW articles in the mail
      const htmlContent = `
        <h2>📰 New Cybersecurity Articles</h2>
        <p>Here are the latest updates since your last check:</p>
        <ul style="list-style:none;padding:0;">
          ${newArticles
            .map(
              (a) => `
              <li style="margin-bottom:15px;">
                <b>${a.title}</b><br/>
                <small>${a.source} — ${new Date(a.date).toLocaleString()}</small><br/>
                <a href="${a.link}" target="_blank">Read more</a>
              </li>`
            )
            .join("")}
        </ul>
        <p style="margin-top:20px;font-size:0.9em;color:#666;">
          Sent automatically from Quantifyd Tech RSS Notifier
        </p>
      `

      await transporter.sendMail({
        from: `"News Notifier" <${EMAIL_FROM}>`,
        to: EMAIL_TO,
        subject: `🗞️ ${newArticles.length} New Cyber News Update${newArticles.length > 1 ? "s" : ""}`,
        html: htmlContent,
      })

      console.log(`[mail] Email sent successfully with ${newArticles.length} new article(s).`)

      // Update cache with new article links
      const updatedCache = Array.from(
        new Set([...oldLinks, ...newArticles.map((a) => a.link)])
      )
      saveCache(updatedCache)
    } else {
      console.log("[rss] No new articles since last run.")
    }

    // Return all recent articles for frontend (if needed)
    return new Response(JSON.stringify(recentArticles), { status: 200 })
  } catch (err) {
    console.error("Error fetching RSS or sending email:", err)
    return new Response(
      JSON.stringify({ error: "Failed to fetch or send email" }),
      { status: 500 }
    )
  }
}
