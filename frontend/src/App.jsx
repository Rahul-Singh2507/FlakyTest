import { useEffect, useRef, useState } from 'react'
import { fetchJson } from './api/client.js'
import { RepairLog } from './components/results/RepairLog.jsx'
import { ResultsTable } from './components/results/ResultsTable.jsx'
import { RunHistory } from './components/run/RunHistory.jsx'
import { RunProgress } from './components/run/RunProgress.jsx'
import { RunSetup } from './components/run/RunSetup.jsx'

function App() {
  const [view, setView] = useState('main')
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
          FlakeTest{' '}
          <span className="header-tagline">
            Jira ticket → generated UI tests → self-healing runs
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
      </header>

      {view === 'history' && <RunHistory onSelectRun={openRun} />}

      {view === 'main' && (
        <main className="main">
          <RunSetup onRunStarted={watchRun} />

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

export { App }
