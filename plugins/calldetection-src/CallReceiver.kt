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
        private const val DEBUG_CHANNEL_ID = "meendah_debug"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "CallReceiver onReceive action=$action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.d(TAG, "Boot completed - CallReceiver ready!")
            return
        }

        if (action != TelephonyManager.ACTION_PHONE_STATE_CHANGED &&
            action != "android.intent.action.PHONE_STATE") return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        Log.d(TAG, "PHONE_STATE=$state")

        if (state == null || state == lastState) return
        lastState = state

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                // Try multiple ways to get the number in BroadcastReceiver
                var number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: ""
                
                // On modern Android, EXTRA_INCOMING_NUMBER is often null.
                // CallScreeningService is the reliable way, but we try our best here.
                if (number.isEmpty()) {
                    number = intent.getStringExtra("incoming_number") ?: ""
                }

                Log.d(TAG, "RINGING number=[$number]")
                startOverlayService(context, number)
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                Log.d(TAG, "OFFHOOK")
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                Log.d(TAG, "IDLE")
                hideOverlayService(context)
                lastState = null
            }
        }
    }

    private fun startOverlayService(context: Context, number: String) {
        Log.d(TAG, "startOverlayService number=[$number]")
        val serviceIntent = Intent(context, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_SHOW
            putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, number)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "startForegroundService called")
                context.startForegroundService(serviceIntent)
            } else {
                Log.d(TAG, "startService called")
                context.startService(serviceIntent)
            }
            Log.d(TAG, "startService OK!")
        } catch (e: Exception) {
            Log.e(TAG, "startService FAILED: ${e.message}", e)
            showDebugNotification(context, "Error: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun hideOverlayService(context: Context) {
        try {
            val serviceIntent = Intent(context, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_HIDE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "hideOverlayService failed: ${e.message}")
        }
    }

    private fun showDebugNotification(context: Context, message: String) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    DEBUG_CHANNEL_ID,
                    "Meendah Debug",
                    NotificationManager.IMPORTANCE_HIGH
                )
                nm.createNotificationChannel(channel)
            }

            val notif = NotificationCompat.Builder(context, DEBUG_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_call_incoming)
                .setContentTitle("Meendah Call")
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            nm.notify(System.currentTimeMillis().toInt(), notif)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show debug notification", e)
        }
    }
}
