import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.post('/api/contact', (req, res) => {
  const { name, email, need, budget } = req.body

  if (!name || !email || !need) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // TODO: wire up email delivery (Resend recommended — `import { Resend } from 'resend'`)
  console.log('[contact]', { name, email, need, budget })

  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
