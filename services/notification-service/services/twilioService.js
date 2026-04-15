const axios = require('axios');

const SMSAPI_BASE = 'https://dashboard.smsapi.lk/api/v3';
const SMS_BRAND_NAME = 'Arogya Healthcare System';

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) {
    return timeStr;
  }

  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const normalisePhone = (phone) => {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[\s\-+]/g, '');

  if (/^0\d{9}$/.test(digits)) {
    return `94${digits.slice(1)}`;
  }
  if (/^94\d{9}$/.test(digits)) {
    return digits;
  }
  if (/^\d{9}$/.test(digits)) {
    return `94${digits}`;
  }

  return null;
};

const sendSMS = async (to, body) => {
  const apiToken = process.env.SMSAPI_TOKEN;
  const senderId = process.env.SMSAPI_SENDER_ID;

  if (!apiToken || !senderId) {
    console.warn('SMSAPI_TOKEN or SMSAPI_SENDER_ID is not set. Skipping SMS.');
    return null;
  }

  const recipient = normalisePhone(to);
  if (!recipient) {
    console.warn(`Skipping SMS - unrecognised phone number format: "${to}"`);
    return null;
  }

  try {
    const response = await axios.post(
      `${SMSAPI_BASE}/sms/send`,
      { recipient, sender_id: senderId, message: body, type: 'plain' },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    if (response.data?.status === 'success') {
      console.log(`SMS sent to ${recipient} via SMSAPI.LK`);
    } else {
      console.warn('SMSAPI.LK returned non-success:', response.data);
    }

    return response.data;
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error(`Failed to send SMS to ${recipient}:`, detail);
    throw error;
  }
};

const sendRegistrationSMS = async (phone, name) => {
  const body =
    `Welcome to ${SMS_BRAND_NAME}, ${name}! ` +
    `Your registration was successful. You can now book appointments with our doctors. ` +
    `Thank you for joining us!`;
  return sendSMS(phone, body);
};

const sendAppointmentConfirmationSMS = async (phone, patientName, doctorName, appointmentDate, startTime) => {
  const body =
    `Hello ${patientName}, your appointment with Dr. ${doctorName} ` +
    `has been booked for ${formatDate(appointmentDate)} at ${formatTime(startTime)}. ` +
    `We will remind you 24 hours before. ${SMS_BRAND_NAME}.`;
  return sendSMS(phone, body);
};

const sendAppointmentReminderSMS = async (phone, patientName, doctorName, appointmentDate, startTime) => {
  const body =
    `Reminder: Hello ${patientName}, your appointment with Dr. ${doctorName} ` +
    `is tomorrow - ${formatDate(appointmentDate)} at ${formatTime(startTime)}. ` +
    `Please be on time. Contact us if you need to reschedule. ${SMS_BRAND_NAME}.`;
  return sendSMS(phone, body);
};

module.exports = {
  sendSMS,
  sendRegistrationSMS,
  sendAppointmentConfirmationSMS,
  sendAppointmentReminderSMS,
};
