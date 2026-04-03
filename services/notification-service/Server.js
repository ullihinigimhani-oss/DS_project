const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'notification-service', status: 'running', port: PORT });
});

// Send notification
app.post('/api/notifications/send', (req, res) => {
  // TODO: Implement notification sending
  res.json({ message: 'Notification service - Send notification', status: 'pending' });
});

// Get notifications
app.get('/api/notifications/:userId', (req, res) => {
  // TODO: Implement notification retrieval
  res.json({ message: 'Notification service - Get notifications', userId: req.params.userId });
});

// Mark as read
app.post('/api/notifications/:id/read', (req, res) => {
  // TODO: Implement mark as read
  res.json({ message: 'Notification service - Mark as read', notificationId: req.params.id });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
