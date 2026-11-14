/**
 * @bidirekt provides GET /health
 * @bidirekt response 200
 */
export function health(req, res) {
  res.json({ ok: true })
}
