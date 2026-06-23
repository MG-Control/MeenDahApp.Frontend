package com.meendah.app.calldetection

import android.content.Intent
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log

/**
 * CallScreeningService — يعمل على Android 10+ (API 29+).
 * هذه هي الطريقة الوحيدة الموثوقة لقراءة رقم المتصل بدون أن يرجع null،
 * حيث أن EXTRA_INCOMING_NUMBER في BroadcastReceiver أصبح مقيداً من API 29.
 */
class MeenDahCallScreeningService : CallScreeningService() {

    companion object {
        private const val TAG = "MeenDah"
        const val BLOCKED_NUMBERS_PREFS = "meendah_blocked_numbers"
        const val BLOCKED_NUMBERS_KEY = "blocked_list"
    }

    private fun isNumberBlocked(incomingNumber: String): Boolean {
        return try {
            val prefs = getSharedPreferences(BLOCKED_NUMBERS_PREFS, MODE_PRIVATE)
            val blockedJson = prefs.getString(BLOCKED_NUMBERS_KEY, null) ?: return false
            val arr = org.json.JSONArray(blockedJson)
            val normalizedIncoming = incomingNumber.replace(Regex("[^\\d+]"), "")
            for (i in 0 until arr.length()) {
                val blocked = arr.getString(i).replace(Regex("[^\\d+]"), "")
                if (blocked == normalizedIncoming) return true
                // Also match Egyptian numbers: +2010X == 010X
                val blockedLocal = if (blocked.startsWith("+20")) "0${blocked.substring(3)}" else blocked
                val incomingLocal = if (normalizedIncoming.startsWith("+20")) "0${normalizedIncoming.substring(3)}" else normalizedIncoming
                if (blockedLocal == incomingLocal) return true
            }
            false
        } catch (e: Exception) {
            Log.w(TAG, "isNumberBlocked check failed: ${e.message}")
            false
        }
    }

    override fun onScreenCall(details: Call.Details) {
        Log.d(TAG, "[CallScreening] onScreenCall called!")
        
        // 1. Try to get number from multiple sources
        var phoneNumber = ""

        // A. Primary: from details.handle (Uri)
        details.handle?.let { uri ->
            phoneNumber = uri.schemeSpecificPart ?: ""
            if (phoneNumber.isEmpty()) {
                val raw = uri.toString()
                if (raw.startsWith("tel:")) phoneNumber = raw.substring(4)
                else if (raw.contains(":")) phoneNumber = raw.split(":")[1]
            }
            Log.d(TAG, "[CallScreening] Got from handle: $phoneNumber")
        }

        // B. Fallback: from extras (Samsung and others often put it here)
        if (phoneNumber.isEmpty() || phoneNumber.length < 3) {
            details.extras?.let { extras ->
                val keys = arrayOf(
                    "android.telecom.extra.INCOMING_NUMBER",
                    "incoming_number",
                    "phone_number",
                    "number"
                )
                for (key in keys) {
                    val value = extras.getString(key)
                    if (!value.isNullOrEmpty()) {
                        phoneNumber = value
                        Log.d(TAG, "[CallScreening] Got from extra $key: $phoneNumber")
                        break
                    }
                }
            }
        }

        // C. Last resort: callerDisplayName (sometimes contains the number if no name)
        if (phoneNumber.isEmpty() && details.callerDisplayName != null) {
            val display = details.callerDisplayName.toString()
            if (display.replace(Regex("[^\\d+]"), "").length >= 7) {
                phoneNumber = display
                Log.d(TAG, "[CallScreening] Got from display name: $phoneNumber")
            }
        }

        phoneNumber = phoneNumber.trim()
        Log.d(TAG, "[CallScreening] Final phoneNumber: $phoneNumber")

        // Check if number is blocked
        if (phoneNumber.isNotEmpty() && isNumberBlocked(phoneNumber)) {
            Log.d(TAG, "[CallScreening] Number $phoneNumber is blocked — rejecting call")
            respondToCall(
                details,
                CallResponse.Builder()
                    .setDisallowCall(true)
                    .setRejectCall(true)
                    .setSkipCallLog(false)
                    .setSkipNotification(true)
                    .build()
            )
            return
        }

        // Read auth token and base URL from SharedPreferences to pass to overlay service
        val prefs = getSharedPreferences(CallOverlayService.PREFS_NAME, MODE_PRIVATE)
        val authToken = prefs.getString(CallOverlayService.PREF_TOKEN, null)
        val baseUrl = prefs.getString(CallOverlayService.PREF_BASE_URL, null)
        Log.d(TAG, "[CallScreening] Token available: ${!authToken.isNullOrEmpty()}, baseUrl: ${!baseUrl.isNullOrEmpty()}")

        // 2. Start Overlay Service with token and baseUrl as extras
        val intent = Intent(this, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            if (!authToken.isNullOrEmpty()) {
                putExtra(CallOverlayService.EXTRA_AUTH_TOKEN, authToken)
            }
            if (!baseUrl.isNullOrEmpty()) {
                putExtra(CallOverlayService.EXTRA_BASE_URL, baseUrl)
            }
            // Essential flags for background start
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Helps with background restrictions on Android 12+
                addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
            }
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            Log.d(TAG, "[CallScreening] Service start requested")
        } catch (e: Exception) {
            Log.e(TAG, "[CallScreening] Failed to start service: ${e.message}")
        }

        // Allow the call to proceed
        respondToCall(details, CallResponse.Builder().build())
    }
}