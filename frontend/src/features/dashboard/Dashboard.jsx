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
  const [runDetail, setRunDetail] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loadError, setLoadError] = useState('')
  const eventSourceRef = useRef(null)
  const runOutputRef = useRef(null)

  useEffect(() => () => eventSourceRef.current?.close(), [])

  const resetRunView = () => {
    eventSourceRef.current?.close()
    setEvents([])
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
    requestAnimationFrame(() =>
      runOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    const eventSource = new EventSource(`/api/runs/${runId}/events`)
    eventSourceRef.current = eventSource
    eventSource.onmessage = (message) => {
      const event = JSON.parse(message.data)
      setEvents((previous) => [...previous, event])
      if (event.type === 'run-completed') {
        eventSource.close()
        loadRun(runId)
      }
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

          <div ref={runOutputRef} className="run-output">
            {loadError && <p className="error-banner">{loadError}</p>}

            {events.length > 0 && !runDetail && <RunProgress events={events} />}

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
