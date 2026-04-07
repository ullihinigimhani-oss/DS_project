const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

const initializeProducer = async () => {
  try {
    await producer.connect();
    console.log('Auth Service Kafka Producer connected');
  } catch (error) {
    console.error('Failed to connect Kafka Producer:', error);
    process.exit(1);
  }
};

const sendAuthEvent = async (eventType, data) => {
  try {
    await producer.send({
      topic: 'auth-events',
      messages: [
        {
          key: eventType,
          value: JSON.stringify({
            eventType,
            timestamp: new Date(),
            data,
          }),
        },
      ],
    });
    console.log(`Auth event sent: ${eventType}`);
  } catch (error) {
    console.error('Error sending auth event:', error);
  }
};

const disconnectProducer = async () => {
  await producer.disconnect();
};

module.exports = {
  initializeProducer,
  sendAuthEvent,
  disconnectProducer,
};
