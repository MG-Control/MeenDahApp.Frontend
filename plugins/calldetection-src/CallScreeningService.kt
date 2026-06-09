package com.meendah.app.calldetection

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat

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

        // Number might be empty or null - try to get it from TelephonyManager
        val number = if (phoneNumber.isEmpty()) {
            getNumberFromTelephonyManager()
        } else {
            phoneNumber
        }

        if (number.isNotEmpty()) {
            Log.d(TAG, "[CallScreening] Starting overlay for: $number")
            val intent = Intent(this, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_SHOW
                putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, number)
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
        }

        // Always respond with "don't block" so the call proceeds normally
        respondToCall(details, CallResponse.Builder().build())
    }

    private fun getNumberFromTelephonyManager(): String {
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) !=
                PackageManager.PERMISSION_GRANTED) return ""

            val tm = getSystemService(TELEPHONY_SERVICE) as? TelephonyManager ?: return ""
            val number = tm.line1Number ?: ""
            Log.d(TAG, "[CallScreening] TelephonyManager line1Number: $number")
            return number
        } catch (e: Exception) {
            Log.e(TAG, "[CallScreening] getNumberFromTelephonyManager error: ${e.message}")
            return ""
        }
    }
}