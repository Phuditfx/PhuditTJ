const MAX_LOGS = 1000;
const STORAGE_KEY = 'phudit_app_logs';

let logs = [];

// Load existing logs from sessionStorage
try {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    logs = JSON.parse(stored);
  }
} catch (e) {
  console.warn("Could not load logs from sessionStorage");
}

const saveLogs = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // Ignore storage errors (e.g. quota exceeded)
  }
};

const addLog = (level, args) => {
  const timestamp = new Date().toISOString();
  // Safely stringify objects
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  logs.push({ timestamp, level, message });
  
  if (logs.length > MAX_LOGS) {
    logs.shift(); // Remove oldest
  }
  saveLogs();
};

// Intercept console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

export const initLogger = () => {
  console.log = (...args) => {
    addLog('INFO', args);
    originalConsoleLog.apply(console, args);
  };

  console.info = (...args) => {
    addLog('INFO', args);
    originalConsoleInfo.apply(console, args);
  };

  console.warn = (...args) => {
    addLog('WARN', args);
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args) => {
    addLog('ERROR', args);
    originalConsoleError.apply(console, args);
  };
};

export const getLogs = () => {
  return [...logs];
};

export const clearLogs = () => {
  logs = [];
  saveLogs();
};

export const downloadLogs = (requestAlert) => {
  if (logs.length === 0) {
    if (requestAlert) {
      requestAlert("No logs", "No logs to download");
    } else {
      alert("No logs to download");
    }
    return;
  }
  
  const textContent = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
  const blob = new Blob([textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `phudit-tj-logs-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
