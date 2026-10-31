import { useEffect, useState } from 'react'
import { AuthPage } from '../features/auth/AuthPage.jsx'
import { getCurrentUser, logout } from '../features/auth/authApi.js'
import { Dashboard } from '../features/dashboard/Dashboard.jsx'
import { LandingPage } from '../features/landing/LandingPage.jsx'

const JIRA_SESSION_KEY = 'sentinelqa_jira_credentials'

function readJiraSession() {
  try {
    const savedCredentials = sessionStorage.getItem(JIRA_SESSION_KEY)
    if (!savedCredentials) {
      return { credentials: null, error: '' }
    }

    const credentials = JSON.parse(savedCredentials)
    if (
      typeof credentials?.baseUrl !== 'string' ||
      typeof credentials?.email !== 'string' ||
      typeof credentials?.apiToken !== 'string'
    ) {
      throw new Error('Saved Jira credentials are incomplete.')
    }
    return { credentials, error: '' }
  } catch (error) {
    try {
      sessionStorage.removeItem(JIRA_SESSION_KEY)
    } catch (storageError) {
      return {
        credentials: null,
        error: `Saved Jira credentials could not be cleared: ${storageError.message}`,
      }
    }
    return {
      credentials: null,
      error: `Saved Jira credentials could not be restored: ${error.message}`,
    }
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState(null)
  const [jiraSession, setJiraSession] = useState(readJiraSession)
  const jiraCredentials = jiraSession.credentials
  const [jiraPostComments, setJiraPostComments] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser)
        }
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setAuthError(error.message)
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      updateJiraCredentials(null)
      setJiraPostComments(false)
      setAuthError('')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser)
    setAuthError('')
  }

  const updateJiraCredentials = (credentials) => {
    try {
      if (credentials) {
        sessionStorage.setItem(JIRA_SESSION_KEY, JSON.stringify(credentials))
      } else {
        sessionStorage.removeItem(JIRA_SESSION_KEY)
      }
      setJiraSession({ credentials, error: '' })
    } catch (error) {
      setJiraSession({
        credentials,
        error: `Could not save Jira credentials for this tab: ${error.message}`,
      })
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-screen auth-loading">
        Checking your session...
      </main>
    )
  }

  if (!user) {
    if (!authMode) {
      return (
        <LandingPage
          error={authError}
          onGetStarted={() => setAuthMode('register')}
          onSignIn={() => setAuthMode('login')}
        />
      )
    }

    return (
      <AuthPage
        initialError={authError}
        initialMode={authMode}
        onAuthenticated={handleAuthenticated}
        onBackToLanding={() => {
          setAuthMode(null)
          setAuthError('')
        }}
      />
    )
  }

  return (
    <>
      {jiraSession.error && (
        <p className="app-error" role="alert">
          {jiraSession.error}
        </p>
      )}
      {authError && (
        <p className="app-error">
          {authError}
        </p>
      )}
      <Dashboard
        jiraCredentials={jiraCredentials}
        jiraPostComments={jiraPostComments}
        onJiraCredentialsChange={updateJiraCredentials}
        onJiraPostCommentsChange={setJiraPostComments}
        onLogout={handleLogout}
        user={user}
      />
    </>
  )
}

export { App }
