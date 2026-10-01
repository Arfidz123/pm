package com.cmmsapp

import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.media.ExifInterface
import com.facebook.react.bridge.ReadableMap

class PdfDownloaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PdfDownloader"
    }

    private fun resolveUrl(inputPath: String): String {
        if (inputPath.startsWith("telegram://")) {
            val fileId = inputPath.removePrefix("telegram://").trim()
            val botToken = "8697587330:AAEzhquov9zrxFQvmIvPhxEchwMpsptp2ZE"
            try {
                val apiUrl = "https://api.telegram.org/bot$botToken/getFile?file_id=$fileId"
                val connection = URL(apiUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(responseText)
                if (json.optBoolean("ok")) {
                    val filePath = json.optJSONObject("result")?.optString("file_path")
                    if (!filePath.isNullOrEmpty()) {
                        return "https://api.telegram.org/file/bot$botToken/$filePath"
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return inputPath
    }

    private fun downloadRemoteFileToCache(urlStr: String, fileName: String): File? {
        return try {
            val url = URL(urlStr)
            val tempFile = File(reactContext.cacheDir, fileName)
            url.openStream().use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            if (tempFile.exists() && tempFile.length() > 0) tempFile else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    @ReactMethod
    fun saveToDownloads(filePath: String, fileName: String, promise: Promise) {
        Thread {
            try {
                val pdfFileName = if (fileName.endsWith(".pdf")) fileName else "$fileName.pdf"
                val resolvedPath = resolveUrl(filePath)

                var sourceFile: File? = null

                if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) {
                    val downloaded = downloadRemoteFileToCache(
                        resolvedPath,
                        "download_${System.currentTimeMillis()}_$pdfFileName"
                    )
                    if (downloaded != null) {
                        sourceFile = downloaded
                    } else {
                        // Fallback to DownloadManager
                        try {
                            val downloadManager =
                                reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                            val request = DownloadManager.Request(Uri.parse(resolvedPath)).apply {
                                setTitle(pdfFileName)
                                setDescription("Mengunduh Laporan PM")
                                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, pdfFileName)
                                setMimeType("application/pdf")
                            }
                            downloadManager.enqueue(request)
                            promise.resolve(resolvedPath)
                            return@Thread
                        } catch (dmErr: Exception) {
                            promise.reject(
                                "DOWNLOAD_ERROR",
                                "Gagal mengunduh remote file: ${dmErr.message}",
                                dmErr
                            )
                            return@Thread
                        }
                    }
                } else {
                    val cleanPath = resolvedPath.replace("file://", "")
                    val localFile = File(cleanPath)
                    if (!localFile.exists()) {
                        promise.reject("FILE_NOT_FOUND", "Source file does not exist: $cleanPath")
                        return@Thread
                    }
                    sourceFile = localFile
                }

                var finalUri: Uri? = null

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, pdfFileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }

                    val resolver = reactContext.contentResolver
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

                    if (uri != null) {
                        resolver.openOutputStream(uri)?.use { outputStream ->
                            FileInputStream(sourceFile).use { inputStream ->
                                inputStream.copyTo(outputStream)
                            }
                        }
                        finalUri = uri
                    }
                } else {
                    val downloadsDir =
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs()
                    }
                    val destFile = File(downloadsDir, pdfFileName)
                    FileInputStream(sourceFile).use { inputStream ->
                        FileOutputStream(destFile).use { outputStream ->
                            inputStream.copyTo(outputStream)
                        }
                    }
                    finalUri = Uri.fromFile(destFile)

                    try {
                        val scanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                        scanIntent.data = finalUri
                        reactContext.sendBroadcast(scanIntent)
                    } catch (e: Exception) {
                        // Ignore media scan fallback error
                    }
                }

                // Automatically open intent to view/open PDF
                try {
                    openPdfIntent(sourceFile, finalUri)
                } catch (openErr: Exception) {
                    openErr.printStackTrace()
                }

                promise.resolve(finalUri?.toString() ?: sourceFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("SAVE_ERROR", e.message ?: "Gagal menyimpan file", e)
            }
        }.start()
    }

    @ReactMethod
    fun sharePdf(filePath: String, title: String, message: String, promise: Promise) {
        Thread {
            try {
                val resolvedPath = resolveUrl(filePath)
                var sourceFile: File? = null

                if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) {
                    val tempName = "share_${System.currentTimeMillis()}.pdf"
                    sourceFile = downloadRemoteFileToCache(resolvedPath, tempName)
                    if (sourceFile == null || !sourceFile.exists()) {
                        promise.reject("DOWNLOAD_ERROR", "Gagal mengunduh file untuk dibagikan")
                        return@Thread
                    }
                } else {
                    val cleanPath = resolvedPath.replace("file://", "")
                    val localFile = File(cleanPath)
                    if (!localFile.exists()) {
                        promise.reject("FILE_NOT_FOUND", "Source file does not exist: $cleanPath")
                        return@Thread
                    }
                    sourceFile = localFile
                }

                val fileUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    FileProvider.getUriForFile(
                        reactContext,
                        "${reactContext.packageName}.provider",
                        sourceFile
                    )
                } else {
                    Uri.fromFile(sourceFile)
                }

                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, fileUri)
                    if (message.isNotEmpty()) {
                        putExtra(Intent.EXTRA_TEXT, message)
                    }
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                val chooserTitle = if (title.isNotEmpty()) title else "Bagikan Laporan PDF"
                val chooser = Intent.createChooser(shareIntent, chooserTitle)
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(chooser)

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message ?: "Gagal membagikan PDF", e)
            }
        }.start()
    }

    private fun openPdfIntent(sourceFile: File, contentUri: Uri?) {
        try {
            val intent = Intent(Intent.ACTION_VIEW)
            val uriToOpen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(reactContext, "${reactContext.packageName}.provider", sourceFile)
            } else {
                contentUri ?: Uri.fromFile(sourceFile)
            }
            intent.setDataAndType(uriToOpen, "application/pdf")
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            val chooser = Intent.createChooser(intent, "Buka Laporan PDF")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stampPhoto(imagePath: String, options: ReadableMap, promise: Promise) {
        Thread {
            try {
                if (imagePath.isEmpty() || imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("telegram://")) {
                    promise.resolve(imagePath)
                    return@Thread
                }

                val cleanPath = imagePath.replace("file://", "")
                val file = File(cleanPath)

                // 1. Decode bitmap
                val inputStream = if (file.exists()) {
                    FileInputStream(file)
                } else {
                    reactContext.contentResolver.openInputStream(Uri.parse(imagePath))
                }

                if (inputStream == null) {
                    promise.resolve(imagePath)
                    return@Thread
                }

                val originalBitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                if (originalBitmap == null) {
                    promise.resolve(imagePath)
                    return@Thread
                }

                // 2. Check EXIF orientation
                var orientation = ExifInterface.ORIENTATION_NORMAL
                try {
                    if (file.exists()) {
                        val exif = ExifInterface(file.absolutePath)
                        orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                    } else if (imagePath.startsWith("content://") && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        reactContext.contentResolver.openInputStream(Uri.parse(imagePath))?.use { isExif ->
                            val exif = ExifInterface(isExif)
                            orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore EXIF failure
                }

                // Rotate if required
                val rotatedBitmap = when (orientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> rotateBitmap(originalBitmap, 90f)
                    ExifInterface.ORIENTATION_ROTATE_180 -> rotateBitmap(originalBitmap, 180f)
                    ExifInterface.ORIENTATION_ROTATE_270 -> rotateBitmap(originalBitmap, 270f)
                    else -> originalBitmap
                }

                val width = rotatedBitmap.width
                val height = rotatedBitmap.height

                // Create mutable bitmap & canvas
                val stampedBitmap = rotatedBitmap.copy(Bitmap.Config.ARGB_8888, true)
                val canvas = Canvas(stampedBitmap)

                // Extract options
                val timestamp = if (options.hasKey("timestamp")) options.getString("timestamp") else null
                val coordinates = if (options.hasKey("coordinates")) options.getString("coordinates") else null
                val address = if (options.hasKey("address")) options.getString("address") else null
                val label = if (options.hasKey("label")) options.getString("label") else null

                val lines = mutableListOf<String>()
                if (!timestamp.isNullOrBlank()) lines.add("Tgl/Jam: $timestamp")
                if (!coordinates.isNullOrBlank()) lines.add("Koordinat: $coordinates")
                if (!address.isNullOrBlank()) lines.add("Alamat: $address")

                if (lines.isNotEmpty()) {
                    // Scale metrics proportionally to image resolution
                    val baseDimension = Math.min(width, height).toFloat()
                    val scale = Math.max(0.6f, baseDimension / 720f)

                    val fontSize = 16f * scale
                    val paddingX = 14f * scale
                    val paddingY = 12f * scale
                    val cornerRadius = 10f * scale
                    val margin = 16f * scale
                    val lineSpacing = 6f * scale

                    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.WHITE
                        textSize = fontSize
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        setShadowLayer(3f * scale, 1.5f * scale, 1.5f * scale, Color.argb(220, 0, 0, 0))
                    }

                    val fontMetrics = textPaint.fontMetrics
                    val lineHeight = fontMetrics.bottom - fontMetrics.top

                    // Limit badge width to 90% of image width
                    val maxBadgeWidth = width - (margin * 2)
                    val maxTextWidthAllowed = maxBadgeWidth - (paddingX * 2)

                    // Truncate long lines if exceeding image width
                    val processedLines = lines.map { line ->
                        var displayLine = line
                        if (textPaint.measureText(displayLine) > maxTextWidthAllowed) {
                            while (displayLine.length > 4 && textPaint.measureText("$displayLine...") > maxTextWidthAllowed) {
                                displayLine = displayLine.dropLast(1)
                            }
                            displayLine = "$displayLine..."
                        }
                        displayLine
                    }

                    var maxLineWidth = 0f
                    for (line in processedLines) {
                        val w = textPaint.measureText(line)
                        if (w > maxLineWidth) maxLineWidth = w
                    }

                    val badgeWidth = Math.min(maxLineWidth + (paddingX * 2), maxBadgeWidth)
                    val badgeHeight = (processedLines.size * lineHeight) + ((processedLines.size - 1) * lineSpacing) + (paddingY * 2)

                    // Position at bottom-left
                    val left = margin
                    val bottom = height - margin
                    val top = bottom - badgeHeight
                    val right = left + badgeWidth

                    // Draw semi-transparent dark rounded badge
                    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.argb(195, 15, 23, 42) // #0F172A ~76% opacity
                        style = Paint.Style.FILL
                    }
                    val badgeRect = RectF(left, top, right, bottom)
                    canvas.drawRoundRect(badgeRect, cornerRadius, cornerRadius, bgPaint)

                    // Draw subtle border around badge
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = Color.argb(70, 255, 255, 255)
                        style = Paint.Style.STROKE
                        strokeWidth = 1.5f * scale
                    }
                    canvas.drawRoundRect(badgeRect, cornerRadius, cornerRadius, strokePaint)

                    // Draw lines
                    var currentY = top + paddingY - fontMetrics.top
                    for (line in processedLines) {
                        canvas.drawText(line, left + paddingX, currentY, textPaint)
                        currentY += lineHeight + lineSpacing
                    }
                }

                // 3. Save stamped bitmap to app cache directory
                val cacheDir = File(reactContext.cacheDir, "stamped_photos")
                if (!cacheDir.exists()) cacheDir.mkdirs()
                val outFile = File(cacheDir, "stamp_${System.currentTimeMillis()}_${(1000..9999).random()}.jpg")
                FileOutputStream(outFile).use { out ->
                    stampedBitmap.compress(Bitmap.CompressFormat.JPEG, 88, out)
                }

                promise.resolve("file://${outFile.absolutePath}")
            } catch (e: Exception) {
                e.printStackTrace()
                // Graceful fallback to original image
                promise.resolve(imagePath)
            }
        }.start()
    }

    private fun rotateBitmap(bitmap: Bitmap, degrees: Float): Bitmap {
        if (degrees == 0f) return bitmap
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }
}
