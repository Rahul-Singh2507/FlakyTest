function SitePreview({ viewer, origin, loading, error, pages, onBrowse, onAddPage }) {
  const canAddViewedPage = viewer && viewer.origin === origin && !pages.includes(viewer.path)

  return (
    <section className="site-preview" aria-label="Website preview">
      <div className="browser">
        <div className="browser-bar">
          <span className="browser-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="browser-address" title={viewer?.url}>
            {viewer?.url ?? 'No website yet'}
          </span>
          {viewer && (
            <a className="browser-open" href={viewer.url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          )}
        </div>
        <div className="browser-viewport">
          {viewer && <img src={viewer.screenshot} alt={`Screenshot of ${viewer.url}`} />}
          {!viewer && !loading && !error && (
            <p className="browser-placeholder">
              Enter the website URL for this ticket to see a live preview here.
            </p>
          )}
          {error && !loading && <p className="browser-placeholder browser-error">{error}</p>}
          {loading && <p className="browser-loading">Opening the site in a headless browser...</p>}
        </div>
      </div>

      {viewer && (
        <div className="preview-meta">
          <span className="preview-title">{viewer.title}</span>
          {viewer.httpStatus >= 400 && <span className="badge badge-failed">HTTP {viewer.httpStatus}</span>}
          {viewer.hasLoginForm && <span className="badge badge-pending">Login form</span>}
          {canAddViewedPage && (
            <button type="button" className="btn btn-small" onClick={() => onAddPage(viewer.path)}>
              + Test this page
            </button>
          )}
        </div>
      )}

      {pages.length > 0 && (
        <nav className="page-tabs" aria-label="Pages to test">
          {pages.map((pagePath) => (
            <button
              key={pagePath}
              type="button"
              className={viewer?.path === pagePath ? 'page-tab active' : 'page-tab'}
              onClick={() => onBrowse(pagePath)}
              disabled={loading}
            >
              {pagePath}
            </button>
          ))}
        </nav>
      )}
    </section>
  )
}

export { SitePreview }
