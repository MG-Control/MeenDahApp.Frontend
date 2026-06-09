package com.meendah.app.calldetection

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
        val activity = currentActivity ?: return
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

    private fun prefs() = reactApplicationContext.getSharedPreferences(
        CallOverlayService.PREFS_NAME, Context.MODE_PRIVATE
    )
}
