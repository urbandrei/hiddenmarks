/**
 * Generate a random 6-digit room code.
 */
function generateRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generateRoomCode };
