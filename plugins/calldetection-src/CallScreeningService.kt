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

        // 2. Start Overlay Service
        // Note: CallScreeningService is allowed to start a foreground service during the call.
        val intent = Intent(this, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
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