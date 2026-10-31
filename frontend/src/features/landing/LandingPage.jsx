function LandingPage({ error = '', onGetStarted, onSignIn }) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a aria-label="SentinelQA home" className="landing-brand" href="#top">
          SentinelQA
        </a>
        <nav aria-label="Main navigation" className="landing-nav">
          <a href="#how-it-works">How it works</a>
          <button className="landing-signin" onClick={onSignIn} type="button">
            Sign in
          </button>
          <button className="landing-nav-cta" onClick={onGetStarted} type="button">
            Get started
          </button>
        </nav>
      </header>

      <section aria-labelledby="landing-title" className="landing-hero" id="top">
        <div className="landing-copy">
          <p className="landing-kicker">
            <span aria-hidden="true" className="landing-kicker-dot" />
            WEB TESTING, WITHOUT THE GUESSWORK
          </p>
          <h1 id="landing-title">
            Find the flakes.
            <br />
            <span>Ship with confidence.</span>
          </h1>
          <p className="landing-description">
            Turn Jira requirements into browser tests, watch every run unfold,
            and get a clear view of what passed, failed, or recovered.
          </p>
          {error && <p className="landing-error" role="alert">{error}</p>}
          <div className="landing-actions">
            <button className="landing-primary" onClick={onGetStarted} type="button">
              Start testing <span aria-hidden="true">→</span>
            </button>
            <button className="landing-secondary" onClick={onSignIn} type="button">
              I already have an account
            </button>
          </div>
          <div className="landing-proof">
            <span>Jira-connected workflows</span>
            <span>Live browser runs</span>
            <span>Readable test results</span>
          </div>
        </div>

        <div aria-label="Sample test run preview" className="landing-preview">
          <div className="landing-preview-top">
            <div>
              <span className="landing-preview-label">RUN OVERVIEW</span>
              <h2>Checkout flow</h2>
            </div>
            <span className="landing-run-state">
              <span aria-hidden="true" />
              COMPLETE
            </span>
          </div>
          <div className="landing-preview-meta">
            <span>JIRA-248</span>
            <span>Chrome · 2m 18s</span>
          </div>
          <div className="landing-metrics">
            <div className="landing-metric">
              <strong>12</strong>
              <span>Tests</span>
            </div>
            <div className="landing-metric landing-metric-pass">
              <strong>10</strong>
              <span>Passed</span>
            </div>
            <div className="landing-metric landing-metric-recovered">
              <strong>2</strong>
              <span>Recovered</span>
            </div>
          </div>
          <div className="landing-test-list">
            <div className="landing-test-row">
              <span className="landing-test-indicator passed">✓</span>
              <span>Customer can add an item to cart</span>
              <span className="landing-test-time">4.2s</span>
            </div>
            <div className="landing-test-row">
              <span className="landing-test-indicator passed">✓</span>
              <span>Checkout displays delivery options</span>
              <span className="landing-test-time">6.8s</span>
            </div>
            <div className="landing-test-row recovered">
              <span className="landing-test-indicator healed">↻</span>
              <span>Submit order finds updated button</span>
              <span className="landing-test-time">Recovered</span>
            </div>
          </div>
          <div className="landing-preview-footer">
            <span>RUN HEALTH</span>
            <div aria-label="Run health: 10 of 12 passed, 2 recovered" className="landing-health-bar">
              <span />
            </div>
            <strong>100%</strong>
          </div>
        </div>
      </section>

      <section aria-label="SentinelQA capabilities" className="landing-capabilities" id="how-it-works">
        <div className="landing-section-heading">
          <p className="landing-kicker">A CLEARER WAY TO TEST</p>
          <h2>From requirement to reliable release.</h2>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature">
            <span aria-hidden="true" className="landing-feature-number">01</span>
            <h3>Start with the work</h3>
            <p>Bring in a Jira ticket and turn its acceptance criteria into focused UI checks.</p>
          </article>
          <article className="landing-feature">
            <span aria-hidden="true" className="landing-feature-number">02</span>
            <h3>See every step</h3>
            <p>Follow browser execution live and understand exactly where a test needs attention.</p>
          </article>
          <article className="landing-feature">
            <span aria-hidden="true" className="landing-feature-number">03</span>
            <h3>Keep the signal</h3>
            <p>Review run history, screenshots, and repair details without digging through noise.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <span>SentinelQA</span>
        <span>More confidence in every test run.</span>
      </footer>
    </main>
  )
}

export { LandingPage }
