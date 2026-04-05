const pino = require('pino');
const path = require('path');

// Simple console logger as fallback
const logger = pino({
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

module.exports = logger;
