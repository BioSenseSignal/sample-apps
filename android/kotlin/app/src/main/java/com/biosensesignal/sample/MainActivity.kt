package com.biosensesignal.sample

import com.biosensesignal.sample.R
import com.biosensesignal.sample.databinding.ActivityMainBinding
import com.biosensesignal.sdk.api.HealthMonitorException
import com.biosensesignal.sdk.api.SessionEnabledVitalSigns
import com.biosensesignal.sdk.api.alerts.AlertCodes
import com.biosensesignal.sdk.api.alerts.ErrorData
import com.biosensesignal.sdk.api.alerts.WarningData
import com.biosensesignal.sdk.api.images.capture_data.CaptureData
import com.biosensesignal.sdk.api.images.capture_data.CaptureMetric
import com.biosensesignal.sdk.api.images.ImageData
import com.biosensesignal.sdk.api.images.ImageListener
import com.biosensesignal.sdk.api.images.ImageValidity
import com.biosensesignal.sdk.api.license.LicenseDetails
import com.biosensesignal.sdk.api.license.LicenseInfo
import com.biosensesignal.sdk.api.session.Session
import com.biosensesignal.sdk.api.session.SessionInfoListener
import com.biosensesignal.sdk.api.session.SessionState
import com.biosensesignal.sdk.api.vital_signs.VitalSign
import com.biosensesignal.sdk.api.vital_signs.VitalSignTypes
import com.biosensesignal.sdk.api.vital_signs.VitalSignsListener
import com.biosensesignal.sdk.api.vital_signs.VitalSignsResults
import com.biosensesignal.sdk.api.vital_signs.vitals.VitalSignMeanRRI
import com.biosensesignal.sdk.api.vital_signs.vitals.VitalSignPulseRate
import com.biosensesignal.sdk.session.FaceSessionBuilder
import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.RectF
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import androidx.databinding.DataBindingUtil
import java.util.Locale

