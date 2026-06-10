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

    // Brand colors
    private val BRAND_COLOR = Color.parseColor("#208AEF")
    private val BG_DARK = Color.parseColor("#1C1C2E")
    private val TEXT_MUTED = Color.parseColor("#8E8E98")
    private val TEXT_WHITE = Color.WHITE
    private val DIVIDER_COLOR = Color.parseColor("#2E2E4A")

    private var windowManager: WindowManager? = null
    private var overlayView: android.view.View? = null
    private var overlayParams: WindowManager.LayoutParams? = null
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
                Log.d(TAG, "ACTION_SHOW number=[$number]")
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
        if (overlayView != null) {
            // Overlay already showing — if we now have a real number, update it
            if (phoneNumber.isNotEmpty()) {
                Log.d(TAG, "overlay already showing, updating with number=$phoneNumber")
                updateOverlayPhoneNumber(phoneNumber)
            } else {
                Log.d(TAG, "overlay already showing, no number to update")
            }
            return
        }
        val view = buildOverlayView(phoneNumber)
        overlayView = view

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = dp(48)
        }
        overlayParams = params

        setupDragListener(view, params)

        try {
            windowManager?.addView(view, params)
            Log.d(TAG, "Overlay added OK")
        } catch (e: Exception) {
            Log.e(TAG, "addView FAILED: ${e.message}", e)
            overlayView = null
            overlayParams = null
        }

        if (phoneNumber.isNotEmpty()) {
            showAvatarLoading(true)
            fetchPhoneDetails(phoneNumber)
        }
    }

    private fun updateOverlayPhoneNumber(phoneNumber: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        // Update phone label (first child of infoColumn which is inside avatarContainer)
        val avatarContainer = card.getChildAt(2) as? LinearLayout ?: return
        val infoColumn = avatarContainer.getChildAt(1) as? LinearLayout ?: return
        (infoColumn.getChildAt(0) as? TextView)?.text = formatPhoneNumber(phoneNumber)
        (infoColumn.getChildAt(1) as? TextView)?.text = "Searching..."
        val countryText = detectCountry(phoneNumber)
        (infoColumn.getChildAt(2) as? TextView)?.apply {
            text = countryText
            visibility = if (countryText.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        }
        showAvatarLoading(true)
        fetchPhoneDetails(phoneNumber)
    }

    private fun setupDragListener(view: android.view.View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (!isDragging && (Math.abs(dx) > dp(5) || Math.abs(dy) > dp(5))) {
                        isDragging = true
                    }
                    if (isDragging) {
                        params.x = initialX + dx
                        params.y = initialY + dy
                        try { windowManager?.updateViewLayout(view, params) } catch (_: Exception) {}
                    }
                    isDragging
                }
                MotionEvent.ACTION_UP -> {
                    isDragging
                }
                else -> false
            }
        }
    }

    private fun buildOverlayView(phoneNumber: String): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(6), dp(12), dp(6))
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(18))
            elevation = 12f * resources.displayMetrics.density
            background = GradientDrawable().apply {
                setColor(BG_DARK)
                cornerRadius = dp(20).toFloat()
            }
        }

        // ── Header row: brand + dismiss ──
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val brandLabel = TextView(this).apply {
            text = "Meendah"
            setTextColor(BRAND_COLOR)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val dismissBtn = TextView(this).apply {
            text = "✕"
            setTextColor(TEXT_MUTED)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setPadding(dp(6), dp(2), dp(6), dp(2))
            setOnClickListener { dismissOverlay(); stopSelf() }
        }
        headerRow.addView(brandLabel)
        headerRow.addView(dismissBtn)

        val divider = android.view.View(this).apply {
            setBackgroundColor(DIVIDER_COLOR)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).apply { topMargin = dp(10); bottomMargin = dp(12) }
        }

        // ── Phone avatar / icon ──
        val avatarContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        // Circular avatar with phone icon
        val avatarCircle = createAvatarCircle()
        avatarContainer.addView(avatarCircle)

        // Phone number and name column
        val infoColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            ).apply { marginStart = dp(14) }
        }

        val phoneLabel = TextView(this).apply {
            text = if (phoneNumber.isEmpty()) {
                "Incoming call"
            } else {
                formatPhoneNumber(phoneNumber)
            }
            setTextColor(TEXT_WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }

        val nameLabel = TextView(this).apply {
            text = if (phoneNumber.isEmpty()) {
                "No caller ID available"
            } else {
                "Searching..."
            }
            setTextColor(TEXT_MUTED)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            tag = "name_label"
        }
        infoColumn.addView(phoneLabel)
        infoColumn.addView(nameLabel)

        // Country / operator hint
        val countryLabel = TextView(this).apply {
            tag = "country_label"
            text = if (phoneNumber.isNotEmpty()) detectCountry(phoneNumber) else ""
            setTextColor(TEXT_MUTED)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            visibility = if (phoneNumber.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        }
        infoColumn.addView(countryLabel)

        avatarContainer.addView(infoColumn)

        // ── Spam badge ──
        val spamBadge = TextView(this).apply {
            tag = "spam_badge"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(dp(12), dp(4), dp(12), dp(4))
            visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(4) }
        }

        // ── Tags row ──
        val tagsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            tag = "tags_row"
            visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        }

        // ── Bottom action buttons like Truecaller ──
        val bottomRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(14) }
        }

        // "View details" button
        val viewDetailsBtn = createActionButton("View details", BRAND_COLOR) {
            openInApp(if (phoneNumber.isNotEmpty()) phoneNumber else "incoming")
        }
        bottomRow.addView(viewDetailsBtn)

        // "Add tag" button
        val addTagBtn = createActionButton("Add tag", Color.parseColor("#8E8E98")) {
            openInApp(if (phoneNumber.isNotEmpty()) "tag:$phoneNumber" else "tag:incoming")
        }
        bottomRow.addView(addTagBtn)

        // ── Assemble card ──
        card.addView(headerRow)
        card.addView(divider)
        card.addView(avatarContainer)
        card.addView(spamBadge)
        card.addView(tagsRow)
        card.addView(bottomRow)

        container.addView(card)
        return container
    }

    private fun createAvatarCircle(): android.view.View {
        val size = dp(56)
        val circle = ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
            setImageDrawable(null)
            background = GradientDrawable().apply {
                setShape(GradientDrawable.OVAL)
                setColor(Color.parseColor("#2A2A4A"))
                setStroke(dp(2), Color.parseColor("#3A3A5A"))
            }
        }

        val iconText = TextView(this).apply {
            text = "📞"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(size, size)
            tag = "avatar_icon"
        }

        val loadingSpinner = ProgressBar(this).apply {
            layoutParams = FrameLayout.LayoutParams(dp(32), dp(32)).apply {
                gravity = Gravity.CENTER
            }
            isIndeterminate = true
            tag = "avatar_loading"
            visibility = android.view.View.GONE
        }

        val wrapper = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
            addView(circle)
            addView(iconText)
            addView(loadingSpinner)
        }
        return wrapper
    }

    private fun createActionButton(text: String, color: Int, onClick: () -> Unit): android.view.View {
        return TextView(this).apply {
            this.text = text
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(dp(14), dp(8), dp(14), dp(8))
            setOnClickListener { onClick() }
            background = GradientDrawable().apply {
                setColor(Color.TRANSPARENT)
                setStroke(dp(1), color)
                cornerRadius = dp(8).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginEnd = dp(8) }
        }
    }

    private fun formatPhoneNumber(number: String): String {
        // Try to format Egyptian numbers: +20XXXXXXXXX → +20 XXXX XXXX
        val digits = number.replace(Regex("[^\\d+]"), "")
        if (digits.startsWith("+20") && digits.length == 13) {
            return "+20 ${digits.substring(3, 6)} ${digits.substring(6, 10)} ${digits.substring(10)}"
        }
        if (digits.startsWith("+") && digits.length >= 10) {
            // International format with spaces
            val cc = digits.substring(0, digits.length - 9)
            val rest = digits.substring(digits.length - 9)
            return "$cc ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}"
        }
        return number
    }

    private fun detectCountry(number: String): String {
        return when {
            number.startsWith("+20") || number.startsWith("20") || number.startsWith("01") -> "🇪🇬 Egypt"
            number.startsWith("+966") || number.startsWith("966") -> "🇸🇦 Saudi Arabia"
            number.startsWith("+971") || number.startsWith("971") -> "🇦🇪 UAE"
            number.startsWith("+965") || number.startsWith("965") -> "🇰🇼 Kuwait"
            number.startsWith("+974") || number.startsWith("974") -> "🇶🇦 Qatar"
            number.startsWith("+973") || number.startsWith("973") -> "🇧🇭 Bahrain"
            number.startsWith("+968") || number.startsWith("968") -> "🇴🇲 Oman"
            number.startsWith("+1") -> "🇺🇸 USA / Canada"
            number.startsWith("+44") -> "🇬🇧 UK"
            number.startsWith("+49") -> "🇩🇪 Germany"
            number.startsWith("+33") -> "🇫🇷 France"
            number.startsWith("+212") || number.startsWith("212") -> "🇲🇦 Morocco"
            number.startsWith("+213") || number.startsWith("213") -> "🇩🇿 Algeria"
            number.startsWith("+216") || number.startsWith("216") -> "🇹🇳 Tunisia"
            number.startsWith("+218") || number.startsWith("218") -> "🇱🇾 Libya"
            number.startsWith("+249") || number.startsWith("249") -> "🇸🇩 Sudan"
            number.startsWith("+962") || number.startsWith("962") -> "🇯🇴 Jordan"
            number.startsWith("+961") || number.startsWith("961") -> "🇱🇧 Lebanon"
            else -> ""
        }
    }

    private fun openInApp(phoneNumber: String) {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.putExtra("phone_number", phoneNumber)
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                startActivity(launchIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "openInApp error: ${e.message}")
        }
    }

    // ─── Network fetch ────────────────────────────────────────────

    private fun showAvatarLoading(loading: Boolean) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        card.findViewWithTag<android.view.View>("avatar_icon")?.visibility =
            if (loading) android.view.View.INVISIBLE else android.view.View.VISIBLE
        card.findViewWithTag<android.view.View>("avatar_loading")?.visibility =
            if (loading) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun fetchPhoneDetails(phoneNumber: String) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(PREF_TOKEN, null)
        val baseUrl = prefs.getString(PREF_BASE_URL, "https://meendah.mg-control.com")?.trimEnd('/') ?: "https://meendah.mg-control.com"

        if (token.isNullOrEmpty()) {
            showAvatarLoading(false)
            updateNameLabel("Sign in to see caller info")
            return
        }

        scope.launch {
            try {
                val encoded = java.net.URLEncoder.encode(phoneNumber, "UTF-8")
                val body = withContext(Dispatchers.IO) {
                    val conn = URL("$baseUrl/phones/$encoded").openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    try {
                        if (conn.responseCode == 200) conn.inputStream.bufferedReader().readText()
                        else {
                            Log.w(TAG, "fetch response code: ${conn.responseCode}")
                            null
                        }
                    } finally { conn.disconnect() }
                }
                showAvatarLoading(false)
                if (body != null) {
                    applyPhoneDetails(body)
                } else {
                    updateNameLabel("Not found in database")
                }
            } catch (e: Exception) {
                Log.e(TAG, "fetch error: ${e.message}")
                showAvatarLoading(false)
                updateNameLabel("Could not fetch caller info")
            }
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

            // Update name label
            if (displayName.isNotEmpty()) {
                card.findViewWithTag<TextView>("name_label")?.let {
                    it.text = displayName
                    it.setTextColor(TEXT_WHITE)
                    it.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                    it.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                }

                // Update avatar icon to show first letter
                card.findViewWithTag<TextView>("avatar_icon")?.text =
                    displayName.first().toString().uppercase()
            } else {
                updateNameLabel("Unknown - $totalSearches searches")
            }

            // Show spam badge
            if (spamScore > 0.3) {
                val pct = (spamScore * 100).toInt()
                val color = when {
                    spamScore > 0.7 -> Color.parseColor("#FF3B30")
                    spamScore > 0.5 -> Color.parseColor("#FF9500")
                    else -> Color.parseColor("#FFCC00")
                }
                val textColor = if (spamScore > 0.5) Color.WHITE else Color.parseColor("#1C1C2E")

                card.findViewWithTag<TextView>("spam_badge")?.apply {
                    text = "⚠️ Spam risk $pct%"
                    setTextColor(textColor)
                    background = GradientDrawable().apply {
                        setColor(color)
                        cornerRadius = dp(10).toFloat()
                    }
                    visibility = android.view.View.VISIBLE
                }
            }

            // Show tags
            if (tags != null && tags.length() > 0) {
                val tagsRow = card.findViewWithTag<LinearLayout>("tags_row")
                tagsRow?.removeAllViews()
                tagsRow?.visibility = android.view.View.VISIBLE
                for (i in 0 until minOf(tags.length(), 4)) {
                    val t = tags.getJSONObject(i).optString("text", "")
                    if (t.isEmpty()) continue
                    tagsRow?.addView(TextView(this).apply {
                        text = t
                        setTextColor(BRAND_COLOR)
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                        setPadding(dp(8), dp(3), dp(8), dp(3))
                        background = GradientDrawable().apply {
                            setColor(Color.TRANSPARENT)
                            setStroke(dp(1), BRAND_COLOR)
                            cornerRadius = dp(10).toFloat()
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply { marginEnd = dp(6) }
                    })
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "applyPhoneDetails error: ${e.message}")
            updateNameLabel("Error parsing response")
        }
    }

    private fun updateNameLabel(text: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        card.findViewWithTag<TextView>("name_label")?.let {
            it.text = text
            it.setTextColor(TEXT_MUTED)
            it.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }
    }

    // ─── Lifecycle ──────────────────────────────────────────

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
                    setSound(null, null)
                    enableVibration(false)
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
            .setContentIntent(pi)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
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