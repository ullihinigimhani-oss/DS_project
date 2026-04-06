const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const logAuditEvent = async (
  req,
  { action, resourceType, resourceId, details, status = 'success' },
) => {
  const actor = req.user || {};

  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = forwarded
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';
  const ipAddress = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;

  const auditData = {
    actorId: actor.id || details?.userId || null,
    actorEmail: actor.email || details?.email || null,
    actorName: actor.name || details?.name || null,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    status,
  };

  logger.info(auditData, `Audit Action: ${action}`);

  try {
    await AuditLog.create(auditData);
  } catch (error) {
    console.error('[AuditLog] Postgres save failed: ', error.message);

    logger.error(
      { error: error.message, originalLog: auditData },
      'DATABASE_SAVE_FAILURE',
    );
  }
};

module.exports = {
  logAuditEvent,
};
