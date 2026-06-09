const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_CALL_LOG',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
];

module.exports = function withCallDetection(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest;

    // ── Permissions ──────────────────────────────────────────────────────────
    if (!app['uses-permission']) app['uses-permission'] = [];
    PERMISSIONS.forEach((name) => {
      const exists = app['uses-permission'].some((p) => p.$['android:name'] === name);
      if (!exists) app['uses-permission'].push({ $: { 'android:name': name } });
    });

    const application = app.application[0];

    // ── BroadcastReceiver ────────────────────────────────────────────────────
    if (!application.receiver) application.receiver = [];
    const receiverName = '.calldetection.CallReceiver';
    if (!application.receiver.some((r) => r.$['android:name'] === receiverName)) {
      application.receiver.push({
        $: {
          'android:name': receiverName,
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [{ $: { 'android:name': 'android.intent.action.PHONE_STATE' } }],
          },
        ],
      });
    }

    // ── Foreground Service ───────────────────────────────────────────────────
    if (!application.service) application.service = [];
    const serviceName = '.calldetection.CallOverlayService';
    if (!application.service.some((s) => s.$['android:name'] === serviceName)) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
};
