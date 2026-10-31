import { useEffect, useState } from 'react'
import { fetchJson } from '../../../../shared/api/client.js'
import { StatusBadge } from '../../../../shared/components/StatusBadge.jsx'

function RunHistory({ onSelectRun }) {
  const [runs, setRuns] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJson('/api/runs')
      .then(setRuns)
      .catch((requestError) => setError(requestError.message))
  }, [])

  return (
    <section className="history-section">
      <h2>Run History</h2>
      {error && <p className="error-banner">{error}</p>}
      {runs.length === 0 && !error && <p className="empty">No runs yet</p>}
      <div className="history-list">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className="history-card"
            onClick={() => onSelectRun(run)}
          >
            <div className="history-header">
              <span className="history-ticket">
                {run.ticketId}{' '}
                <span className="history-site">on {run.siteName ?? 'demo-app'}</span>
              </span>
              <StatusBadge status={run.status} />
            </div>
            <div className="history-meta">
              <span>{new Date(run.createdAt).toLocaleString()}</span>
              <span>
                {run.passed ?? 0} passed · {run.healed ?? 0} healed · {run.failed ?? 0} failed
                {run.flaky > 0 && ` · ${run.flaky} flaky`}
              </span>
              <span className="history-id">{run.id.slice(0, 8)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export { RunHistory }
