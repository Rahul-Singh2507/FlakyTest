const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const apiUrl = (url) => `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`

async function fetchJson(url, init) {
  const response = await fetch(apiUrl(url), {
    ...init,
    credentials: 'include',
  })
  const responseText = await response.text()
  let body

  if (responseText.trim()) {
    try {
      body = JSON.parse(responseText)
    } catch {
      const error = new Error(
        response.ok
          ? 'Server returned an invalid JSON response.'
          : `Request failed with ${response.status}; the server returned a non-JSON response.`,
      )
      error.status = response.status
      throw error
    }
  } else {
    const error = new Error(
      response.ok
        ? 'Server returned an empty response.'
        : `Request failed with ${response.status}; the server returned an empty response.`,
    )
    error.status = response.status
    throw error
  }

  if (!response.ok || body?.success === false) {
    const message = body?.error?.message
    const error = new Error(
      typeof message === 'string' && message
        ? message
        : `Request failed with ${response.status}`,
    )
    error.status = response.status
    throw error
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
export { apiUrl }
