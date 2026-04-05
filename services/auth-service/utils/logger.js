const pino = require('pino');
const path = require('path');

const logDirectory = path.join(process.cwd(), 'logs');
console.log(logDirectory);

const transport = pino.transport({
  target: 'pino-roll',
  options: {
    file: path.join(logDirectory, 'audit.json'),
    size: '10M',
    frequency: 'daily',
    mkdir: true,
    extension: 'json',
    dateFormat: 'yyyy-MM-dd',
    limit: {
      count: 10,
    },
  },
});

const logger = pino(
  {
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
  },
  transport,
);

module.exports = logger;
