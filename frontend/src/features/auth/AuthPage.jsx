import { useState } from 'react'
import { login, register } from './authApi.js'

function AuthPage({
  onAuthenticated,
  onBackToLanding,
  initialError = '',
  initialMode = 'login',
}) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [submitting, setSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = isRegistering
        ? await register({ name, email, password })
        : await login({ email, password })
      onAuthenticated(user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode(isRegistering ? 'login' : 'register')
    setError('')
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <button
          className="auth-home"
          onClick={onBackToLanding}
          type="button"
        >
          ← SentinelQA
        </button>
        <div className="auth-brand">
          <h1 className="auth-title">
            {isRegistering ? 'Create your account' : 'SentinelQA'}
          </h1>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isRegistering && (
            <label className="auth-field">
              Name
              <input
                autoComplete="name"
                className="auth-input"
                maxLength={80}
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
                value={name}
              />
            </label>
          )}
          <label className="auth-field">
            Email
            <input
              autoComplete="email"
              className="auth-input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="auth-field">
            Password
            <input
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              className="auth-input"
              minLength={isRegistering ? 8 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegistering ? 'Create a password' : 'Enter your password'}
              required
              type="password"
              value={password}
            />
            {isRegistering && (
              <span className="auth-help">Use at least 8 characters.</span>
            )}
          </label>

          {error && (
            <p
              aria-live="polite"
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? 'Please wait...'
              : isRegistering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegistering ? 'Already have an account?' : 'New to SentinelQA?'}{' '}
          <button
            className="text-button"
            onClick={switchMode}
            type="button"
          >
            {isRegistering ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  )
}

export { AuthPage }
