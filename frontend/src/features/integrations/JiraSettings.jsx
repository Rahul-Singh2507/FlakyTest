import { useState } from 'react'
import { postJson } from '../../shared/api/client.js'

function JiraSettings({
  credentials,
  postResults,
  onConnect,
  onDisconnect,
  onPostResultsChange,
  onClose,
}) {
  const [baseUrl, setBaseUrl] = useState(credentials?.baseUrl ?? '')
  const [email, setEmail] = useState(credentials?.email ?? '')
  const [apiToken, setApiToken] = useState('')
  const [account, setAccount] = useState(null)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const testConnection = async (event) => {
    event.preventDefault()
    setError('')
    setTesting(true)
    try {
      const result = await postJson('/api/integrations/jira/test', {
        baseUrl,
        email,
        apiToken,
      })
      onConnect({ baseUrl: baseUrl.replace(/\/+$/, ''), email, apiToken })
      setAccount(result)
      setApiToken('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setTesting(false)
    }
  }

  const disconnect = () => {
    onDisconnect()
    setAccount(null)
    setBaseUrl('')
    setEmail('')
    setApiToken('')
    setError('')
  }

  return (
    <div className="integration-overlay">
      <section
        aria-labelledby="jira-settings-title"
        aria-modal="true"
        className="integration-dialog"
        role="dialog"
      >
        <div className="integration-header">
          <div>
            <p className="integration-eyebrow">Integration</p>
            <h2 className="integration-title" id="jira-settings-title">Jira connection</h2>
          </div>
          <button
            aria-label="Close Jira settings"
            className="integration-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {credentials && (
          <>
            <div className="integration-connected">
              Connected{account?.displayName ? ` as ${account.displayName}` : ` for ${credentials.email}`}.
              {' '}The token is held in app memory only.
            </div>
            <label className="integration-toggle">
              <input
                checked={postResults}
                className="integration-checkbox"
                onChange={(event) => onPostResultsChange(event.target.checked)}
                type="checkbox"
              />
              <span>Post run summaries as comments on Jira tickets</span>
            </label>
          </>
        )}

        <form className="integration-form" onSubmit={testConnection}>
          <label className="integration-field">
            Jira site URL
            <input
              autoComplete="url"
              className="integration-input"
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://your-company.atlassian.net"
              required
              type="url"
              value={baseUrl}
            />
          </label>
          <label className="integration-field">
            Jira account email
            <input
              autoComplete="username"
              className="integration-input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="integration-field">
            Jira API token
            <input
              autoComplete="new-password"
              className="integration-input"
              onChange={(event) => setApiToken(event.target.value)}
              placeholder={credentials ? 'Enter a new token to replace the current one' : 'Paste your Jira API token'}
              required
              type="password"
              value={apiToken}
            />
          </label>

          <p className="integration-help">
            Create an Atlassian API token from your Atlassian account security settings. Use your
            Jira account email and keep the token private. It is not stored in the database and is
            cleared on page refresh or logout.
          </p>

          {error && (
            <p className="integration-error" role="alert">
              {error}
            </p>
          )}

          <div className="integration-actions">
            <button
              className="btn"
              disabled={testing}
              type="submit"
            >
              {testing ? 'Testing connection...' : 'Test and connect'}
            </button>
            {credentials && (
              <button
                className="btn btn-danger"
                onClick={disconnect}
                type="button"
              >
                Disconnect Jira
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

export { JiraSettings }
