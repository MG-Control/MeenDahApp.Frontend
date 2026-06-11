const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Copy Kotlin source files from plugins/calldetection-src/ into the generated /android directory
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

// Add all required permissions, receiver, and service to AndroidManifest.xml
function withCallDetectionManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // --- permissions ---
    const requiredPermissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    ];

    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const existingPerms = new Set(
      manifest['uses-permission'].map((p) => p.$?.['android:name'])
    );
    for (const perm of requiredPermissions) {
      if (!existingPerms.has(perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    // --- application entries ---
    const application = manifest.application?.[0];
    if (!application) return cfg;

    if (!application.receiver) application.receiver = [];
    if (!application.service) application.service = [];

    const hasReceiver = application.receiver.some(
      (r) => r.$?.['android:name'] === '.calldetection.CallReceiver'
    );
    if (!hasReceiver) {
      application.receiver.push({
        $: {
          'android:name': '.calldetection.CallReceiver',
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

    const hasOverlayService = application.service.some(
      (s) => s.$?.['android:name'] === '.calldetection.CallOverlayService'
    );
    if (!hasOverlayService) {
      application.service.push({
        $: {
          'android:name': '.calldetection.CallOverlayService',
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
        },
      });
    }

    // ── MeenDahCallScreeningService (Android 10+ - الطريقة الوحيدة الموثوقة لجلب رقم المتصل)
    const hasScreeningService = application.service.some(
      (s) => s.$?.['android:name'] === '.calldetection.MeenDahCallScreeningService'
    );
    if (!hasScreeningService) {
      application.service.push({
        $: {
          'android:name': '.calldetection.MeenDahCallScreeningService',
          'android:exported': 'true',
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
