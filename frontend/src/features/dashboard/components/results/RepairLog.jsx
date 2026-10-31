const REPAIR_FIELDS = [
  { label: 'Step', render: (repair) => repair.stepIndex + 1 },
  { label: 'Old Locator', render: (repair) => <span className="repair-old">{repair.oldLocator}</span> },
  { label: 'New Locator', render: (repair) => <span className="repair-new">{repair.newLocator}</span> },
  { label: 'Reason', render: (repair) => repair.reason },
  { label: 'Confidence', render: (repair) => `${Math.round(repair.confidence * 100)}%` },
  { label: 'Outcome', render: (repair) => repair.outcome.toUpperCase() },
  { label: 'Time', render: (repair) => new Date(repair.timestamp).toLocaleString() },
]

function RepairLog({ repairs }) {
  return (
    <section className="repair-section">
      <h2>Repair Log</h2>
      {repairs.length === 0 && <p className="empty">No repairs in this run</p>}
      <div className="repair-list">
        {repairs.map((repair) => (
          <div key={repair.id} className={`repair-card repair-${repair.outcome}`}>
            <div className="repair-header">
              <span className="repair-test">{repair.testName}</span>
              <span className="repair-method">{repair.method.toUpperCase()}</span>
            </div>
            <div className="repair-detail">
              {REPAIR_FIELDS.map((field) => (
                <div key={field.label} className="repair-row">
                  <span className="repair-label">{field.label}</span>
                  <span>{field.render(repair)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export { RepairLog }
