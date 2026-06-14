package com.meendah.app.calldetection

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallDetectionModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
        setReactContext(reactContext)
    }

    companion object {
        private const val REQUEST_ROLE_CODE = 1001
        private const val TAG = "MeenDah"
        private var reactContext: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContext = context
            Log.d(TAG, "setReactContext called")
        }

        fun getReactContext(): ReactApplicationContext? = reactContext

        fun sendToReactNative(eventName: String, data: String) {
            val ctx = getReactContext()
            if (ctx != null && ctx.hasActiveCatalystInstance()) {
                try {
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, data)
                } catch (e: Exception) {
                    Log.e(TAG, "sendToReactNative failed: ${e.message}", e)
                }
            } else {
                Log.d(TAG, "sendToReactNative skipped: no active Catalyst instance")
            }
        }
    }

    override fun getName() = "CallDetectionModule"

    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() {}

    @ReactMethod
    fun setAuthToken(token: String) {
        prefs().edit().putString(CallOverlayService.PREF_TOKEN, token).apply()
    }

    @ReactMethod
    fun clearAuthToken() {
        prefs().edit().remove(CallOverlayService.PREF_TOKEN).apply()
    }

    @ReactMethod
    fun setApiBaseUrl(url: String) {
        prefs().edit().putString(CallOverlayService.PREF_BASE_URL, url).apply()
    }

    @ReactMethod
    fun setTheme(theme: String) {
        Log.d(TAG, "setTheme called: $theme")
        prefs().edit().putString(CallOverlayService.PREF_THEME, theme).apply()
        Log.d(TAG, "setTheme: saved to prefs")
    }

    @ReactMethod
    fun setVersion(version: String) {
        Log.d(TAG, "setVersion called: $version")
        prefs().edit().putString(CallOverlayService.PREF_VERSION, version).apply()
        Log.d(TAG, "setVersion: saved to prefs")
    }

    @ReactMethod
    fun setRefreshToken(refreshToken: String) {
        Log.d(TAG, "setRefreshToken called")
        prefs().edit().putString("auth_refresh_token", refreshToken).apply()
    }

    @ReactMethod
    fun clearRefreshToken() {
        Log.d(TAG, "clearRefreshToken called")
        prefs().edit().remove("auth_refresh_token").apply()
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                Log.d(TAG, "hasOverlayPermission: SDK < M, returning true")
                promise.resolve(true)
                return
            }

            val context = reactApplicationContext
            
            // Check 1: Standard Settings.canDrawOverlays check
            val check1 = try {
                Settings.canDrawOverlays(context)
            } catch (e: Exception) {
                Log.w(TAG, "hasOverlayPermission: check1 failed: ${e.message}")
                false
            }
            
            // Check 2: Check via current activity if available
            val check2 = try {
                val activity = context.currentActivity
                if (activity != null) Settings.canDrawOverlays(activity) else check1
            } catch (e: Exception) {
                Log.w(TAG, "hasOverlayPermission: check2 failed: ${e.message}")
                false
            }
            
            // Check 3: Use AppOpsManager to check SYSTEM_ALERT_WINDOW (most reliable on newer Android)
            val check3 = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val appOps = context.getSystemService(android.app.AppOpsManager::class.java)
                    val mode = appOps?.noteOpNoThrow(
                        android.app.AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                        android.os.Process.myUid(),
                        context.packageName
                    )
                    mode == android.app.AppOpsManager.MODE_ALLOWED
                } else {
                    // On older Android, try via Settings.canDrawOverlays again but with Application context
                    Settings.canDrawOverlays(context.applicationContext)
                }
            } catch (e: Exception) {
                Log.w(TAG, "hasOverlayPermission: check3 failed: ${e.message}")
                false
            }

            // Check 4: Last resort - try to actually add a test view (the most definitive check)
            val check4 = try {
                val wm = context.getSystemService(android.content.Context.WINDOW_SERVICE) as? android.view.WindowManager
                if (wm != null) {
                    val testView = android.view.View(context)
                    val testParams = android.view.WindowManager.LayoutParams(
                        1, 1,
                        android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                        android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                        android.graphics.PixelFormat.TRANSLUCENT
                    )
                    try {
                        wm.addView(testView, testParams)
                        wm.removeView(testView)
                        true
                    } catch (e: Exception) {
                        Log.w(TAG, "hasOverlayPermission: check4 (addView test) failed: ${e.message}")
                        false
                    }
                } else false
            } catch (e: Exception) {
                Log.w(TAG, "hasOverlayPermission: check4 exception: ${e.message}")
                false
            }
            
            val result = check1 || check2 || check3 || check4
            Log.d(TAG, "hasOverlayPermission: check1=$check1, check2=$check2, check3=$check3, check4=$check4, final=$result")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "hasOverlayPermission: exception: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        Log.d(TAG, "requestOverlayPermission called")
        val activity = reactApplicationContext.currentActivity ?: run {
            Log.e(TAG, "requestOverlayPermission: no current activity available")
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Always try to open overlay settings when user explicitly taps the button.
            // Even if Settings.canDrawOverlays() thinks it's granted, there could be a
            // known Android bug where it returns false incorrectly after a reboot.
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${activity.packageName}")
                ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                Log.d(TAG, "requestOverlayPermission: opening overlay settings")
                activity.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "requestOverlayPermission: ACTION_MANAGE_OVERLAY_PERMISSION failed, opening app details instead", e)
                openAppDetailsSettings()
            }
        } else {
            Log.d(TAG, "requestOverlayPermission: SDK < M, opening app details settings")
            openAppDetailsSettings()
        }
    }

    @ReactMethod
    fun openAppDetailsSettings() {
        Log.d(TAG, "openAppDetailsSettings called")
        val intent = Intent().apply {
            action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            data = Uri.fromParts("package", reactApplicationContext.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "openAppDetailsSettings failed", e)
        }
    }

    @ReactMethod
    fun requestDefaultCallerIdApp(promise: Promise) {
        try {
            Log.d(TAG, "requestDefaultCallerIdApp called")
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                Log.e(TAG, "requestDefaultCallerIdApp: no current activity")
                promise.resolve(false)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = activity.getSystemService(RoleManager::class.java)
                if (roleManager != null) {
                    val isHeld = roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
                    Log.d(TAG, "requestDefaultCallerIdApp: isRoleHeld: $isHeld")
                    if (isHeld) {
                        promise.resolve(true)
                        return
                    }
                    val roleIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
                    activity.startActivityForResult(roleIntent, REQUEST_ROLE_CODE)
                    promise.resolve(true)
                } else {
                    Log.e(TAG, "requestDefaultCallerIdApp: roleManager null")
                    openDefaultAppsSettings()
                    promise.resolve(false)
                }
            } else {
                openDefaultAppsSettings()
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestDefaultCallerIdApp error: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openDefaultAppsSettings() {
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
            } else {
                Intent(Settings.ACTION_SETTINGS)
            }
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Could not open settings: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isDefaultCallerIdApp(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = reactApplicationContext.getSystemService(RoleManager::class.java)
                val isHeld = roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true
                Log.d(TAG, "[CallDetectionModule] isDefaultCallerIdApp: $isHeld")
                promise.resolve(isHeld)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "[CallDetectionModule] isDefaultCallerIdApp failed: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        val isIgnoring = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
        } else {
            true
        }
        promise.resolve(isIgnoring)
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun testShowOverlay(phoneNumber: String) {
        Log.d(TAG, "[CallDetectionModule] testShowOverlay called with: $phoneNumber")
        val hasOverlayPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(reactApplicationContext)
        Log.d(TAG, "[CallDetectionModule] has overlay permission: $hasOverlayPermission")
        if (!hasOverlayPermission) {
            Log.e(TAG, "[CallDetectionModule] NO OVERLAY PERMISSION - can't show overlay!")
            return
        }
        val intent = Intent(reactApplicationContext, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            Log.d(TAG, "[CallDetectionModule] test service started OK")
        } catch (e: Exception) {
            Log.e(TAG, "[CallDetectionModule] test startService failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun testHideOverlay() {
        Log.d(TAG, "[CallDetectionModule] testHideOverlay called")
        val intent = Intent(reactApplicationContext, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_HIDE
        }
        try {
            reactApplicationContext.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "[CallDetectionModule] test hide failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun showPersistentNotification() {
        Log.d(TAG, "showPersistentNotification called")
        try {
            val intent = Intent(reactApplicationContext, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_SHOW_SETUP_NOTIFICATION
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show persistent notification", e)
        }
    }

    @ReactMethod
    fun hidePersistentNotification() {
        Log.d(TAG, "hidePersistentNotification called")
        try {
            val intent = Intent(reactApplicationContext, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_HIDE_SETUP_NOTIFICATION
            }
            reactApplicationContext.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to hide persistent notification", e)
        }
    }

    @ReactMethod
    fun getRecentLogs(promise: Promise) {
        try {
            val projection = arrayOf(
                CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.TYPE,
                CallLog.Calls.DURATION, CallLog.Calls.DATE, CallLog.Calls.COUNTRY_ISO
            )
            val sortOrder = "${CallLog.Calls.DATE} DESC"
            val cursor = reactApplicationContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )
            if (cursor != null && cursor.moveToFirst()) {
                val result = Arguments.createArray()
                val numberIndex = cursor.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIndex = cursor.getColumnIndex(CallLog.Calls.TYPE)
                val dateIndex = cursor.getColumnIndex(CallLog.Calls.DATE)
                val durationIndex = cursor.getColumnIndex(CallLog.Calls.DURATION)
                val countryIsoIndex = cursor.getColumnIndex(CallLog.Calls.COUNTRY_ISO)
                var count = 0
                do {
                    if (count >= 20) break
                    val callLog = Arguments.createMap()
                    callLog.putString("number", cursor.getString(numberIndex))
                    callLog.putInt("type", cursor.getInt(typeIndex))
                    callLog.putDouble("date", cursor.getLong(dateIndex).toDouble())
                    callLog.putInt("duration", cursor.getInt(durationIndex))
                    callLog.putString("countryIso", cursor.getString(countryIsoIndex))
                    result.pushMap(callLog)
                    count++
                } while (cursor.moveToNext())
                cursor.close()
                Log.d(TAG, "getRecentLogs: returning $count logs")
                promise.resolve(result)
            } else {
                Log.d(TAG, "getRecentLogs: no logs found")
                promise.resolve(Arguments.createArray())
            }
        } catch (e: Exception) {
            Log.e(TAG, "getRecentLogs exception: ${e.message}", e)
            promise.reject("Exception", e.message)
        }
    }

    private fun prefs() = reactApplicationContext.getSharedPreferences(
        CallOverlayService.PREFS_NAME, Context.MODE_PRIVATE
    )
}
