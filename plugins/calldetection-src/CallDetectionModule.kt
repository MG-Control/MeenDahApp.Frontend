package com.meendah.app.calldetection

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*

class CallDetectionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQUEST_ROLE_CODE = 1001
        private const val TAG = "MeenDah"
    }

    override fun getName() = "CallDetectionModule"

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
    fun hasOverlayPermission(promise: Promise) {
        val result = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(reactApplicationContext)
        promise.resolve(result)
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val activity = reactApplicationContext.currentActivity ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(activity)
        ) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${activity.packageName}")
            ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            activity.startActivity(intent)
        }
    }

    /**
     * يطلب من المستخدم تعيين الـ app كـ default caller ID app.
     * ده مطلوب على Android 10+ عشان MeenDahCallScreeningService يشتغل ويجيب رقم المتصل.
     * على Android 10+: بيستخدم RoleManager.ROLE_CALL_SCREENING
     * على Android أقدم: بيفتح إعدادات الـ default phone app
     */
    @ReactMethod
    fun requestDefaultCallerIdApp(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.resolve(false)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ — نستخدم RoleManager لطلب دور Call Screening
                val roleManager = activity.getSystemService(RoleManager::class.java)
                if (roleManager != null && !roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
                    val roleIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
                    activity.startActivityForResult(roleIntent, REQUEST_ROLE_CODE)
                }
                promise.resolve(true)
            } else {
                // Android 9 وأقل — بيعمل EXTRA_INCOMING_NUMBER لو READ_CALL_LOG موجودة
                // مفيش حاجة نطلبها، الـ permission كافية
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * يتحقق إذا كان التطبيق هو الـ Default Caller ID & Spam App
     */
    @ReactMethod
    fun isDefaultCallerIdApp(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = reactApplicationContext.getSystemService(RoleManager::class.java)
                val isHeld = roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true
                Log.d(TAG, "[CallDetectionModule] isDefaultCallerIdApp: $isHeld")
                promise.resolve(isHeld)
            } else {
                // على Android أقل من 10، مش محتاجة default app، فنرجع true دائماً
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "[CallDetectionModule] isDefaultCallerIdApp failed: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * TEST: يظهر الـ overlay يدوياً لاختبار بدون مكالمة
     */
    @ReactMethod
    fun testShowOverlay(phoneNumber: String) {
        Log.d(TAG, "[CallDetectionModule] testShowOverlay called with: $phoneNumber")
        val hasOverlayPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(reactApplicationContext)
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

    /**
     * TEST: يخفي الـ overlay يدوياً
     */
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

    private fun prefs() = reactApplicationContext.getSharedPreferences(
        CallOverlayService.PREFS_NAME, Context.MODE_PRIVATE
    )
}
