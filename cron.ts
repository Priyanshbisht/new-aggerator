import cron from "node-cron"
import { GET as runRSSJob } from "@/app/api/news/route"

// Run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  console.log("[CRON] Checking for new RSS updates...")
  await runRSSJob()
})
