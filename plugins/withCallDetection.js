const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCallDetectionSources(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const srcDir = path.join(__dirname, 'calldetection-src');
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'meendah', 'app', 'calldetection'
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith('.kt')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
      return cfg;
    },
  ]);
}

function withCallDetectionManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const requiredPermissions = [
      "android.permission.READ_PHONE_STATE",
      "android.permission.READ_CALL_LOG",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
      "android.permission.MANAGE_OWN_CALLS",
      "android.permission.WAKE_LOCK",
      "android.permission.READ_PHONE_NUMBERS",
      "android.permission.ANSWER_PHONE_CALLS"
    ];
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const existingPerms = new Set(manifest['uses-permission'].map(p => p.$?.['android:name']));
    for (const perm of requiredPermissions) {
      if (!existingPerms.has(perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }
    const application = manifest.application?.[0];
    if (!application) return cfg;
    if (!application.receiver) application.receiver = [];
    if (!application.service) application.service = [];
    
    const hasReceiver = application.receiver.some(r => r.$?.['android:name'] === '.calldetection.CallReceiver');
    if (!hasReceiver) {
      application.receiver.push({
        $: {
          'android:name': '.calldetection.CallReceiver',
          'android:exported': 'true',
          'android:enabled': 'true',
          'android:enabled': 'true',
        },
        'intent-filter': [
          {
            $: { 'android:priority': 2147483647 }, // MAX PRIORITY - INTEGER NOT STRING!
            action: [
              { $: { 'android:name': 'android.intent.action.PHONE_STATE' } },
            ],
          },
        ],
      });
    }
    
    const hasOverlayService = application.service.some(s => s.$?.['android:name'] === '.calldetection.CallOverlayService');
    if (!hasOverlayService) {
      application.service.push({
        $: {
          'android:name': '.calldetection.CallOverlayService',
          'android:foregroundServiceType': 'phoneCall|dataSync',
          'android:exported': 'false',
          'android:enabled': 'true',
          'android:stopWithTask': 'false',
          'android:directBootAware': 'true',
          'android:enabled': 'true',
          'android:stopWithTask': 'false', // Don't stop when app closes!
          'android:directBootAware': 'true',
        },
      });
    }
    
    const hasScreeningService = application.service.some(s => s.$?.['android:name'] === '.calldetection.MeenDahCallScreeningService');
    if (!hasScreeningService) {
      application.service.push({
        $: {
          'android:name': '.calldetection.MeenDahCallScreeningService',
          'android:exported': 'true',
          'android:enabled': 'true',
          'android:enabled': 'true',
          'android:permission': 'android.permission.BIND_SCREENING_SERVICE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.telecom.CallScreeningService' } }],
          },
        ],
      });
    }
    return cfg;
  });
}

module.exports = (config) => {
  config = withCallDetectionSources(config);
  config = withCallDetectionManifest(config);
  return config;
};
