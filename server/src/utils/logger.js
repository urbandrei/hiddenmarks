function info(msg, data = {}) {
  console.log(JSON.stringify({ level: 'info', msg, ...data, ts: new Date().toISOString() }));
}

function error(msg, data = {}) {
  console.error(JSON.stringify({ level: 'error', msg, ...data, ts: new Date().toISOString() }));
}

function warn(msg, data = {}) {
  console.warn(JSON.stringify({ level: 'warn', msg, ...data, ts: new Date().toISOString() }));
}

module.exports = { info, error, warn };
