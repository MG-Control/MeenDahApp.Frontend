package com.meendah.app.calldetection

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class CallDetectionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

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
     * ده مطلوب على Android 10+ (API 29+) عشان MeenDahCallScreeningService يشتغل ويجيب رقم المتصل.
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

    private fun prefs() = reactApplicationContext.getSharedPreferences(
        CallOverlayService.PREFS_NAME, Context.MODE_PRIVATE
    )

    companion object {
        private const val REQUEST_ROLE_CODE = 1001
    }
}