class MainActivity : AppCompatActivity(),
    ImageListener, VitalSignsListener, SessionInfoListener {

    companion object {
        const val licenseKey = "<ENTER_YOUR_LICENSE_KEY>"
        const val measurementDuration = 60L
    }

    private val logTag = "BiosenseSignalSample"
    private val permissionsRequestCode = 12345
    private lateinit var binding: ActivityMainBinding
    private var session: Session? = null

    private val faceDetection: Bitmap? by lazy {
        ContextCompat.getDrawable(this, R.drawable.face_detection)?.toBitmap()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = DataBindingUtil.setContentView(this, R.layout.activity_main)
        binding.startStopButton.setOnClickListener {
            handleStartStopButtonClicked()
        }
    }

    override fun onStart() {
        super.onStart()
        val permissionStatus = ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        if (permissionStatus == PackageManager.PERMISSION_GRANTED) {
            createSession()
        } else {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), permissionsRequestCode)
        }
    }

    override fun onStop() {
        super.onStop()
        session?.terminate()
        session = null
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == permissionsRequestCode
            && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            createSession()
        }
    }

    override fun onImage(imageData: ImageData) {
        printCaptureData(imageData)

        runOnUiThread {
            if (imageData.imageValidity != ImageValidity.VALID) {
                binding.imageValidity.visibility = View.VISIBLE
                when (imageData.imageValidity) {
                    ImageValidity.INVALID_DEVICE_ORIENTATION-> R.string.invalid_orientation
                    ImageValidity.INVALID_ROI -> R.string.face_not_detected
                    ImageValidity.TILTED_HEAD -> R.string.tilted_head
                    ImageValidity.FACE_TOO_FAR -> R.string.you_are_too_far
                    ImageValidity.UNEVEN_LIGHT -> R.string.uneven_lightning
                    ImageValidity.FACE_NOT_CENTERED -> R.string.face_not_centered
                    ImageValidity.DEVICE_NOT_ALIGNED -> R.string.device_not_aligned
                    else -> null
                }?.let {
                    binding.imageValidityDescription.setText(it)
                }
            } else {
                binding.imageValidity.visibility = View.INVISIBLE
            }
            
            binding.cameraView.lockCanvas()?.let { canvas ->
                // Drawing the bitmap on the TextureView canvas
                val image = imageData.image
                canvas.drawBitmap(
                    image,
                    null,
                    Rect(0, 0, binding.cameraView.width, binding.cameraView.bottom - binding.cameraView.top),
                    null
                )

                //Drawing the face detection (if not null..)
                imageData.captureData?.face?.roi?.let roi@{ faceDetectionRect ->
                    //First we scale the SDK face detection rectangle to fit the TextureView size
                    val targetRect = RectF(faceDetectionRect)
                    val m = Matrix()
                    m.postScale(1f, 1f, image.width / 2f, image.height / 2f)
                    m.postScale(
                        binding.cameraView.width.toFloat() / image.width.toFloat(),
                        binding.cameraView.height.toFloat() / image.height.toFloat()
                    )
                    m.mapRect(targetRect)
                    // Then we draw it on the Canvas
                    canvas.drawBitmap(faceDetection ?: return@roi, null, targetRect, null)
                }

                binding.cameraView.unlockCanvasAndPost(canvas)
            }
        }
    }

    private fun printCaptureData(imageData: ImageData) {
        val captureData: CaptureData = imageData.captureData ?: return
        val face = captureData.face
        val device = captureData.device
        val environment = captureData.environment

        Log.i(
            logTag,
            "CaptureData: " +
                    "validity=${captureData.validity}, " +
                    "roi=${face.roi}, " +
                    "yaw=${formatCaptureMetric(face.yaw)}, " +
                    "roll=${formatCaptureMetric(face.roll)}, " +
                    "pitch=${formatCaptureMetric(face.pitch)}, " +
                    "verticalAlignment=${formatCaptureMetric(face.verticalAlignment)}, " +
                    "horizontalAlignment=${formatCaptureMetric(face.horizontalAlignment)}, " +
                    "devicePitch=${formatCaptureMetric(device.pitch)}, " +
                    "distance=${formatCaptureMetric(device.distance)}, " +
                    "lightingUniformity=${formatCaptureMetric(environment.lightingUniformity)}"
        )
    }

    private fun formatCaptureMetric(metric: CaptureMetric?): String {
        return metric?.let {
            "${String.format(Locale.US, "%.2f", it.value)} (${it.status})"
        } ?: "N/A"
    }

    override fun onVitalSign(vitalSign: VitalSign) {
        runOnUiThread {
            (vitalSign as? VitalSignPulseRate)?.let { pulseRate ->
                "PR: ${pulseRate.value}"
                    .also { binding.pulseRate.text = it }
            }
        }
    }

    override fun onFinalResults(finalResults: VitalSignsResults) {
        runOnUiThread {
            val pulseRate = (finalResults.getResult(VitalSignTypes.PULSE_RATE) as? VitalSignPulseRate)?.value ?: "N/A"
            val meanRri = (finalResults.getResult(VitalSignTypes.MEAN_RRI) as? VitalSignMeanRRI)?.value ?: "N/A"

            showAlert("Final Results", "Pulse Rate: $pulseRate\nMean RRi: $meanRri")
        }
    }

    override fun onSessionStateChange(sessionState: SessionState) {
        runOnUiThread {
            when (sessionState) {
                SessionState.READY -> {
                    binding.startStopButton.isEnabled = true
                    binding.startStopButton.text = getString(R.string.start)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                SessionState.PROCESSING -> {
                    binding.startStopButton.isEnabled = true
                    binding.startStopButton.text = getString(R.string.stop)
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                else -> {
                    binding.startStopButton.isEnabled = false
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }
    }

    override fun onWarning(warningData: WarningData) {
        runOnUiThread {
            if (warningData.code == AlertCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING) {
                binding.pulseRate.text = ""
            }

            Toast.makeText(this, "Warning: ${warningData.code}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onError(errorData: ErrorData) {
        runOnUiThread {
            showAlert(message = "Error: ${errorData.code}")
        }
    }

    override fun onLicenseInfo(licenseInfo: LicenseInfo) {
        runOnUiThread {
            licenseInfo.licenseActivationInfo.activationID.takeIf { it.isNotEmpty() }?.let { id ->
                Log.i(logTag, "License Activation ID: $id")
            }

            licenseInfo.licenseOfflineMeasurements?.let { offlineMeasurements ->
                Log.i(
                    logTag, "License Offline Measurements: " +
                            "${offlineMeasurements.totalMeasurements}/" +
                            "${offlineMeasurements.remainingMeasurements}"
                )
            }
        }
    }

    override fun onEnabledVitalSigns(sessionEnabledVitalSigns: SessionEnabledVitalSigns) {
        runOnUiThread {
            Log.i(
                logTag,
                "Pulse Rate Enabled: ${sessionEnabledVitalSigns.isEnabled(VitalSignTypes.PULSE_RATE)}"
            )
        }
    }


    private fun createSession() {
        val licenseDetails = LicenseDetails(licenseKey)
        try {
            session = FaceSessionBuilder(applicationContext)
                .withImageListener(this)
                .withVitalSignsListener(this)
                .withSessionInfoListener(this)
                //.withAnalytics() // also add to build.gradle under 'dependencies' section the line: implementation 'com.segment.analytics.kotlin:android:1.16.3'
                .build(licenseDetails)
        } catch (e: HealthMonitorException) {
            showAlert(message = "Error ${e.errorCode}")
        }
    }

    private fun handleStartStopButtonClicked() {
        binding.imageValidity.visibility = View.INVISIBLE
        try {
            if (session?.state == SessionState.READY) {
                binding.pulseRate.text = ""
                session?.start(measurementDuration)
            } else {
                session?.stop()
            }
        } catch (e: HealthMonitorException) {
            showAlert(message = "Error ${e.errorCode}")
        }
    }

    private fun showAlert(title: String? = null, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .setCancelable(false)
            .show()
    }
}
