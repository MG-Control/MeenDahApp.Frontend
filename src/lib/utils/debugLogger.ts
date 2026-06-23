import { Platform } from 'react-native';
import Constants from 'expo-constants';

const MAX_LOGS = 500;
let logs: string[] = [];

function timestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

export const debugLogger = {
  log(tag: string, message: string, data?: any) {
    const line = `[${timestamp()}] [${tag}] ${message}${data !== undefined ? ' | data=' + JSON.stringify(data) : ''}`;
    logs.push(line);
    if (logs.length > MAX_LOGS) logs.shift();
    // Always log to console regardless of DEV/PROD
    console.log(line);
  },

  warn(tag: string, message: string, data?: any) {
    const line = `[${timestamp()}] [${tag}] ⚠️ WARN: ${message}${data !== undefined ? ' | data=' + JSON.stringify(data) : ''}`;
    logs.push(line);
    if (logs.length > MAX_LOGS) logs.shift();
    console.warn(line);
  },

  error(tag: string, message: string, data?: any) {
    const line = `[${timestamp()}] [${tag}] ❌ ERROR: ${message}${data !== undefined ? ' | data=' + JSON.stringify(data) : ''}`;
    logs.push(line);
    if (logs.length > MAX_LOGS) logs.shift();
    console.error(line);
  },

  getLogs(): string {
    return logs.join('\n');
  },

  clearLogs() {
    logs = [];
    this.log('Logger', 'Logs cleared');
  },

  getDeviceInfo(): string {
    const constants = Platform.constants as Record<string, any>;
    const deviceInfo = [
      '=== DEVICE INFO ===',
      `Platform: ${Platform.OS} ${Platform.Version}`,
      `App Version: ${Constants.expoConfig?.version || 'N/A'}`,
      `Device: ${constants.Manufacturer || constants.manufacturer || 'N/A'} ${constants.Model || constants.model || 'N/A'}`,
      `Build: ${(Constants.manifest as any)?.version || Constants.expoConfig?.version || 'N/A'}`,
      `RuntimeVersion: ${Constants.expoConfig?.runtimeVersion || 'N/A'}`,
      `SDKVersion: ${Constants.expoConfig?.sdkVersion || 'N/A'}`,
      `IsDevice: ${Constants.isDevice}`,
      `StatusBarHeight: ${Constants.statusBarHeight}`,
      '==================',
    ];
    return deviceInfo.join('\n');
  },

  getAllLogsWithDeviceInfo(): string {
    const header = [
      '=== MEENDAH DEBUG LOGS ===',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      this.getDeviceInfo(),
      '',
      '=== APPLICATION LOGS ===',
    ].join('\n');
    return header + '\n' + this.getLogs();
  },
};