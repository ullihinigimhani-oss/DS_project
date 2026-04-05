const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'appointment-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

const sendAppointmentEvent = async (eventType, eventData) => {
    try {
        await producer.connect();
        await producer.send({
            topic: 'appointment-events',
            messages: [
                {
                    key: eventData.appointmentId,
                    value: JSON.stringify({
                        eventType,
                        data: eventData,
                        timestamp: new Date().toISOString(),
                    }),
                },
            ],
        });
        await producer.disconnect();
        console.log(`Event sent: ${eventType} for appointment ${eventData.appointmentId}`);
    } catch (error) {
        console.error('Failed to send appointment event:', error);
    }
};

module.exports = { sendAppointmentEvent };
