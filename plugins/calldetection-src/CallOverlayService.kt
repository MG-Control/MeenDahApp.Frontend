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
        const val ACTION_SHOW_SETUP_NOTIFICATION  = "com.meendah.app.SHOW_SETUP_NOTIFICATION"
        const val ACTION_HIDE_SETUP_NOTIFICATION  = "com.meendah.app.HIDE_SETUP_NOTIFICATION"
        const val EXTRA_PHONE_NUMBER = "phone_number"
        const val EXTRA_AUTH_TOKEN = "auth_token"
        const val EXTRA_BASE_URL = "base_url"
        const val CHANNEL_ID      = "meendah_call_channel"
        const val PERSISTENT_CHANNEL_ID = "meendah_persistent_channel"
        const val NOTIFICATION_ID = 7331
        const val PERSISTENT_NOTIFICATION_ID = 7332
        const val AFTER_CALL_NOTIFICATION_ID = 7333
        const val PREFS_NAME  = "meendah_call_prefs"
        const val PREF_TOKEN  = "auth_token"
        const val PREF_BASE_URL = "base_url"
        const val PREF_THEME = "theme"
        const val PREF_VERSION = "version"
        const val TOKEN_FILE_NAME = "meendah_auth_token"
    }

    // Brand colors
    private val BRAND_COLOR = Color.parseColor("#208AEF")

    // Dark theme
    private val BG_DARK = Color.parseColor("#1C1C2E")
    private val TEXT_MUTED_DARK = Color.parseColor("#8E8E98")
    private val TEXT_WHITE_DARK = Color.WHITE
    private val DIVIDER_COLOR_DARK = Color.parseColor("#2E2E4A")

    // Light theme
    private val BG_LIGHT = Color.parseColor("#FFFFFF")
    private val TEXT_MUTED_LIGHT = Color.parseColor("#60646C")
    private val TEXT_BLACK_LIGHT = Color.BLACK
    private val DIVIDER_COLOR_LIGHT = Color.parseColor("#E0E1E6")

    private var windowManager: WindowManager? = null
    private var overlayView: android.view.View? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    private var hideOverlayJob: Job? = null
    private var currentPhoneNumber: String = ""
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private fun isDarkTheme(): Boolean {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // Default to "light" to match app.json userInterfaceStyle: "automatic"
        val theme = prefs.getString(PREF_THEME, "light") ?: "light"
        Log.d(TAG, "isDarkTheme(): theme from prefs: $theme → returning ${theme == "dark"}, all prefs: ${prefs.all}")
        return theme == "dark"
    }

    private fun getVersionLabel(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // Try SharedPreferences first (set by React Native side via callDetection.setVersion())
        var version = prefs.getString(PREF_VERSION, null)
        if (version != null) {
            Log.d(TAG, "getVersionLabel(): version from prefs: $version")
            return version
        }
        // Fallback: try to read from PackageManager (build.gradle versionName)
        try {
            version = packageManager.getPackageInfo(packageName, 0).versionName
            if (!version.isNullOrEmpty()) {
                Log.d(TAG, "getVersionLabel(): version from PackageManager: $version")
                return version
            }
        } catch (e: Exception) {
            Log.w(TAG, "getVersionLabel(): PackageManager failed: ${e.message}")
        }
        Log.d(TAG, "getVersionLabel(): using fallback version 1.0.0")
        return "1.0.0"
    }

    private val bgColor: Int
        get() = if (isDarkTheme()) BG_DARK else BG_LIGHT

    private val textPrimary: Int
        get() = if (isDarkTheme()) TEXT_WHITE_DARK else TEXT_BLACK_LIGHT

    private val textSecondary: Int
        get() = if (isDarkTheme()) TEXT_MUTED_DARK else TEXT_MUTED_LIGHT

    private val dividerColor: Int
        get() = if (isDarkTheme()) DIVIDER_COLOR_DARK else DIVIDER_COLOR_LIGHT

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        Log.d(TAG, "CallOverlayService onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val number = intent?.getStringExtra(EXTRA_PHONE_NUMBER) ?: ""
        Log.d(TAG, "onStartCommand action=$action number=[$number]")

        // Save token & baseUrl from Intent extras if provided (more reliable than SharedPreferences timing)
        val tokenFromIntent = intent?.getStringExtra(EXTRA_AUTH_TOKEN)
        val baseUrlFromIntent = intent?.getStringExtra(EXTRA_BASE_URL)
        if (!tokenFromIntent.isNullOrEmpty() || !baseUrlFromIntent.isNullOrEmpty()) {
            Log.d(TAG, "onStartCommand: saving token/baseUrl from intent extras")
            val editor = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            if (!tokenFromIntent.isNullOrEmpty()) {
                editor.putString(PREF_TOKEN, tokenFromIntent)
            }
            if (!baseUrlFromIntent.isNullOrEmpty()) {
                editor.putString(PREF_BASE_URL, baseUrlFromIntent)
            }
            editor.apply()
        }

        // Make sure notification channels are created for any action that uses foreground service
        createNotificationChannel()

        when (action) {
            "OPEN_SETTINGS" -> {
                // Open the app's default apps settings
                val openSettingsIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    setPackage(packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                try {
                    startActivity(openSettingsIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to open app", e)
                }
                stopSelf()
            }
            ACTION_SHOW -> {
                // Always ensure foreground status immediately
                currentPhoneNumber = number
                startAsForeground(number)
                val canDraw = canDrawOverlays()
                Log.d(TAG, "Can draw overlays: $canDraw")
                if (overlayView == null) {
                    if (canDraw) {
                        showOverlay(number)
                    } else {
                        Log.e(TAG, "Overlay permission not granted!")
                    }
                } else if (number.isNotEmpty()) {
                    updateOverlayPhoneNumber(number)
                }
            }
            ACTION_HIDE -> {
                if (overlayView != null) {
                    Log.d(TAG, "ACTION_HIDE: scheduling delayed overlay dismissal")
                    showAfterCallNotification(currentPhoneNumber)
                    scheduleHideOverlay(16000L)
                } else {
                    Log.d(TAG, "ACTION_HIDE: no overlay to hide, stopping self")
                    stopSelf()
                }
            }
            ACTION_SHOW_SETUP_NOTIFICATION -> {
                Log.d(TAG, "ACTION_SHOW_SETUP_NOTIFICATION: starting foreground service with setup notification")
                startForeground(PERSISTENT_NOTIFICATION_ID, buildSetupNotification())
            }
            ACTION_HIDE_SETUP_NOTIFICATION -> {
                Log.d(TAG, "ACTION_HIDE_SETUP_NOTIFICATION: stopping foreground service")
                // Make sure we're in foreground first
                startForeground(PERSISTENT_NOTIFICATION_ID, buildSetupNotification())
                try {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } catch (ignored: Exception) {
                }
                stopSelf()
            }
            else -> {
                if (action != null) stopSelf()
            }
        }
        return START_REDELIVER_INTENT
    }

    private fun startAsForeground(number: String) {
        val notification = buildNotification(number, false)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Manifest declares foregroundServiceType="dataSync" — must match here.
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            Log.d(TAG, "Successfully promoted to foreground")
        } catch (e: Exception) {
            Log.e(TAG, "startForeground failed: ${e.message}")
            // Fallback to basic foreground if type-specific fails
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (e2: Exception) {
                Log.e(TAG, "Critical failure: could not start foreground service at all")
            }
        }
    }

    private fun scheduleHideOverlay(delayMs: Long) {
        hideOverlayJob?.cancel()
        hideOverlayJob = scope.launch {
            delay(delayMs)
            if (overlayView != null) {
                dismissOverlay()
            }
            try {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } catch (ignored: Exception) {
            }
            stopSelf()
        }
    }

    private fun canDrawOverlays(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        if (Settings.canDrawOverlays(this)) return true
        // Settings.canDrawOverlays() returns false on some OEM ROMs (Xiaomi, Samsung) even
        // when the user has granted the permission. Fall back to AppOpsManager which is more reliable.
        return try {
            val appOps = getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                android.os.Process.myUid(),
                packageName
            )
            mode == android.app.AppOpsManager.MODE_ALLOWED || mode == android.app.AppOpsManager.MODE_DEFAULT
        } catch (e: Exception) {
            Log.w(TAG, "canDrawOverlays AppOps check failed: ${e.message}")
            false
        }
    }

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
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            width = resources.displayMetrics.widthPixels - dp(24) // full width مع margin
            x = dp(12)
            y = dp(48)
        }
        overlayParams = params

        // Make the entire card draggable
        val card = (view as? LinearLayout)?.getChildAt(0) as? LinearLayout
        if (card != null) {
            setupDragListener(view, card, params)
        } else {
            setupDragListener(view, view, params)
        }

        try {
            windowManager?.addView(view, params)
            Log.d(TAG, "Overlay added OK")
        } catch (e: Exception) {
            Log.e(TAG, "addView FAILED: ${e.message}", e)
            overlayView = null
            overlayParams = null
        }

        if (phoneNumber.isNotEmpty()) {
            updateOverlayPhoneNumber(phoneNumber)
        }
    }

    private fun setupDragListener(containerView: android.view.View, dragView: android.view.View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false

        dragView.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    true // نرجع true عشان نحفظ الـ event stream
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (!isDragging && (Math.abs(dx) > dp(8) || Math.abs(dy) > dp(8))) {
                        isDragging = true
                    }
                    if (isDragging) {
                        params.x = initialX + dx
                        params.y = initialY + dy
                        try { windowManager?.updateViewLayout(containerView, params) } catch (_: Exception) {}
                        true
                    } else {
                        false
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    val wasDragging = isDragging
                    isDragging = false
                    wasDragging
                }
                else -> false
            }
        }
    }

    private fun updateOverlayPhoneNumber(phoneNumber: String) {
        if (overlayView == null || phoneNumber.isEmpty()) return
        currentPhoneNumber = phoneNumber

        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        
        // 1. Update phone label
        card.findViewWithTag<TextView>("phone_label")?.text = formatPhoneNumber(phoneNumber)
        
        // 2. Update details button action
        card.findViewWithTag<android.view.View>("details_button")?.setOnClickListener { openInApp(phoneNumber) }

        // 3. Check contacts immediately
        val contactName = getContactName(phoneNumber)
        card.findViewWithTag<TextView>("contact_info_label")?.apply {
            text = if (contactName != null) "👤 Saved as: $contactName" else "🔍 Not in contacts"
            visibility = android.view.View.VISIBLE
        }

        // 4. Reset database info and show loading
        updateNameLabel("Searching MeenDah...")
        card.findViewWithTag<TextView>("also_known_as_label")?.visibility = android.view.View.GONE
        card.findViewWithTag<LinearLayout>("tags_row")?.visibility = android.view.View.GONE
        
        // 5. Update country
        card.findViewWithTag<TextView>("country_label")?.let {
            val countryText = detectCountry(phoneNumber)
            it.text = countryText
            it.visibility = if (countryText.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        }
        
        showAvatarLoading(true)
        fetchPhoneDetails(phoneNumber)
    }

    private fun getContactName(number: String): String? {
        try {
            if (androidx.core.content.ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_CONTACTS) 
                != android.content.pm.PackageManager.PERMISSION_GRANTED) return null
                
            val uri = android.net.Uri.withAppendedPath(
                android.provider.ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                android.net.Uri.encode(number)
            )
            val projection = arrayOf(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME)
            contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) return cursor.getString(0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking contacts: ${e.message}")
        }
        return null
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
                setColor(bgColor)
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
            setTextColor(textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setPadding(dp(6), dp(2), dp(6), dp(2))
            setOnClickListener { dismissOverlay(); stopSelf() }
        }
        headerRow.addView(brandLabel)
        headerRow.addView(dismissBtn)

        val divider = android.view.View(this).apply {
            setBackgroundColor(dividerColor)
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
            text = if (phoneNumber.isNotEmpty()) formatPhoneNumber(phoneNumber) else ""
            setTextColor(textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            tag = "phone_label"
        }

        val nameLabel = TextView(this).apply {
            text = if (phoneNumber.isEmpty()) {
                "Identifying caller..."
            } else {
                "Searching..."
            }
            setTextColor(textPrimary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            tag = "name_label"
        }

        val contactInfoLabel = TextView(this).apply {
            tag = "contact_info_label"
            setTextColor(textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            visibility = android.view.View.GONE
        }

        val alsoKnownAsLabel = TextView(this).apply {
            tag = "also_known_as_label"
            setTextColor(BRAND_COLOR)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(2) }
        }

        infoColumn.addView(phoneLabel)
        infoColumn.addView(nameLabel)
        infoColumn.addView(contactInfoLabel)
        infoColumn.addView(alsoKnownAsLabel)

        // Country / operator hint
        val countryLabel = TextView(this).apply {
            tag = "country_label"
            text = if (phoneNumber.isNotEmpty()) detectCountry(phoneNumber) else ""
            setTextColor(textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            visibility = if (phoneNumber.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        }
        infoColumn.addView(countryLabel)

        val detailsButton = createActionButton("تفاصيل أكثر", BRAND_COLOR) {
            openInApp(phoneNumber)
        }.apply {
            tag = "details_button"
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        }
        infoColumn.addView(detailsButton)

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

        // ── Debug token label (hidden by default) ──
        val tokenDebugLabel = TextView(this).apply {
            tag = "token_debug_label"
            setTextColor(Color.parseColor("#FF3B30")) // Red color for visibility
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
            visibility = android.view.View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(4) }
            gravity = Gravity.CENTER
        }

        // ── Version Label ──
        val versionLabel = TextView(this).apply {
            val version = getVersionLabel()
            text = "v$version"
            setTextColor(textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(12) }
            gravity = Gravity.CENTER
        }

        // ── Assemble card ──
        card.addView(headerRow)
        card.addView(divider)
        card.addView(avatarContainer)
        card.addView(spamBadge)
        card.addView(tagsRow)
        card.addView(tokenDebugLabel)
        card.addView(versionLabel)

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
            // نبني deep link يروح لشاشة phone/[number] مباشرة
            val isTag = phoneNumber.startsWith("tag:")
            val actualNumber = if (isTag) phoneNumber.removePrefix("tag:") else phoneNumber

            val uri = if (actualNumber == "incoming") {
                // مفيش رقم، نفتح الـ app على الـ home
                android.net.Uri.parse("meendah://")
            } else if (isTag) {
                android.net.Uri.parse("meendah://phone/${java.net.URLEncoder.encode(actualNumber, "UTF-8")}?tab=tags")
            } else {
                // فتح شاشة تفاصيل الرقم مباشرة
                android.net.Uri.parse("meendah://phone/${java.net.URLEncoder.encode(actualNumber, "UTF-8")}")
            }

            val deepLinkIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                setPackage(packageName)
            }

            // لو الـ deep link ما اشتغلش، نفتح الـ app العادي مع الـ extra
            if (packageManager.resolveActivity(deepLinkIntent, 0) != null) {
                startActivity(deepLinkIntent)
            } else {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    launchIntent.putExtra("phone_number", actualNumber)
                    launchIntent.putExtra("open_tab", if (isTag) "tags" else "details")
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    startActivity(launchIntent)
                }
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

    private fun readTokenFromFile(): String? {
        return try {
            val file = java.io.File(filesDir, TOKEN_FILE_NAME)
            if (file.exists()) file.readText().trim().takeIf { it.isNotEmpty() } else null
        } catch (e: Exception) {
            Log.w(TAG, "readTokenFromFile failed: ${e.message}")
            null
        }
    }

    // Read the access token directly from expo-secure-store's encrypted SharedPreferences.
    // This is the most reliable source — it works even on cold start before the JS bridge runs.
    // expo-secure-store (v55) stores data in "SecureStore" SharedPreferences using Android Keystore AES.
    // Key format: "key_v1-{storageKey}", Keystore alias: "AES/GCM/NoPadding:key_v1:keystoreUnauthenticated"
    // Zustand stores the auth state as: {"state":{"accessToken":"...","refreshToken":"..."},"version":0}
    private fun readTokenFromExpoSecureStore(): String? {
        return try {
            val securePrefs = getSharedPreferences("SecureStore", Context.MODE_PRIVATE)
            val encryptedJson = securePrefs.getString("key_v1-auth_auth_storage", null) ?: run {
                Log.d(TAG, "readTokenFromExpoSecureStore: key not found in SecureStore")
                return null
            }
            val encryptedItem = org.json.JSONObject(encryptedJson)
            if (encryptedItem.optString("scheme") != "aes") return null

            val ciphertextBytes = android.util.Base64.decode(encryptedItem.getString("ct"), android.util.Base64.DEFAULT)
            val ivBytes = android.util.Base64.decode(encryptedItem.getString("iv"), android.util.Base64.DEFAULT)
            val tlen = encryptedItem.getInt("tlen")

            val keyStore = java.security.KeyStore.getInstance("AndroidKeyStore")
            keyStore.load(null)
            val keyEntry = keyStore.getEntry("AES/GCM/NoPadding:key_v1:keystoreUnauthenticated", null)
                as? java.security.KeyStore.SecretKeyEntry ?: return null

            val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(javax.crypto.Cipher.DECRYPT_MODE, keyEntry.secretKey, javax.crypto.spec.GCMParameterSpec(tlen, ivBytes))
            val decryptedJson = String(cipher.doFinal(ciphertextBytes), java.nio.charset.StandardCharsets.UTF_8)

            val state = org.json.JSONObject(decryptedJson).optJSONObject("state") ?: return null
            val token = state.optString("accessToken", "")
            Log.d(TAG, "readTokenFromExpoSecureStore: token found (len=${token.length})")
            if (token.isNotEmpty() && token != "null") token else null
        } catch (e: Exception) {
            Log.w(TAG, "readTokenFromExpoSecureStore failed: ${e.message}")
            null
        }
    }

    private fun fetchPhoneDetails(phoneNumber: String) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(PREF_TOKEN, null) ?: readTokenFromFile() ?: readTokenFromExpoSecureStore()
        val baseUrl = prefs.getString(PREF_BASE_URL, "https://meendah.mg-control.com")?.trimEnd('/') ?: "https://meendah.mg-control.com"

        // Debug: log token status and show in overlay
        val tokenPreview = if (token.isNullOrEmpty()) {
            "NO_TOKEN"
        } else {
            // Show first 10 chars + last 4 chars for debugging
            val first = token.take(10)
            val last = token.takeLast(4)
            "${first}...${last} (len=${token.length})"
        }
        Log.d(TAG, "fetchPhoneDetails: token=$tokenPreview, baseUrl=$baseUrl")
        
        if (token.isNullOrEmpty()) {
            showAvatarLoading(false)
            updateNameLabel("Sign in to see caller info")
            // Show debug info in a secondary label
            val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout
            card?.findViewWithTag<TextView>("token_debug_label")?.let {
                it.text = "Token: $tokenPreview | URL: $baseUrl"
                it.visibility = android.view.View.VISIBLE
            }
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
                    showMissingDatabaseInfo(phoneNumber)
                }
            } catch (e: Exception) {
                Log.e(TAG, "fetch error: ${e.message}")
                showAvatarLoading(false)
                // Show error in overlay with debug info
                val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout
                card?.findViewWithTag<TextView>("token_debug_label")?.let {
                    it.text = "Error: ${e.message} | Token: $tokenPreview"
                    it.visibility = android.view.View.VISIBLE
                }
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
                    it.setTextColor(textPrimary)
                }

                card.findViewWithTag<TextView>("also_known_as_label")?.let {
                    it.text = "✨ Identified by MeenDah"
                    it.visibility = android.view.View.VISIBLE
                }

                // Update avatar icon to show first letter
                card.findViewWithTag<TextView>("avatar_icon")?.text =
                    displayName.first().toString().uppercase()
            } else {
                updateNameLabel("Unknown caller")
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

            // Show tags - up to 5
            if (tags != null && tags.length() > 0) {
                val tagsRow = card.findViewWithTag<LinearLayout>("tags_row")
                tagsRow?.removeAllViews()
                tagsRow?.visibility = android.view.View.VISIBLE
                for (i in 0 until minOf(tags.length(), 5)) {
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

    private fun showMissingDatabaseInfo(phoneNumber: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        val contactName = getContactName(phoneNumber)
        val displayText = contactName ?: formatPhoneNumber(phoneNumber)

        card.findViewWithTag<TextView>("name_label")?.apply {
            text = displayText
            setTextColor(textPrimary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        }

        card.findViewWithTag<TextView>("contact_info_label")?.apply {
            text = if (contactName != null) "👤 Saved contact" else "📞 Number not in contacts"
            visibility = android.view.View.VISIBLE
        }

        card.findViewWithTag<TextView>("also_known_as_label")?.apply {
            text = "Not found in MeenDah database"
            visibility = android.view.View.VISIBLE
        }

        card.findViewWithTag<LinearLayout>("tags_row")?.visibility = android.view.View.GONE
        showAvatarLoading(false)
    }

    private fun updateNameLabel(text: String) {
        val card = (overlayView as? LinearLayout)?.getChildAt(0) as? LinearLayout ?: return
        card.findViewWithTag<TextView>("name_label")?.let {
            it.text = text
            it.setTextColor(textSecondary)
            it.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }
    }

    // ─── Lifecycle ──────────────────────────────────────────

    private fun dismissOverlay() {
        hideOverlayJob?.cancel()
        hideOverlayJob = null
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
            overlayView = null
            Log.d(TAG, "Overlay dismissed")
        }
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Caller info channel
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Caller Info", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Shows incoming call information"
                    setSound(null, null)
                    enableVibration(false)
                }
            )

            // Persistent setup channel
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(
                NotificationChannel(PERSISTENT_CHANNEL_ID, "Setup Reminder", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Reminds you to set Meendah as default caller ID app"
                    setSound(null, null)
                    enableVibration(false)
                }
            )
        }
    }

    private fun buildNotification(phoneNumber: String, isAfterCall: Boolean = false): Notification {
        val deepLinkUri = if (phoneNumber.isNotEmpty()) {
            android.net.Uri.parse("meendah://phone/${java.net.URLEncoder.encode(phoneNumber, "UTF-8")}")
        } else {
            android.net.Uri.parse("meendah://")
        }

        val pi = PendingIntent.getActivity(
            this, 0, Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                setPackage(packageName)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (isAfterCall) "Call ended" else "Incoming call"
        val content = when {
            phoneNumber.isEmpty() -> if (isAfterCall) "Tap to open Meendah" else "Looking up caller..."
            isAfterCall -> "Tap to view details for ${formatPhoneNumber(phoneNumber)}"
            else -> "Looking up ${formatPhoneNumber(phoneNumber)}..."
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentIntent(pi)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun showAfterCallNotification(phoneNumber: String) {
        try {
            val deepLinkUri = if (phoneNumber.isNotEmpty()) {
                android.net.Uri.parse("meendah://phone/${java.net.URLEncoder.encode(phoneNumber, "UTF-8")}")
            } else {
                android.net.Uri.parse("meendah://")
            }
            val pi = PendingIntent.getActivity(
                this, 0, Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    setPackage(packageName)
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val contentText = if (phoneNumber.isNotEmpty()) {
                "انتهت المكالمة مع ${formatPhoneNumber(phoneNumber)}. اضغط للعرض"
            } else {
                "اضغط لفتح Meendah"
            }

            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("مكالمة انتهت")
                .setContentText(contentText)
                .setSmallIcon(android.R.drawable.sym_call_incoming)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build()

            val nm = getSystemService(NotificationManager::class.java)
            nm.notify(AFTER_CALL_NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "showAfterCallNotification error: ${e.message}")
        }
    }

    private fun buildSetupNotification(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
            .setContentTitle("Set Meendah as Default Caller ID")
            .setContentText("Tap to set Meendah as your default caller ID & spam app")
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentIntent(pi)
            .setOngoing(true)
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