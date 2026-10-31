import { useEffect, useRef, useState } from 'react'
import { fetchJson } from '../../shared/api/client.js'
import { RepairLog } from './components/results/RepairLog.jsx'
import { ResultsTable } from './components/results/ResultsTable.jsx'
import { RunHistory } from './components/run/RunHistory.jsx'
import { RunProgress } from './components/run/RunProgress.jsx'
import { RunSetup } from './components/run/RunSetup.jsx'
import { JiraSettings } from '../integrations/JiraSettings.jsx'

function Dashboard({
  user,
  onLogout,
  jiraCredentials,
  jiraPostComments,
  onJiraCredentialsChange,
  onJiraPostCommentsChange,
}) {
  const [view, setView] = useState('main')
  const [showJiraSettings, setShowJiraSettings] = useState(false)
  const [events, setEvents] = useState([])
  const [runActive, setRunActive] = useState(false)
  const [runDetail, setRunDetail] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loadError, setLoadError] = useState('')
  const eventSourceRef = useRef(null)
  const runOutputRef = useRef(null)

  useEffect(() => () => eventSourceRef.current?.close(), [])

  useEffect(() => {
    if (view !== 'main' || (!runActive && !runDetail)) return undefined

    const frame = requestAnimationFrame(() =>
      runOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [runActive, runDetail, view])

  const resetRunView = () => {
    eventSourceRef.current?.close()
    setEvents([])
    setRunActive(false)
    setRunDetail(null)
    setRepairs([])
    setLoadError('')
    setView('main')
  }

  const loadRun = (runId) =>
    Promise.all([fetchJson(`/api/runs/${runId}`), fetchJson(`/api/runs/${runId}/repairs`)])
      .then(([detail, repairList]) => {
        setRunDetail(detail)
        setRepairs(repairList)
      })
      .catch((error) => setLoadError(error.message))

  const watchRun = (runId) => {
    resetRunView()
    setRunActive(true)
    const eventSource = new EventSource(`/api/runs/${runId}/events`)
    eventSourceRef.current = eventSource
    eventSource.onmessage = (message) => {
      const event = JSON.parse(message.data)
      setEvents((previous) => [...previous, event])
      if (event.type === 'run-completed') {
        eventSource.close()
        setRunActive(false)
        loadRun(runId)
      }
    }
    eventSource.onerror = () => {
      eventSource.close()
      setRunActive(false)
      setLoadError('The live run connection was interrupted. Check History for the final results.')
    }
  }

  const openRun = (run) => {
    resetRunView()
    loadRun(run.id)
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>
          <span className="header-brand">
            <span className="header-name">SentinelQA</span>
          </span>
        </h1>
        <nav className="nav">
          <button
            type="button"
            className={view === 'main' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView('main')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={view === 'history' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView('history')}
          >
            History
          </button>
        </nav>
        <div className="account-menu">
          <div className="account-identity">
            <span className="account-name">{user.name}</span>
            <span className="account-email">{user.email}</span>
          </div>
          <button
            type="button"
            className="nav-btn"
            onClick={() => setShowJiraSettings(true)}
          >
            {jiraCredentials ? 'Jira connected' : 'Connect Jira'}
          </button>
          <button type="button" className="nav-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {showJiraSettings && (
        <JiraSettings
          credentials={jiraCredentials}
          postResults={jiraPostComments}
          onConnect={onJiraCredentialsChange}
          onDisconnect={() => onJiraCredentialsChange(null)}
          onPostResultsChange={onJiraPostCommentsChange}
          onClose={() => setShowJiraSettings(false)}
        />
      )}

      {view === 'history' && <RunHistory onSelectRun={openRun} />}

      {view === 'main' && (
        <main className="main">
          <RunSetup
            jiraCredentials={jiraCredentials}
            jiraPostComments={jiraPostComments}
            onRunStarted={watchRun}
          />

          <div
            ref={runOutputRef}
            className={runActive || runDetail || loadError ? 'run-output run-output-visible' : 'run-output'}
            aria-live="polite"
          >
            {loadError && <p className="error-banner">{loadError}</p>}

            {events.length > 0 && !runDetail && <RunProgress events={events} />}
            {runActive && events.length === 0 && (
              <section className="run-progress">
                <h2>Starting test run</h2>
                <p className="empty">Preparing the browser and generated test cases...</p>
              </section>
            )}

            {runDetail && (
              <>
                {runDetail.status === 'error' && (
                  <p className="error-banner">Run failed: {runDetail.errorMessage}</p>
                )}
                <ResultsTable run={runDetail} />
                <RepairLog repairs={repairs} />
              </>
            )}
          </div>
        </main>
      )}
    </div>
  )
}

export { Dashboard }
