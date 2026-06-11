package com.meendah.app.calldetection

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat

class CallReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "MeenDah"
        private var lastState: String? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive action=$action")

        if (action != TelephonyManager.ACTION_PHONE_STATE_CHANGED &&
            action != "android.intent.action.PHONE_STATE") return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        Log.d(TAG, "PHONE_STATE=$state lastState=$lastState")

        if (state == null || state == lastState) return
        lastState = state

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                @Suppress("DEPRECATION")
                val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                Log.d(TAG, "RINGING number=${number ?: "null"}")
                showDebugNotification(context, "Incoming: ${number ?: "unknown"}")
                startOverlayService(context, number ?: "")
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                Log.d(TAG, "OFFHOOK")
                hideOverlayService(context)
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                Log.d(TAG, "IDLE")
                hideOverlayService(context)
                lastState = null
            }
        }
    }

    private fun startOverlayService(context: Context, number: String) {
        val serviceIntent = Intent(context, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, number)
        }
        try {
            // على Android 12+ لازم نستخدم startForegroundService بس ده بيفشل
            // لو الـ app مش في الـ foreground — الحل هو إننا نستخدم
            // FOREGROUND_SERVICE_TYPE_PHONE_CALL اللي مسموح بيها حتى من الـ background
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d(TAG, "startService OK number=$number")
        } catch (e: Exception) {
            Log.e(TAG, "startService FAILED: ${e.message}", e)
            // Fallback: نعمل notification مباشرة بدل الـ overlay
            showDebugNotification(context, "Incoming call: ${number.ifEmpty { "Unknown" }}")
        }
    }

    private fun hideOverlayService(context: Context) {
        try {
            context.startService(Intent(context, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_HIDE
            })
        } catch (_: Exception) {}
    }

    private fun showDebugNotification(context: Context, message: String) {
        val channelId = "meendah_debug"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "Meendah Debug", NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val notif = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle("Meendah")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        nm.notify(System.currentTimeMillis().toInt(), notif)
    }
}
