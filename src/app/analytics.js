const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs a beta event to the database.
 * @param {string} eventName - Name of the event (e.g., 'packet_completed').
 * @param {object} payload - Metadata for the event.
 */
async function logAppEvent(eventName, payload = {}) {
  try {
    await prisma.appEvent.create({
      data: {
        event: eventName,
        payload: payload
      }
    });
  } catch (error) {
    console.error(`[Analytics Error] Failed to log event ${eventName}:`, error.message);
  }
}

module.exports = { logAppEvent };
