package com.meendah.app.calldetection

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
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

        fun readTokenFromFile(context: android.content.Context): String? {
            return try {
                val file = java.io.File(context.filesDir, CallOverlayService.TOKEN_FILE_NAME)
                if (file.exists()) file.readText().trim().takeIf { it.isNotEmpty() } else null
            } catch (e: Exception) { null }
        }

        // Read access token directly from expo-secure-store — works even when JS bridge hasn't run.
        // expo-secure-store v55 stores data in "SecureStore" SharedPreferences using Android Keystore AES.
        fun readTokenFromExpoSecureStore(context: android.content.Context): String? {
            return try {
                val sp = context.getSharedPreferences("SecureStore", android.content.Context.MODE_PRIVATE)
                val encryptedJson = sp.getString("key_v1-auth_auth_storage", null) ?: return null
                val item = org.json.JSONObject(encryptedJson)
                if (item.optString("scheme") != "aes") return null
                val ct = android.util.Base64.decode(item.getString("ct"), android.util.Base64.DEFAULT)
                val iv = android.util.Base64.decode(item.getString("iv"), android.util.Base64.DEFAULT)
                val tlen = item.getInt("tlen")
                val ks = java.security.KeyStore.getInstance("AndroidKeyStore").also { it.load(null) }
                val keyEntry = ks.getEntry("AES/GCM/NoPadding:key_v1:keystoreUnauthenticated", null)
                    as? java.security.KeyStore.SecretKeyEntry ?: return null
                val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(javax.crypto.Cipher.DECRYPT_MODE, keyEntry.secretKey, javax.crypto.spec.GCMParameterSpec(tlen, iv))
                val json = String(cipher.doFinal(ct), java.nio.charset.StandardCharsets.UTF_8)
                val state = org.json.JSONObject(json).optJSONObject("state") ?: return null
                val token = state.optString("accessToken", "")
                if (token.isNotEmpty() && token != "null") token else null
            } catch (e: Exception) {
                Log.w(TAG, "readTokenFromExpoSecureStore failed: ${e.message}")
                null
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
        // Also persist to file so the overlay service can read it even on cold start
        // (when the JS bridge hasn't initialized yet and SharedPreferences might be stale)
        try {
            java.io.File(reactApplicationContext.filesDir, CallOverlayService.TOKEN_FILE_NAME)
                .writeText(token)
        } catch (e: Exception) {
            Log.w(TAG, "setAuthToken: file write failed: ${e.message}")
        }
    }

    @ReactMethod
    fun clearAuthToken() {
        prefs().edit().remove(CallOverlayService.PREF_TOKEN).apply()
        try {
            java.io.File(reactApplicationContext.filesDir, CallOverlayService.TOKEN_FILE_NAME).delete()
        } catch (e: Exception) {}
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
        // Run entirely on the main (UI) thread so addView test works without deadlock.
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                val result = checkOverlayPermissionOnMainThread()
                Log.d(TAG, "hasOverlayPermission: final result=$result")
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "hasOverlayPermission: exception: ${e.message}", e)
                promise.resolve(false)
            }
        }
    }

    private fun checkOverlayPermissionOnMainThread(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        val context = reactApplicationContext

        // Check 1: Standard API
        if (runCatching { Settings.canDrawOverlays(context) }.getOrDefault(false)) {
            Log.d(TAG, "hasOverlayPermission: check1 PASSED")
            return true
        }

        // Check 2: Via current activity context
        val activity = context.currentActivity
        if (activity != null && runCatching { Settings.canDrawOverlays(activity) }.getOrDefault(false)) {
            Log.d(TAG, "hasOverlayPermission: check2 PASSED (activity)")
            return true
        }

        // Check 3: AppOpsManager — MODE_ALLOWED means explicitly granted
        // Note: on Samsung One UI 6+ (Android 14), granted overlay returns MODE_ALLOWED not MODE_DEFAULT
        try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                android.os.Process.myUid(),
                context.packageName
            )
            Log.d(TAG, "hasOverlayPermission: check3 AppOps mode=$mode")
            if (mode == android.app.AppOpsManager.MODE_ALLOWED) {
                Log.d(TAG, "hasOverlayPermission: check3 PASSED")
                return true
            }
        } catch (e: Exception) {
            Log.w(TAG, "hasOverlayPermission: check3 failed: ${e.message}")
        }

        // Check 4: Actually try adding a 1×1 TYPE_APPLICATION_OVERLAY view.
        // This is the only reliable check on Samsung One UI 6+ where canDrawOverlays()
        // returns false even after the user has granted the permission in Settings.
        // Safe to call directly here because we are already on the main thread.
        try {
            val ctx: Context = activity ?: context
            val wm = ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val testView = android.view.View(ctx)
            val lp = WindowManager.LayoutParams(
                1, 1,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            )
            wm.addView(testView, lp)
            wm.removeView(testView)
            Log.d(TAG, "hasOverlayPermission: check4 addView PASSED")
            return true
        } catch (e: Exception) {
            Log.w(TAG, "hasOverlayPermission: check4 addView FAILED: ${e.message}")
        }

        return false
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
            // Try multiple ways to open overlay settings:
            
            // Method 1: ACTION_MANAGE_OVERLAY_PERMISSION with package URI
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${activity.packageName}")
                ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                Log.d(TAG, "requestOverlayPermission: opening overlay settings (method 1)")
                activity.startActivity(intent)
                return
            } catch (e: Exception) {
                Log.w(TAG, "requestOverlayPermission: method 1 failed: ${e.message}")
            }
            
            // Method 2: Try without URI (some OEMs like Xiaomi, Huawei need this)
            try {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                Log.d(TAG, "requestOverlayPermission: opening overlay settings (method 2)")
                activity.startActivity(intent)
                return
            } catch (e: Exception) {
                Log.w(TAG, "requestOverlayPermission: method 2 failed: ${e.message}")
            }
            
            // Method 3: Open app details settings as last resort
            Log.e(TAG, "requestOverlayPermission: all methods failed, opening app details settings")
            openAppDetailsSettings()
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

    // ========================
    // EXPERIMENTAL: Multiple approaches to directly open overlay/appear-on-top settings
    // ========================

    @ReactMethod
    fun openOverlayMethodSettingsAction() {
        Log.d(TAG, "openOverlayMethodSettingsAction called")
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "openOverlayMethodSettingsAction: SUCCESS via ACTION_MANAGE_OVERLAY_PERMISSION with package URI")
        } catch (e: Exception) {
            Log.e(TAG, "openOverlayMethodSettingsAction failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun openOverlayMethodSpecialAccess() {
        Log.d(TAG, "openOverlayMethodSpecialAccess called")
        try {
            // Use the string directly since Settings.ACTION_MANAGE_SPECIAL_APP_ACCESS_WHITELIST
            // is not available in all SDK versions used for compilation
            val intent = Intent("android.settings.MANAGE_SPECIAL_APP_ACCESS_WHITELIST")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "openOverlayMethodSpecialAccess: SUCCESS via MANAGE_SPECIAL_APP_ACCESS_WHITELIST")
        } catch (e: Exception) {
            Log.e(TAG, "openOverlayMethodSpecialAccess failed: ${e.message}", e)
            // Fallback to app details settings
            openAppDetailsSettings()
        }
    }

    @ReactMethod
    fun openOverlayMethodAllAppsDrawOver() {
        Log.d(TAG, "openOverlayMethodAllAppsDrawOver called")
        // Try to open the "Apps that can appear on top" list directly (no package filter)
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "openOverlayMethodAllAppsDrawOver: SUCCESS via generic ACTION_MANAGE_OVERLAY_PERMISSION")
        } catch (e: Exception) {
            Log.e(TAG, "openOverlayMethodAllAppsDrawOver failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun openOverlayMethodXiaomi() {
        Log.d(TAG, "openOverlayMethodXiaomi called")
        // Try multiple Xiaomi-specific intents for overlay permissions
        val intentsToTry = listOf(
            // Method 1: Xiaomi MiuiSettings -> Additional settings -> App permissions
            Intent("com.android.settings.APP_PERMISSIONS").apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            // Method 2: Xiaomi Security app permissions
            Intent("com.miui.securitycenter.permission.PermissionReviewActivity").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            // Method 3: MIUI permissions manager
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            // Method 4: try MIUI security center
            Intent("com.miui.permcenter.permissions.AppPermissionsEditorActivity").apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in intentsToTry) {
            try {
                if (intent.resolveActivity(reactApplicationContext.packageManager) != null) {
                    reactApplicationContext.startActivity(intent)
                    Log.d(TAG, "openOverlayMethodXiaomi: SUCCESS via ${intent.action}")
                    return
                }
            } catch (e: Exception) {
                Log.d(TAG, "openOverlayMethodXiaomi: tried ${intent.action} but failed: ${e.message}")
            }
        }
        Log.e(TAG, "openOverlayMethodXiaomi: ALL MIUI intents failed, falling back to app details")
        openAppDetailsSettings()
    }

    @ReactMethod
    fun openOverlayMethodAppDetailsDeepLink() {
        Log.d(TAG, "openOverlayMethodAppDetailsDeepLink called")
        try {
            // Try to use ACTION_APPLICATION_DETAILS_SETTINGS with a different approach
            // Some OEMs show a "Display over other apps" option in app details
            val intent = Intent().apply {
                action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                data = Uri.fromParts("package", reactApplicationContext.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                // On some Samsung/OneUI devices, this extra helps show the overlay option
                putExtra("android.provider.extra.APP_PACKAGE", reactApplicationContext.packageName)
            }
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "openOverlayMethodAppDetailsDeepLink: SUCCESS")
        } catch (e: Exception) {
            Log.e(TAG, "openOverlayMethodAppDetailsDeepLink failed: ${e.message}", e)
            openAppDetailsSettings()
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
        val hasOverlayPermission = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            true
        } else {
            // Use the same comprehensive check as hasOverlayPermission but inline for speed
            Settings.canDrawOverlays(reactApplicationContext) || try {
                val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
                val mode = appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                    android.os.Process.myUid(),
                    reactApplicationContext.packageName
                )
                mode == android.app.AppOpsManager.MODE_ALLOWED || mode == android.app.AppOpsManager.MODE_DEFAULT
            } catch (e: Exception) { false }
        }
        Log.d(TAG, "[CallDetectionModule] has overlay permission: $hasOverlayPermission")
        if (!hasOverlayPermission) {
            Log.e(TAG, "[CallDetectionModule] NO OVERLAY PERMISSION - can't show overlay!")
            return
        }
        // Read token from our prefs, then file, then fall back to expo-secure-store directly
        val prefs = prefs()
        val authToken = prefs.getString(CallOverlayService.PREF_TOKEN, null)
            ?: Companion.readTokenFromFile(reactApplicationContext)
            ?: Companion.readTokenFromExpoSecureStore(reactApplicationContext)
        val baseUrl = prefs.getString(CallOverlayService.PREF_BASE_URL, null)
        Log.d(TAG, "[CallDetectionModule] Token available: ${!authToken.isNullOrEmpty()}, baseUrl: ${!baseUrl.isNullOrEmpty()}")

        val intent = Intent(reactApplicationContext, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            if (!authToken.isNullOrEmpty()) {
                putExtra(CallOverlayService.EXTRA_AUTH_TOKEN, authToken)
            }
            if (!baseUrl.isNullOrEmpty()) {
                putExtra(CallOverlayService.EXTRA_BASE_URL, baseUrl)
            }
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
    fun blockNumber(phoneNumber: String) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                MeenDahCallScreeningService.BLOCKED_NUMBERS_PREFS, Context.MODE_PRIVATE
            )
            val existing = prefs.getString(MeenDahCallScreeningService.BLOCKED_NUMBERS_KEY, null)
            val arr = if (existing != null) org.json.JSONArray(existing) else org.json.JSONArray()
            // Avoid duplicates
            for (i in 0 until arr.length()) {
                if (arr.getString(i) == phoneNumber) return
            }
            arr.put(phoneNumber)
            prefs.edit().putString(MeenDahCallScreeningService.BLOCKED_NUMBERS_KEY, arr.toString()).apply()
            Log.d(TAG, "blockNumber: saved $phoneNumber, total=${arr.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "blockNumber failed: ${e.message}")
        }
    }

    @ReactMethod
    fun unblockNumber(phoneNumber: String) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                MeenDahCallScreeningService.BLOCKED_NUMBERS_PREFS, Context.MODE_PRIVATE
            )
            val existing = prefs.getString(MeenDahCallScreeningService.BLOCKED_NUMBERS_KEY, null) ?: return
            val arr = org.json.JSONArray(existing)
            val newArr = org.json.JSONArray()
            for (i in 0 until arr.length()) {
                if (arr.getString(i) != phoneNumber) newArr.put(arr.getString(i))
            }
            prefs.edit().putString(MeenDahCallScreeningService.BLOCKED_NUMBERS_KEY, newArr.toString()).apply()
            Log.d(TAG, "unblockNumber: removed $phoneNumber, total=${newArr.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "unblockNumber failed: ${e.message}")
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
    fun callNumber(phoneNumber: String) {
        Log.d(TAG, "callNumber called: $phoneNumber")
        try {
            val cleaned = phoneNumber.replace(Regex("[^\\d+]"), "")
            val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
                reactApplicationContext, android.Manifest.permission.CALL_PHONE
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            val intent = if (hasPermission) {
                Intent(Intent.ACTION_CALL).apply {
                    data = Uri.parse("tel:$cleaned")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Log.w(TAG, "callNumber: no CALL_PHONE permission, falling back to ACTION_DIAL")
                Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:$cleaned")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "callNumber failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendLogToJS(tag: String, message: String, level: String) {
        // Send logs from native to JS so they appear in debugLogger
        val data = Arguments.createMap().apply {
            putString("tag", tag)
            putString("message", message)
            putString("level", level)
        }
        sendToReactNative("nativeLog", data.toString())
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
