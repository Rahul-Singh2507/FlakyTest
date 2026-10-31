const CHANNEL_RETENTION_MS = 10 * 60 * 1000;

const channels = new Map();

const channelFor = (runId) => {
  const channel = channels.get(runId) ?? { history: [], listeners: new Set() };
  channels.set(runId, channel);
  return channel;
};

function emitRunEvent(runId, event) {
  const channel = channelFor(runId);
  const payload = { ...event, runId, at: new Date().toISOString() };
  channel.history.push(payload);
  channel.listeners.forEach((listener) => listener(payload));
  if (event.type === "run-completed") {
    setTimeout(() => channels.delete(runId), CHANNEL_RETENTION_MS).unref();
  }
}

const hasRunChannel = (runId) => channels.has(runId);

function subscribeToRun(runId, listener) {
  const channel = channelFor(runId);
  channel.history.forEach(listener);
  channel.listeners.add(listener);
  return () => channel.listeners.delete(listener);
}

export { emitRunEvent, hasRunChannel, subscribeToRun };
