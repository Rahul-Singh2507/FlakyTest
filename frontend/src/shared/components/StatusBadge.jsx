const STATUS_GLYPHS = {
  passed: '✓',
  failed: '✕',
  healed: '↻',
  running: '…',
  pending: '○',
  completed: '✓',
  error: '✕',
  flaky: '≈',
}

function StatusBadge({ status, label = status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_GLYPHS[status]} {label.replace(/-/g, ' ').toUpperCase()}
    </span>
  )
}

export { StatusBadge }
