import next from "next"
import express from "express"
import "./cron.js"  // ✅ this will start your background job

const app = next({ dev: process.env.NODE_ENV !== "production" })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()
  server.all("*", (req, res) => handle(req, res))
  server.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"))
})
