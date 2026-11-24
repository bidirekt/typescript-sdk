/**
 * @bidirekt rest consumes payments_api GET /status
 * @bidirekt response 200
 */
(async () => {
  await fetch('http://payments/status')
})()
