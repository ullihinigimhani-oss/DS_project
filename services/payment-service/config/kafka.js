const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'payment-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

const initializeProducer = async () => {
    try {
        await producer.connect();
        console.log('Payment Service Kafka Producer connected');
    } catch (error) {
        console.error('Failed to connect Kafka Producer:', error);
        process.exit(1);
    }
};

const sendPaymentEvent = async (eventType, data) => {
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
    } catch (error) {
        console.error('Error sending payment event:', error);
    }
};

const disconnectProducer = async () => {
    await producer.disconnect();
};

module.exports = {
    initializeProducer,
    sendPaymentEvent,
    disconnectProducer,
};
