import { StatusBadge } from '../../../../shared/components/StatusBadge.jsx'

const HEALING_EVENT_TYPES = new Set([
  'healing-started',
  'heal-found',
  'heal-success',
  'heal-failed',
])

const describeHealingEvent = {
  'healing-started': (event) =>
    `Locator missing in "${event.testName}" step ${event.stepIndex + 1}: ${event.oldLocator}`,
  'heal-found': (event) =>
    `Candidate ${event.newLocator} via ${event.method} (${Math.round(event.confidence * 100)}%), re-running`,
  'heal-success': (event) => `Healed "${event.testName}"`,
  'heal-failed': (event) => `Heal failed for "${event.testName}": ${event.reason}`,
}

function collectTestStatuses(events) {
  const statuses = {}
  for (const event of events) {
    if (event.type === 'tests-generated') {
      event.tests.forEach((test) => {
        statuses[test.testIndex] = { name: test.testName, status: 'pending' }
      })
    }
    if (event.type === 'test-started') {
      statuses[event.testIndex] = { name: event.testName, status: 'running' }
    }
    if (event.type === 'test-completed') {
      statuses[event.testIndex] = {
        name: event.testName,
        status: event.status,
        flaky: event.flaky,
        duration: event.duration,
      }
    }
  }
  return Object.entries(statuses)
}

function RunProgress({ events }) {
  const testStatuses = collectTestStatuses(events)
  const healingEvents = events.filter((event) => HEALING_EVENT_TYPES.has(event.type))
  const isGenerating = events.at(-1).type === 'generating-tests'
  const generationNotes = events
    .filter((event) => event.type === 'tests-generated')
    .flatMap((event) => event.tests.map((test) => test.generationNote))

  return (
    <section className="run-progress">
      <h2>Run in Progress</h2>
      {isGenerating && <p className="empty">Generating tests from acceptance criteria...</p>}
      {generationNotes.length > 0 && (
        <p className="empty">{[...new Set(generationNotes)].join(' · ')}</p>
      )}
      <div className="progress-list">
        {testStatuses.map(([testIndex, test]) => (
          <div key={testIndex} className={`progress-item ${test.status}`}>
            <span className="progress-name">{test.name}</span>
            {test.flaky && <StatusBadge status="flaky" />}
            <StatusBadge status={test.status} />
            {test.duration !== undefined && (
              <span className="progress-duration">{test.duration}ms</span>
            )}
          </div>
        ))}
      </div>
      {healingEvents.length > 0 && (
        <div className="healing-log">
          <h3>Healing Activity</h3>
          {healingEvents.map((event, eventIndex) => (
            <div key={eventIndex} className="healing-event">
              {describeHealingEvent[event.type](event)}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export { RunProgress }
