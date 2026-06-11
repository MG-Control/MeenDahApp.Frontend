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
        private var lastHandledCallId: String? = null
    }

    override fun onScreenCall(details: Call.Details) {
        val callId = details.callId.toString()
        
        // تجنب التعامل مع نفس المكالمة مرتين
        if (callId == lastHandledCallId) {
            Log.d(TAG, "[CallScreening] Already handled call: $callId")
            respondToCall(details, CallResponse.Builder().build())
            return
        }
        lastHandledCallId = callId

        val phoneNumber = details.handle?.schemeSpecificPart ?: ""
        Log.d(TAG, "[CallScreening] Incoming call from: $phoneNumber")

        // دائماً نبدأ الـ overlay سواء كان فيه رقم أو لا
        Log.d(TAG, "[CallScreening] Starting overlay for: ${phoneNumber.ifEmpty { "unknown" }}")
        val intent = Intent(this, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "[CallScreening] startService failed: ${e.message}")
        }

        // Always respond with "don't block" so the call proceeds normally
        respondToCall(details, CallResponse.Builder().build())
    }
}