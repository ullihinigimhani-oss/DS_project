const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'payment-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let isProducerConnected = false;

const initializeProducer = async () => {
    try {
        await producer.connect();
        isProducerConnected = true;
        console.log('Payment Service Kafka Producer connected');
        return true;
    } catch (error) {
        isProducerConnected = false;
        console.error(
            'Failed to connect Kafka Producer. Payment service will continue without event publishing:',
            error.message,
        );
        return false;
    }
};

const sendPaymentEvent = async (eventType, data) => {
    if (!isProducerConnected) {
        console.warn(`Skipping payment event "${eventType}" because Kafka is unavailable`);
        return false;
    }

    try {
        await producer.send({
            topic: 'payment-events',
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
        console.log(`Payment event sent: ${eventType}`);
        return true;
    } catch (error) {
        console.error('Error sending payment event:', error);
        return false;
    }
};

const disconnectProducer = async () => {
    if (!isProducerConnected) {
        return;
    }

    try {
        await producer.disconnect();
    } finally {
        isProducerConnected = false;
    }
};

module.exports = {
    initializeProducer,
    sendPaymentEvent,
    disconnectProducer,
};
