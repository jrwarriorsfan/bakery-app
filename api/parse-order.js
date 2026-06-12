export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text } = req.body
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You extract bakery order details from a customer's text message. Today is ${now.toLocaleDateString('en-US', { weekday: 'long' })}, ${today}. A single text may contain MORE THAN ONE order. Respond with ONLY a JSON array — no markdown, no backticks, no commentary — containing one object per distinct order. Each object has these exact keys: "customer" (their name, or ""), "contact" (phone number if present, or ""), "item" (what they want to order), "qty" (a number; use 1 if unclear), "dueDate" (YYYY-MM-DD; resolve relative dates like "next Saturday" or "tomorrow" relative to today; use "" if no date is mentioned), "notes" (flavor, allergies, pickup time, budget, occasion, or ""). Split into separate objects when distinct items have different dates or are clearly separate orders; keep one object if it is really one order. Use "" for anything unknown. Always return an array, even for a single order.`,
      messages: [{ role: 'user', content: text }],
    }),
  })

  const data = await response.json()
  res.status(200).json(data)
}