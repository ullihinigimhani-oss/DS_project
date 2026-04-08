const { Kafka } = require('kafkajs');
const {
  sendRegistrationSMS,
  sendAppointmentConfirmationSMS,
  sendAppointmentReminderSMS,
} = require('../services/twilioService');
const Notification = require('../models/Notification');

const formatDate = (value) => {
  if (!value) {
    return value;
  }

  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return value;
  }
};

const formatTime = (value) => {
  if (!value) {
    return value;
  }

  try {
    const [hours, minutes] = value.toString().split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
};

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'notification-group' });
let consumerStarted = false;

const initializeConsumer = async () => {
  if (consumerStarted) {
    return;
  }

  try {
    const broker = process.env.KAFKA_BROKER || 'kafka:9092';
    console.log(`[Kafka] Connecting to broker: ${broker}`);
    await consumer.connect();
    console.log('[Kafka] Consumer connected');

    const topics = ['auth-events', 'payment-events', 'appointment-events', 'doctor-events'];
    await consumer.subscribe({ topics, fromBeginning: false });
    console.log(`[Kafka] Subscribed to topics: ${topics.join(', ')}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`[Kafka] Received event from ${topic} partition ${partition} offset ${message.offset}`);
          await handleEvent(event);
        } catch (error) {
          console.error('[Kafka] Error processing message:', error.message);
        }
      },
    });

    consumerStarted = true;
    console.log('[Kafka] Consumer running');
  } catch (error) {
    console.error('[Kafka] Failed to initialize consumer:', error.message);
    throw error;
  }
};

const handleEvent = async (event) => {
  try {
    const { eventType, data = {} } = event || {};
    console.log(`[Kafka Handler] Processing event type: ${eventType}`);

    switch (eventType) {
      case 'USER_REGISTERED':
        if (data.userId) {
          await Notification.create({
            userId: data.userId,
            type: 'registration',
            title: 'Welcome to MediConnect',
            message: 'Your account has been successfully created',
            data: { email: data.email },
          });
        }
        if (data.phone) {
          await sendRegistrationSMS(data.phone, data.name);
        }
        break;

      case 'USER_LOGIN':
      case 'USER_PROFILE_UPDATED':
        break;

      case 'APPOINTMENT_PENDING':
        if (data.patientId) {
          await Notification.create({
            userId: data.patientId,
            type: 'appointment_pending',
            title: 'Appointment Request Received',
            message: `Your appointment request with ${data.doctorName || 'Dr. ...'} on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)} is pending approval`,
            data: {
              appointmentId: data.appointmentId,
              doctorName: data.doctorName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        if (data.doctorId) {
          await Notification.create({
            userId: data.doctorId,
            type: 'appointment_new_request',
            title: 'New Appointment Request',
            message: `${data.patientName || 'A patient'} has requested an appointment on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)}`,
            data: {
              appointmentId: data.appointmentId,
              patientName: data.patientName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        break;

      case 'APPOINTMENT_CANCELLED':
        if (data.doctorId) {
          await Notification.create({
            userId: data.doctorId,
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled',
            message: `${data.patientName || 'A patient'} has cancelled their appointment on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)}`,
            data: {
              appointmentId: data.appointmentId,
              patientName: data.patientName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        if (data.patientId) {
          await Notification.create({
            userId: data.patientId,
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled',
            message: `Your appointment with ${data.doctorName || 'Dr. ...'} on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)} has been cancelled`,
            data: {
              appointmentId: data.appointmentId,
              doctorName: data.doctorName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        break;

      case 'APPOINTMENT_REJECTED':
        if (data.patientId) {
          const message = data.reason
            ? `Your appointment request with ${data.doctorName || 'Dr. ...'} on ${formatDate(data.appointmentDate)} was declined: ${data.reason}`
            : `Your appointment request with ${data.doctorName || 'Dr. ...'} on ${formatDate(data.appointmentDate)} was declined`;
          await Notification.create({
            userId: data.patientId,
            type: 'appointment_rejected',
            title: 'Appointment Request Declined',
            message,
            data: {
              appointmentId: data.appointmentId,
              doctorName: data.doctorName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        break;

      case 'APPOINTMENT_BOOKED':
        if (data.patientId) {
          await Notification.create({
            userId: data.patientId,
            type: 'appointment',
            title: 'Appointment Confirmed',
            message: `Your appointment with ${data.doctorName || 'Dr. ...'} is confirmed on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)}`,
            data: {
              appointmentId: data.appointmentId,
              doctorName: data.doctorName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        if (data.patientPhone) {
          await sendAppointmentConfirmationSMS(
            data.patientPhone,
            data.patientName || 'Patient',
            data.doctorName || 'the doctor',
            data.appointmentDate,
            data.startTime
          );
        }
        break;

      case 'APPOINTMENT_REMINDER':
        if (data.patientId) {
          await Notification.create({
            userId: data.patientId,
            type: 'reminder',
            title: 'Upcoming Appointment',
            message: `Reminder: You have an appointment with ${data.doctorName || 'Dr. ...'} on ${formatDate(data.appointmentDate)} at ${formatTime(data.startTime)}`,
            data: {
              appointmentId: data.appointmentId,
              doctorName: data.doctorName,
              appointmentDate: data.appointmentDate,
            },
          });
        }
        if (data.patientPhone) {
          await sendAppointmentReminderSMS(
            data.patientPhone,
            data.patientName || 'Patient',
            data.doctorName || 'the doctor',
            data.appointmentDate,
            data.startTime
          );
        }
        break;

      case 'PAYMENT_COMPLETED':
        if (data.userId) {
          await Notification.create({
            userId: data.userId,
            type: 'payment',
            title: 'Payment Successful',
            message: `Payment of $${data.amount} has been processed successfully`,
            data: {
              paymentId: data.paymentId,
              amount: data.amount,
            },
          });
        }
        break;

      case 'PAYMENT_FAILED':
        if (data.userId) {
          await Notification.create({
            userId: data.userId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Payment of $${data.amount} could not be processed. Please try again.`,
            data: {
              paymentId: data.paymentId,
              amount: data.amount,
              reason: data.reason,
            },
          });
        }
        break;

      case 'PRESCRIPTION_ISSUED':
        if (data.patientId) {
          await Notification.create({
            userId: data.patientId,
            type: 'prescription',
            title: 'New Prescription',
            message: `A new prescription has been issued by ${data.doctorName || 'Dr. ...'}`,
            data: {
              prescriptionId: data.prescriptionId,
              doctorName: data.doctorName,
              medicationCount: data.medicationCount,
            },
          });
        }
        break;

      default:
        console.log(`[Kafka Handler] Unknown event type: ${eventType}`);
    }
  } catch (error) {
    console.error('[Kafka Handler] Error handling event:', error.message);
  }
};

const disconnectConsumer = async () => {
  if (!consumerStarted) {
    return;
  }

  await consumer.disconnect();
  consumerStarted = false;
};

module.exports = {
  initializeConsumer,
  disconnectConsumer,
  handleEvent,
};
