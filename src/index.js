require('dotenv').config()
const express = require('express')
const cors = require('cors')
const createTables = require('./db/schema')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', routes)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'UBa Attendance API is running' })
})

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ message: 'Internal server error.' })
})

// ─── Start server ─────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await createTables()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

start()
