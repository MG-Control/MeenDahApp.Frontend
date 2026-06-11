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
        Log.d(TAG, "[CallScreening] Call.Details: handle=${details.handle}, " +
                "callerDisplayName=${details.callerDisplayName}, " +
                "hasProperty=${details.hasProperty(Call.Details.PROPERTY_IS_EXTERNAL_CALL)}, " +
                "extras=${details.extras}")

        // نحاول جميع الطرق الممكنة لجلب رقم المتصل
        var phoneNumber = ""

        // 1. الطريقة الأساسية: من details.handle
        details.handle?.schemeSpecificPart?.let {
            if (it.isNotEmpty()) phoneNumber = it
            Log.d(TAG, "[CallScreening] Got number from handle: $it")
        }

        // 2. نحاول من callerDisplayName (لو كان فيه رقم)
        if (phoneNumber.isEmpty() && details.callerDisplayName != null) {
            val displayName = details.callerDisplayName.toString()
            // نستخرج الأرقام فقط من الـ display name
            val digitsOnly = displayName.replace(Regex("[^\\d+]"), "")
            if (digitsOnly.length >= 7) {
                phoneNumber = digitsOnly
                Log.d(TAG, "[CallScreening] Got number from callerDisplayName: $phoneNumber")
            }
        }

        // 3. نحاول من الـ extras لو فيه حاجة
        if (phoneNumber.isEmpty() && details.extras != null) {
            val extras = details.extras!!
            for (key in extras.keySet()) {
                Log.d(TAG, "[CallScreening] Extra key: $key, value: ${extras.get(key)}")
                if (key.contains("phone", ignoreCase = true) ||
                    key.contains("number", ignoreCase = true) ||
                    key.contains("caller", ignoreCase = true)) {
                    val value = extras.get(key)?.toString()
                    if (!value.isNullOrEmpty()) {
                        val digits = value.replace(Regex("[^\\d+]"), "")
                        if (digits.length >= 7) {
                            phoneNumber = digits
                            Log.d(TAG, "[CallScreening] Got number from extra $key: $phoneNumber")
                            break
                        }
                    }
                }
            }
        }

        Log.d(TAG, "[CallScreening] Final phone number to use: ${phoneNumber.ifEmpty { "EMPTY" }}")

        // دائماً نبدأ الـ overlay سواء كان فيه رقم أو لا
        Log.d(TAG, "[CallScreening] Starting overlay for: ${phoneNumber.ifEmpty { "unknown" }}")
        val intent = Intent(this, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "[CallScreening] Calling startForegroundService")
                startForegroundService(intent)
            } else {
                Log.d(TAG, "[CallScreening] Calling startService")
                startService(intent)
            }
            Log.d(TAG, "[CallScreening] startService succeeded")
        } catch (e: Exception) {
            Log.e(TAG, "[CallScreening] startService failed: ${e.message}", e)
            e.printStackTrace()
        }

        // Always respond with "don't block" so the call proceeds normally
        respondToCall(details, CallResponse.Builder().build())
    }
}