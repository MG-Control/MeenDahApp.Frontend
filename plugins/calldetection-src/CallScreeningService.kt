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
        val phoneNumber = details.handle?.schemeSpecificPart ?: ""
        Log.d(TAG, "[CallScreening] Incoming call from: $phoneNumber")

        if (phoneNumber.isNotEmpty()) {
            Log.d(TAG, "[CallScreening] Starting overlay for: $phoneNumber")
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
        } else {
            // الرقم مش موجود في الـ details (مثلاً private number)، نشغّل الـ overlay بدون رقم
            Log.d(TAG, "[CallScreening] No number in details, showing overlay without number")
            val intent = Intent(this, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_SHOW
                putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, "")
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent)
                } else {
                    startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "[CallScreening] startService (no number) failed: ${e.message}")
            }
        }

        // Always respond with "don't block" so the call proceeds normally
        respondToCall(details, CallResponse.Builder().build())
    }

    @Suppress("UNUSED")
    private fun getNumberFromTelephonyManager(): String {
        // ملاحظة: line1Number هو رقمك إنت مش رقم المتصل — لا تستخدم هذه الدالة لجلب رقم المتصل
        // رقم المتصل متاح فقط من details.handle في onScreenCall أو من EXTRA_INCOMING_NUMBER في BroadcastReceiver
        return ""
    }
}