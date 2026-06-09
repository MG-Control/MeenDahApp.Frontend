package com.meendah.app.calldetection

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.util.Log
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.TypedValue
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class CallOverlayService : Service() {

    companion object {
        private const val TAG = "MeenDah"
        const val ACTION_SHOW = "com.meendah.app.SHOW_OVERLAY"
        const val ACTION_HIDE  = "com.meendah.app.HIDE_OVERLAY"
        const val EXTRA_PHONE_NUMBER = "phone_number"
        const val CHANNEL_ID      = "meendah_call_channel"
        const val NOTIFICATION_ID = 7331
        const val PREFS_NAME  = "meendah_call_prefs"
        const val PREF_TOKEN  = "auth_token"
        const val PREF_BASE_URL = "base_url"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: android.view.View? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        Log.d(TAG, "CallOverlayService onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand action=${intent?.action}")
        when (intent?.action) {
            ACTION_SHOW -> {
                val number = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: ""
                Log.d(TAG, "ACTION_SHOW number=$number")
                startAsForeground(number)
                if (canDrawOverlays()) showOverlay(number)
                else Log.w(TAG, "No SYSTEM_ALERT_WINDOW permission")
            }
            ACTION_HIDE -> {
                Log.d(TAG, "ACTION_HIDE")
                dismissOverlay()
                stopSelf()
            }
            else -> stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun startAsForeground(number: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, buildNotification(number), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, buildNotification(number))
            }
            Log.d(TAG, "startForeground OK")
        } catch (e: Exception) {
            Log.e(TAG, "startForeground FAILED: ${e.message}", e)
            try { startForeground(NOTIFICATION_ID, buildNotification(number)) } catch (_: Exception) { stopSelf() }
        }
    }

    private fun canDrawOverlays(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)

    private fun showOverlay(phoneNumber: String) {
        if (overlayView != null) { Log.d(TAG, "overlay already showing"); return }
        val view = buildOverlayView(phoneNumber)
        overlayView = view
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP; y = dp(48) }
        try {
            windowManager?.addView(view, params)
            Log.d(TAG, "Overlay added OK")
        } catch (e: Exception) {
            Log.e(TAG, "addView FAILED: ${e.message}", e)
            overlayView = null
        }
        if (phoneNumber.isNotEmpty()) fetchPhoneDetails(phoneNumber)
    }

    private fun buildOverlayView(phoneNumber: String): LinearLayout {
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), dp(6), dp(12), dp(6)) }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(14), dp(16), dp(14))
            elevation = 10f * resources.displayMetrics.density
            background = GradientDrawable().apply { setColor(Color.parseColor("#1C1C2E")); cornerRadius = dp(16).toFloat() }
        }
        val headerRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val brandLabel = TextView(this).apply {
            text = "Meendah"; setTextColor(Color.parseColor("#208AEF"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f); typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        val dismissBtn = TextView(this).apply {
            text = "  X  "; setTextColor(Color.parseColor("#AAAACC"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setOnClickListener { dismissOverlay(); stopSelf() }
        }
        headerRow.addView(brandLabel); headerRow.addView(dismissBtn)
        val divider = android.view.View(this).apply {
            setBackgroundColor(Color.parseColor("#2E2E4A"))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)).apply { topMargin = dp(8); bottomMargin = dp(10) }
        }
        val phoneLabel = TextView(this).apply {
            text = if (phoneNumber.isEmpty()) "Unknown number" else phoneNumber
            setTextColor(Color.WHITE); setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val nameLabel = TextView(this).apply {
            text = if (phoneNumber.isEmpty()) "No number available" else "Searching..."
            setTextColor(Color.parseColor("#AAAACC")); setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f); tag = "name_label"
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) }
        }
        val spamBadge = TextView(this).apply {
            tag = "spam_badge"; setTextColor(Color.WHITE); setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(dp(10), dp(3), dp(10), dp(3)); visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) }
        }
        val tagsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; tag = "tags_row"; visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) }
        }
        card.addView(headerRow); card.addView(divider); card.addView(phoneLabel); card.addView(nameLabel); card.addView(spamBadge); card.addView(tagsRow)
        container.addView(card)
        return container
    }

    private fun fetchPhoneDetails(phoneNumber: String) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(PREF_TOKEN, null)
        val baseUrl = prefs.getString(PREF_BASE_URL, "https://meendah.mg-control.com")?.trimEnd('/') ?: "https://meendah.mg-control.com"
        if (token.isNullOrEmpty()) { updateNameLabel("Sign in to see caller info"); return }
        scope.launch {
            try {
                val encoded = java.net.URLEncoder.encode(phoneNumber, "UTF-8")
                val body = withContext(Dispatchers.IO) {
                    val conn = URL("$baseUrl/phones/$encoded").openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.connectTimeout = 8000; conn.readTimeout = 8000
                    try { if (conn.responseCode == 200) conn.inputStream.bufferedReader().readText() else null }
                    finally { conn.disconnect() }
                }
                if (body != null) applyPhoneDetails(body) else updateNameLabel("Not found in database")
            } catch (e: Exception) { Log.e(TAG, "fetch error: ${e.message}"); updateNameLabel("Could not fetch caller info") }
        }
    }

    private fun applyPhoneDetails(json: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        try {
            val obj = JSONObject(json)
            val displayName = obj.optString("displayName", "")
            val spamScore = obj.optDouble("spamScore", 0.0)
            val totalSearches = obj.optInt("totalSearches", 0)
            val tags = obj.optJSONArray("tags")
            card.findViewWithTag<TextView>("name_label")?.text =
                if (displayName.isNotEmpty()) displayName else "Unknown - $totalSearches searches"
            if (spamScore > 0.3) {
                val pct = (spamScore * 100).toInt()
                val color = when { spamScore > 0.7 -> Color.parseColor("#FF3B30"); spamScore > 0.5 -> Color.parseColor("#FF9500"); else -> Color.parseColor("#FFCC00") }
                card.findViewWithTag<TextView>("spam_badge")?.apply {
                    text = "Spam risk $pct%"
                    setTextColor(if (spamScore > 0.5) Color.WHITE else Color.parseColor("#1C1C2E"))
                    background = GradientDrawable().apply { setColor(color); cornerRadius = dp(10).toFloat() }
                    visibility = android.view.View.VISIBLE
                }
            }
            if (tags != null && tags.length() > 0) {
                val tagsRow = card.findViewWithTag<LinearLayout>("tags_row")
                tagsRow?.visibility = android.view.View.VISIBLE
                for (i in 0 until minOf(tags.length(), 4)) {
                    val t = tags.getJSONObject(i).optString("text", "")
                    if (t.isEmpty()) continue
                    tagsRow?.addView(TextView(this).apply {
                        text = t; setTextColor(Color.parseColor("#208AEF")); setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                        setPadding(dp(8), dp(3), dp(8), dp(3))
                        background = GradientDrawable().apply { setColor(Color.TRANSPARENT); setStroke(dp(1), Color.parseColor("#208AEF")); cornerRadius = dp(10).toFloat() }
                        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { marginEnd = dp(6) }
                    })
                }
            }
        } catch (e: Exception) { Log.e(TAG, "applyPhoneDetails error: ${e.message}"); updateNameLabel("Error parsing response") }
    }

    private fun updateNameLabel(text: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        card.findViewWithTag<TextView>("name_label")?.text = text
    }

    private fun dismissOverlay() {
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
            overlayView = null
            Log.d(TAG, "Overlay dismissed")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Caller Info", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Shows incoming call information"
                    setSound(null, null); enableVibration(false)
                }
            )
        }
    }

    private fun buildNotification(phoneNumber: String): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Incoming call")
            .setContentText(if (phoneNumber.isEmpty()) "Looking up caller..." else "Looking up $phoneNumber...")
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentIntent(pi).setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW).build()
    }

    override fun onDestroy() {
        super.onDestroy()
        dismissOverlay()
        scope.cancel()
        Log.d(TAG, "CallOverlayService onDestroy")
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()
}
