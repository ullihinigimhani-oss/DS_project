const notificationServiceCandidates = [
  process.env.NOTIFICATION_SERVICE_URL,
  'http://notification-service:3007',
  'http://localhost:3007',
].filter(Boolean);

async function sendInternalNotification(payload) {
  const internalServiceKey = process.env.INTERNAL_SERVICE_KEY || 'healthcare-internal-dev';
  let lastError = null;

  for (const baseUrl of notificationServiceCandidates) {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/notifications/internal`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': internalServiceKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return data;
      }

      lastError = new Error(data.message || `Notification service rejected request at ${baseUrl}`);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.error('[doctor-service] notification send failed:', lastError.message);
  }

  return null;
}

module.exports = {
  sendInternalNotification,
};
