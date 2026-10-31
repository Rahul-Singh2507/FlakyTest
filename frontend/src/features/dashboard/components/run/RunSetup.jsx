import { useEffect, useRef, useState } from 'react'
import { fetchJson, postJson } from '../../../../shared/api/client.js'
import { SitePreview } from './SitePreview.jsx'

const REPEAT_OPTIONS = [1, 2, 3, 5]
const MAX_PAGES = 8
const DEFAULT_LINKED_PAGES = 3

const isHttpUrl = (value) => /^https?:\/\//i.test(value ?? '')

const normalizeUrl = (value) => {
  const trimmed = value.trim()
  if (isHttpUrl(trimmed)) {
    return trimmed
  }
  return /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(trimmed)
    ? `http://${trimmed}`
    : `https://${trimmed}`
}

const toPagePath = (value, origin) => {
  const trimmed = value.trim()
  if (isHttpUrl(trimmed)) {
    const url = new URL(trimmed)
    return url.origin === origin ? `${url.pathname}${url.search}` : null
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function Step({ number, title, state, summary, children }) {
  return (
    <section className={`step step-${state}`}>
      <header className="step-header">
        <span className="step-number">{state === 'done' ? '✓' : number}</span>
        <h2>{title}</h2>
        {summary && <span className="step-summary">{summary}</span>}
      </header>
      <div className="step-body">{children}</div>
    </section>
  )
}

function RunSetup({ onRunStarted, jiraCredentials, jiraPostComments }) {
  const [ticketId, setTicketId] = useState('DEMO-101')
  const [ticket, setTicket] = useState(null)
  const [ticketError, setTicketError] = useState('')
  const [loadingTicket, setLoadingTicket] = useState(false)

  const [urlInput, setUrlInput] = useState('')
  const [site, setSite] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const [pages, setPages] = useState([])
  const [customPath, setCustomPath] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [repeat, setRepeat] = useState(1)
  const [regenerate, setRegenerate] = useState(false)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState('')

  const [knownTickets, setKnownTickets] = useState([])
  const [ticketFilter, setTicketFilter] = useState('')
  const [ticketListError, setTicketListError] = useState('')
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingMoreTickets, setLoadingMoreTickets] = useState(false)
  const [ticketNextPage, setTicketNextPage] = useState(null)
  const urlInputRef = useRef(null)

  useEffect(() => {
    let active = true

    const request = jiraCredentials
      ? postJson('/api/tickets/search', { jiraCredentials })
      : fetchJson('/api/tickets')

    Promise.resolve()
      .then(() => {
        if (!active) return null
        setKnownTickets([])
        setTicketListError('')
        setTicketNextPage(null)
        setLoadingTickets(true)
        return request
      })
      .then((result) => {
        if (!active || !result) return
        setKnownTickets(Array.isArray(result) ? result : result.tickets)
        setTicketNextPage(Array.isArray(result) ? null : result.nextPageToken)
      })
      .catch((error) => {
        if (active) setTicketListError(error.message)
      })
      .finally(() => {
        if (active) setLoadingTickets(false)
      })

    return () => {
      active = false
    }
  }, [jiraCredentials])

  const loadMoreTickets = async () => {
    if (!jiraCredentials || !ticketNextPage || loadingMoreTickets) return
    setLoadingMoreTickets(true)
    setTicketListError('')
    try {
      const result = await postJson('/api/tickets/search', {
        jiraCredentials,
        nextPageToken: ticketNextPage,
      })
      setKnownTickets((current) => [...current, ...result.tickets])
      setTicketNextPage(result.nextPageToken)
    } catch (error) {
      setTicketListError(error.message)
    } finally {
      setLoadingMoreTickets(false)
    }
  }

  const openPreview = async (url, onLoaded) => {
    setPreviewing(true)
    setPreviewError('')
    try {
      const preview = await postJson('/api/sites/preview', { url })
      setViewer(preview)
      onLoaded?.(preview)
    } catch (error) {
      setPreviewError(error.message)
    }
    setPreviewing(false)
  }

  const previewSite = (rawUrl) => {
    const requestedUrl = normalizeUrl(rawUrl)
    setUrlInput(requestedUrl)
    return openPreview(requestedUrl, (preview) => {
      setSite({ ...preview, requestedUrl })
      setPages([preview.path, ...preview.links.slice(0, DEFAULT_LINKED_PAGES)])
    })
  }

  const loadTicketById = async (id) => {
    setLoadingTicket(true)
    setTicketError('')
    try {
      const loaded = await postJson('/api/tickets/lookup', {
        ticketId: id.trim(),
        ...(jiraCredentials && { jiraCredentials }),
      })
      setTicketId(loaded.id)
      setTicket(loaded)
      if (
        isHttpUrl(loaded.target) &&
        (!site || site.requestedUrl !== normalizeUrl(loaded.target))
      ) {
        previewSite(loaded.target)
      } else {
        requestAnimationFrame(() => urlInputRef.current?.focus())
      }
    } catch (error) {
      setTicket(null)
      setTicketError(error.message)
    }
    setLoadingTicket(false)
  }

  const loadTicket = (event) => {
    event.preventDefault()
    return loadTicketById(ticketId)
  }

  const visibleTickets = knownTickets.filter((known) =>
    `${known.id} ${known.title}`.toLowerCase().includes(ticketFilter.trim().toLowerCase()),
  )

  const submitUrl = (event) => {
    event.preventDefault()
    if (urlInput.trim()) {
      previewSite(urlInput)
    }
  }

  const browse = (pagePath) => openPreview(new URL(pagePath, site.origin).href)

  const addPage = (pagePath) =>
    setPages((current) => (current.includes(pagePath) ? current : [...current, pagePath]))

  const togglePage = (pagePath) =>
    setPages((current) =>
      current.includes(pagePath)
        ? current.filter((existing) => existing !== pagePath)
        : [...current, pagePath],
    )

  const addCustomPath = (event) => {
    event.preventDefault()
    const pagePath = toPagePath(customPath, site.origin)
    if (!pagePath) {
      setPreviewError(`Only pages on ${site.origin} can be tested`)
      return
    }
    addPage(pagePath)
    setCustomPath('')
  }

  const hasCredentials = Boolean(username && password)
  const credentialsIncomplete = Boolean(username) !== Boolean(password)
  const siteIsStale = site && normalizeUrl(urlInput) !== site.requestedUrl
  const pageOptions = site ? [...new Set([site.path, ...site.links, ...pages])] : []
  const canRun =
    ticket &&
    ticket.acceptanceCriteria.length > 0 &&
    site &&
    !siteIsStale &&
    !credentialsIncomplete &&
    !starting

  const startRun = async () => {
    setStarting(true)
    setRunError('')
    try {
      const { runId } = await postJson('/api/runs', {
        ticketId: ticket.id,
        siteUrl: site.url,
        pages: pages.filter((pagePath) => pagePath !== site.path),
        ...(hasCredentials && { credentials: { username, password } }),
        repeat,
        regenerate,
        ...(jiraCredentials && { jiraCredentials }),
        ...(jiraCredentials && { postJiraComment: jiraPostComments }),
      })
      onRunStarted(runId)
    } catch (error) {
      setRunError(error.message)
    }
    setStarting(false)
  }

  const ticketState = ticket ? 'done' : 'active'
  const websiteState = !ticket ? 'locked' : site && !siteIsStale ? 'done' : 'active'
  const runState = websiteState === 'done' ? 'active' : 'locked'

  return (
    <div className="workspace">
      <div className="setup">
        <Step number={1} title="Ticket" state={ticketState} summary={ticket?.id}>
          <div className="available-tickets">
            <div className="available-tickets-heading">
              <div>
                <h3>{jiraCredentials ? 'Available Jira tickets' : 'Available sample tickets'}</h3>
                <p className="hint">
                  {jiraCredentials
                    ? 'Select a ticket to review its acceptance criteria.'
                    : 'Connect Jira to browse your accessible tickets.'}
                </p>
              </div>
              <span className="available-ticket-count">
                {loadingTickets ? 'Loading' : knownTickets.length}
              </span>
            </div>
            {!loadingTickets && knownTickets.length > 4 && (
              <input
                aria-label="Filter available tickets"
                className="text-input small"
                onChange={(event) => setTicketFilter(event.target.value)}
                placeholder="Filter by key or title"
                type="search"
                value={ticketFilter}
              />
            )}
            {ticketListError && (
              <p className="error-banner" role="alert">
                Could not load available tickets: {ticketListError}
              </p>
            )}
            {!loadingTickets && knownTickets.length === 0 && !ticketListError && (
              <p className="hint">No tickets found. You can still enter a ticket key below.</p>
            )}
            {visibleTickets.length > 0 && (
              <ul className="available-ticket-list">
                {visibleTickets.map((known) => (
                  <li key={known.id}>
                    <button
                      aria-pressed={ticket?.id === known.id}
                      className={ticket?.id === known.id ? 'available-ticket selected' : 'available-ticket'}
                      disabled={loadingTicket}
                      onClick={() => {
                        setTicketId(known.id)
                        loadTicketById(known.id)
                      }}
                      type="button"
                    >
                      <span className="available-ticket-copy">
                        <span className="available-ticket-key">{known.id}</span>
                        <span className="available-ticket-title">{known.title}</span>
                      </span>
                      <span className="available-ticket-meta">
                        {known.status || known.source}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {jiraCredentials && ticketNextPage && (
              <button
                className="link-btn"
                disabled={loadingMoreTickets}
                onClick={loadMoreTickets}
                type="button"
              >
                {loadingMoreTickets ? 'Loading tickets...' : 'Load more Jira tickets'}
              </button>
            )}
          </div>
          <form className="input-row" onSubmit={loadTicket}>
            <input
              className="text-input mono"
              aria-label="Ticket ID"
              value={ticketId}
              onChange={(event) => {
                setTicketId(event.target.value)
                setTicket(null)
              }}
              placeholder="Jira key, e.g. KAN-12"
              list="known-tickets"
            />
            <datalist id="known-tickets">
              {knownTickets.map((known) => (
                <option key={known.id} value={known.id}>
                  {known.title}
                </option>
              ))}
            </datalist>
            <button type="submit" className="btn" disabled={loadingTicket || !ticketId.trim()}>
              {loadingTicket ? 'Loading...' : 'Load'}
            </button>
          </form>
          {ticketError && <p className="error-banner">{ticketError}</p>}
          {ticket && (
            <div className="ticket-card">
              <div className="ticket-card-header">
                <span className="mono strong">{ticket.id}</span>
                <span className="badge badge-pending">{ticket.source.toUpperCase()}</span>
              </div>
              <p className="ticket-title">{ticket.title}</p>
              {ticket.acceptanceCriteria.length > 0 ? (
                <ol className="criteria-list">
                  {ticket.acceptanceCriteria.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ol>
              ) : (
                <p className="error-banner">
                  This ticket has no acceptance criteria. Add a bullet list under an "Acceptance
                  Criteria" heading in its description, then load it again.
                </p>
              )}
            </div>
          )}
        </Step>

        <Step
          number={2}
          title="Website"
          state={websiteState}
          summary={site && !siteIsStale ? new URL(site.url).host : null}
        >
          {websiteState === 'locked' ? (
            <p className="hint">Load a ticket first, then enter the website it should be tested on.</p>
          ) : (
            <>
              <form className="input-row" onSubmit={submitUrl}>
                <input
                  ref={urlInputRef}
                  className="text-input"
                  aria-label="Website URL"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder="https://your-app.example.com"
                />
                <button type="submit" className="btn" disabled={previewing || !urlInput.trim()}>
                  {previewing ? 'Opening...' : 'Preview'}
                </button>
              </form>
              {siteIsStale && <p className="hint">Press Preview to load the new URL.</p>}
              {previewError && <p className="error-banner">{previewError}</p>}

              {site && !siteIsStale && (
                <>
                  <fieldset className="field-group">
                    <legend>
                      Pages to test <span className="hint-inline">{pages.length} of {MAX_PAGES}</span>
                    </legend>
                    <ul className="page-list">
                      {pageOptions.map((pagePath) => (
                        <li key={pagePath}>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={pages.includes(pagePath)}
                              disabled={
                                pagePath === site.path ||
                                (!pages.includes(pagePath) && pages.length >= MAX_PAGES)
                              }
                              onChange={() => togglePage(pagePath)}
                            />
                            <span className="mono">{pagePath}</span>
                            {pagePath === site.path && <span className="hint-inline">start page</span>}
                          </label>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => browse(pagePath)}
                            disabled={previewing}
                          >
                            View
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form className="input-row" onSubmit={addCustomPath}>
                      <input
                        className="text-input mono small"
                        aria-label="Add a page path"
                        value={customPath}
                        onChange={(event) => setCustomPath(event.target.value)}
                        placeholder="/another-page"
                      />
                      <button
                        type="submit"
                        className="btn btn-secondary btn-small"
                        disabled={!customPath.trim() || pages.length >= MAX_PAGES}
                      >
                        Add page
                      </button>
                    </form>
                  </fieldset>

                  <fieldset className="field-group">
                    <legend>
                      Test account{' '}
                      <span className="hint-inline">
                        {site.hasLoginForm ? 'login form found' : 'optional'}
                      </span>
                    </legend>
                    <p className="hint">
                      {site.hasLoginForm
                        ? 'Enter a test account so tests can sign in and reach the pages behind the login.'
                        : 'Only needed if the ticket involves signing in.'}{' '}
                      Used for this run only: never saved, never sent to the LLM.
                    </p>
                    <div className="credential-row">
                      <input
                        className="text-input small"
                        aria-label="Test username or email"
                        autoComplete="off"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Username or email"
                      />
                      <input
                        className="text-input small"
                        aria-label="Test password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                      />
                    </div>
                    {credentialsIncomplete && (
                      <p className="hint">Enter both a username and a password, or leave both empty.</p>
                    )}
                  </fieldset>
                </>
              )}
            </>
          )}
        </Step>

        <Step number={3} title="Run" state={runState}>
          {runState === 'locked' ? (
            <p className="hint">Preview the website to continue.</p>
          ) : (
            <>
              <div className="run-options">
                <label className="check">
                  Runs per test
                  <select className="select" value={repeat} onChange={(event) => setRepeat(Number(event.target.value))}>
                    {REPEAT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={regenerate}
                    onChange={(event) => setRegenerate(event.target.checked)}
                  />
                  Regenerate tests (discard the saved suite)
                </label>
              </div>
              <button type="button" className="btn btn-primary" onClick={startRun} disabled={!canRun}>
                {starting
                  ? 'Starting...'
                  : `Generate and run ${ticket.acceptanceCriteria.length} test(s)`}
              </button>
              {runError && <p className="error-banner">{runError}</p>}
            </>
          )}
        </Step>
      </div>

      <SitePreview
        viewer={viewer}
        origin={site?.origin}
        loading={previewing}
        error={site ? '' : previewError}
        pages={site && !siteIsStale ? pages : []}
        onBrowse={browse}
        onAddPage={(pagePath) => pages.length < MAX_PAGES && addPage(pagePath)}
      />
    </div>
  )
}

export { RunSetup }
