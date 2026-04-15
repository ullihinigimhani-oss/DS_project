async function sendDoctorEvent(eventType, payload) {
  if (!eventType) {
    throw new Error('eventType is required');
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log('Doctor event emitted', { eventType, payload });
  }

  // Kafka is intentionally a no-op until broker connectivity is configured.
  return { delivered: false, eventType };
}

module.exports = {
  sendDoctorEvent,
};
