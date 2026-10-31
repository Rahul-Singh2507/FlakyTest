async function fetchJson(url, init) {
  const response = await fetch(url, init)
  const body = await response.json()

  if (!response.ok || body?.success === false) {
    const message = body?.error?.message
    throw new Error(
      typeof message === 'string' && message
        ? message
        : `Request failed with ${response.status}`,
    )
  }

  if (
    body === null ||
    typeof body !== 'object' ||
    body.success !== true ||
    !Object.hasOwn(body, 'data')
  ) {
    throw new Error('Invalid API response')
  }

  return body.data
}

const postJson = (url, payload) =>
  fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export { fetchJson, postJson }
