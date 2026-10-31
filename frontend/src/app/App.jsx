import { useEffect, useState } from 'react'
import { AuthPage } from '../features/auth/AuthPage.jsx'
import { getCurrentUser, logout } from '../features/auth/authApi.js'
import { Dashboard } from '../features/dashboard/Dashboard.jsx'
import { LandingPage } from '../features/landing/LandingPage.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState(null)
  const [jiraCredentials, setJiraCredentials] = useState(null)
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
      setJiraCredentials(null)
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
      {authError && (
        <p className="app-error">
          {authError}
        </p>
      )}
      <Dashboard
        jiraCredentials={jiraCredentials}
        jiraPostComments={jiraPostComments}
        onJiraCredentialsChange={setJiraCredentials}
        onJiraPostCommentsChange={setJiraPostComments}
        onLogout={handleLogout}
        user={user}
      />
    </>
  )
}

export { App }
