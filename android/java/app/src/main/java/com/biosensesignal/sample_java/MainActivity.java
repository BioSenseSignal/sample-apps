package com.biosensesignal.sample_java;

import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.databinding.DataBindingUtil;

import com.biosensesignal.sample_java.databinding.ActivityMainBinding;
import com.biosensesignal.sdk.api.HealthMonitorException;
import com.biosensesignal.sdk.api.SessionEnabledVitalSigns;
import com.biosensesignal.sdk.api.images.capture_data.CaptureData;
import com.biosensesignal.sdk.api.images.capture_data.CaptureDeviceData;
import com.biosensesignal.sdk.api.images.capture_data.CaptureEnvironmentData;
import com.biosensesignal.sdk.api.images.capture_data.CaptureFaceData;
import com.biosensesignal.sdk.api.images.capture_data.CaptureMetric;
import com.biosensesignal.sdk.api.images.ImageData;
import com.biosensesignal.sdk.api.images.ImageListener;
import com.biosensesignal.sdk.api.images.ImageValidity;
import com.biosensesignal.sdk.api.license.LicenseDetails;
import com.biosensesignal.sdk.api.license.LicenseInfo;
import com.biosensesignal.sdk.api.license.LicenseOfflineMeasurements;
import com.biosensesignal.sdk.api.session.Session;
import com.biosensesignal.sdk.api.session.SessionInfoListener;
import com.biosensesignal.sdk.api.session.SessionState;
import com.biosensesignal.sdk.api.alerts.ErrorData;
import com.biosensesignal.sdk.api.alerts.WarningData;
import com.biosensesignal.sdk.api.alerts.AlertCodes;
import com.biosensesignal.sdk.api.vital_signs.VitalSign;
import com.biosensesignal.sdk.api.vital_signs.VitalSignTypes;
import com.biosensesignal.sdk.api.vital_signs.VitalSignsListener;
import com.biosensesignal.sdk.api.vital_signs.VitalSignsResults;
import com.biosensesignal.sdk.api.vital_signs.vitals.VitalSignMeanRRI;
import com.biosensesignal.sdk.api.vital_signs.vitals.VitalSignPulseRate;
import com.biosensesignal.sdk.session.FaceSessionBuilder;

import java.util.Locale;

public class MainActivity extends AppCompatActivity
        implements ImageListener, VitalSignsListener, SessionInfoListener {

    private static final String LICENSE_KEY = "<ENTER_YOUR_LICENSE_KEY>";
    private static final long MEASUREMENT_DURATION = 60;
    private static final String LOG_TAG = "BiosenseSignalSample";
    private static final int PERMISSION_REQUEST_CODE = 12345;

    private ActivityMainBinding mBinding;
    private Session mSession;
    private Bitmap mFaceDetection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mBinding = DataBindingUtil.setContentView(this, R.layout.activity_main);
        mBinding.startStopButton.setOnClickListener(
                (View.OnClickListener) v -> handleStartStopButtonClicked());

        mFaceDetection = createFaceDetectionBitmap();
    }

    @Override
    protected void onStart() {
        super.onStart();
        int permissionStatus = ActivityCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA);
        if (permissionStatus == PackageManager.PERMISSION_GRANTED) {
            createSession();
        } else {
            requestPermissions((new String[]{android.Manifest.permission.CAMERA}), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (mSession != null) {
            mSession.terminate();
            mSession = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            createSession();
        }
    }

    @Override
    public void onImage(ImageData imageData) {
        printCaptureData(imageData);

        runOnUiThread(() -> {
            if (imageData.getImageValidity() != ImageValidity.VALID) {
                mBinding.imageValidity.setVisibility(View.VISIBLE);
                switch (imageData.getImageValidity()) {
                    case ImageValidity.INVALID_DEVICE_ORIENTATION:
                        mBinding.imageValidityDescription.setText(R.string.invalid_orientation);
                        break;
                    case ImageValidity.INVALID_ROI:
                        mBinding.imageValidityDescription.setText(R.string.face_not_detected);
                        break;
                    case ImageValidity.TILTED_HEAD:
                        mBinding.imageValidityDescription.setText(R.string.tilted_head);
                        break;
                    case ImageValidity.FACE_TOO_FAR:
                        mBinding.imageValidityDescription.setText(R.string.you_are_too_far);
                        break;
                    case ImageValidity.UNEVEN_LIGHT:
                        mBinding.imageValidityDescription.setText(R.string.uneven_lightning);
                        break;
                    case ImageValidity.FACE_NOT_CENTERED:
                        mBinding.imageValidityDescription.setText(R.string.face_not_centered);
                        break;
                    case ImageValidity.DEVICE_NOT_ALIGNED:
                        mBinding.imageValidityDescription.setText(R.string.device_not_aligned);
                        break;
                }
            } else {
                mBinding.imageValidity.setVisibility(View.INVISIBLE);
            }

            Canvas canvas = mBinding.cameraView.lockCanvas();
            if (canvas == null) {
                return;
            }
            // Drawing the bitmap on the TextureView canvas
            Bitmap image = imageData.getImage();
            canvas.drawBitmap(
                    image,
                    null,
                    new Rect(0, 0, mBinding.cameraView.getWidth(),
                            mBinding.cameraView.getBottom() - mBinding.cameraView.getTop()),
                    null
            );

            //Drawing the face detection (if not null..)
            Rect roi = imageData.getCaptureData() != null
                    ? imageData.getCaptureData().getFace().getRoi()
                    : null;
            if (roi != null) {
                //First we scale the SDK face detection rectangle to fit the TextureView size
                RectF targetRect = new RectF(roi);
                Matrix m = new Matrix();
                m.postScale(1f, 1f, image.getWidth() / 2f, image.getHeight() / 2f);
                m.postScale(
                        (float)mBinding.cameraView.getWidth() / image.getWidth(),
                        (float)mBinding.cameraView.getHeight() / image.getHeight()
                );
                m.mapRect(targetRect);
                // Then we draw it on the Canvas
                canvas.drawBitmap(mFaceDetection, null, targetRect, null);
            }


            mBinding.cameraView.unlockCanvasAndPost(canvas);
        });
    }

    private void printCaptureData(ImageData imageData) {
        CaptureData captureData = imageData.getCaptureData();
        if (captureData == null) {
            return;
        }

        CaptureFaceData face = captureData.getFace();
        CaptureDeviceData device = captureData.getDevice();
        CaptureEnvironmentData environment = captureData.getEnvironment();

        Log.i(LOG_TAG,
                "CaptureData: "
                        + "validity=" + captureData.getValidity()
                        + ", roi=" + face.getRoi()
                        + ", yaw=" + formatCaptureMetric(face.getYaw())
                        + ", roll=" + formatCaptureMetric(face.getRoll())
                        + ", pitch=" + formatCaptureMetric(face.getPitch())
                        + ", verticalAlignment=" + formatCaptureMetric(face.getVerticalAlignment())
                        + ", horizontalAlignment=" + formatCaptureMetric(face.getHorizontalAlignment())
                        + ", devicePitch=" + formatCaptureMetric(device.getPitch())
                        + ", distance=" + formatCaptureMetric(device.getDistance())
                        + ", lightingUniformity=" + formatCaptureMetric(environment.getLightingUniformity()));
    }

    private String formatCaptureMetric(CaptureMetric metric) {
        if (metric == null) {
            return "N/A";
        }

        return String.format(Locale.US, "%.2f (%s)", metric.getValue(), metric.getStatus());
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onVitalSign(VitalSign vitalSign) {
        runOnUiThread(() -> {
            if (vitalSign.getType() == VitalSignTypes.PULSE_RATE) {
                VitalSignPulseRate pulseRate = (VitalSignPulseRate) vitalSign;
                mBinding.pulseRate.setText("PR: "+ pulseRate.getValue());
            }
        });
    }

    @Override
    public void onFinalResults(VitalSignsResults finalResults) {
        runOnUiThread(() -> {
            VitalSignPulseRate pulseRate =
                    (VitalSignPulseRate) finalResults.getResult(VitalSignTypes.PULSE_RATE);
            String pulseRateValue = pulseRate != null ? pulseRate.getValue().toString() : "N/A";

            VitalSignMeanRRI meanRri =
                    (VitalSignMeanRRI) finalResults.getResult(VitalSignTypes.MEAN_RRI);
            String meanRriValue = meanRri != null ? meanRri.getValue().toString() : "N/A";

            showAlert("Final Results", "Pulse Rate: "+ pulseRateValue +"\n"+ "Mean RRi: "+ meanRriValue);
        });
    }

    @Override
    public void onSessionStateChange(SessionState sessionState) {
        runOnUiThread(() -> {
            switch (sessionState) {
                case READY: {
                    mBinding.startStopButton.setEnabled(true);
                    mBinding.startStopButton.setText(R.string.start);
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    break;
                }
                case PROCESSING: {
                    mBinding.startStopButton.setEnabled(true);
                    mBinding.startStopButton.setText(R.string.stop);
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    break;
                }
                default: {
                    mBinding.startStopButton.setEnabled(false);
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    break;
                }
            }
        });
    }

    @Override
    public void onWarning(WarningData warningData) {
        runOnUiThread(() -> {
            if (warningData.getCode() == AlertCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING) {
                mBinding.pulseRate.setText("");
            }

            Toast.makeText(this, "Warning: " + warningData.getCode(), Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onError(ErrorData errorData) {
        runOnUiThread(() -> {
            showAlert(null, "Error: "+ errorData.getCode());
        });
    }

    @Override
    public void onLicenseInfo(LicenseInfo licenseInfo) {
        runOnUiThread(() -> {
            String activationId = licenseInfo.getLicenseActivationInfo().getActivationID();
            if (!activationId.isEmpty()) {
                Log.i(LOG_TAG, "License Activation ID: "+ activationId);
            }

            LicenseOfflineMeasurements offlineMeasurements = licenseInfo.getLicenseOfflineMeasurements();
            if (offlineMeasurements != null) {
                Log.i(LOG_TAG,
                        "License Offline Measurements: " +
                                offlineMeasurements.getTotalMeasurements() +"/" +
                                offlineMeasurements.getRemainingMeasurements()
                );
            }
        });
    }

    @Override
    public void onEnabledVitalSigns(SessionEnabledVitalSigns sessionEnabledVitalSigns) {
        runOnUiThread(() -> Log.i(LOG_TAG,
                "Pulse Rate Enabled: "+ sessionEnabledVitalSigns.isEnabled(VitalSignTypes.PULSE_RATE)
        ));
    }

    private void createSession() {
        LicenseDetails licenseDetails = new LicenseDetails(LICENSE_KEY);
        try {
            mSession = new FaceSessionBuilder(getApplicationContext())
                    .withImageListener(this)
                    .withVitalSignsListener(this)
                    .withSessionInfoListener(this)
                    //.withAnalytics() // also add to build.gradle under 'dependencies' section the line: implementation 'com.segment.analytics.kotlin:android:1.16.3'
                    .build(licenseDetails);
        } catch (HealthMonitorException e) {
            showAlert(null, "Error: " + e.getErrorCode());
        }
    }

    private void handleStartStopButtonClicked() {
        if (mSession == null) {
            return;
        }

        mBinding.imageValidity.setVisibility(View.INVISIBLE);
        try {
            if (mSession.getState() == SessionState.READY) {
                mSession.start(MEASUREMENT_DURATION);
                mBinding.pulseRate.setText("");
            } else {
                mSession.stop();
            }
        } catch (HealthMonitorException e) {
            showAlert(null, "Error: " + e.getErrorCode());
        }
    }

    private void showAlert(String title, String message) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", null)
                .setCancelable(false)
                .show();
    }

    private Bitmap createFaceDetectionBitmap() {
        Drawable drawable = ContextCompat.getDrawable(this, R.drawable.face_detection);
        if (drawable == null) {
            return null;
        }

        int width = drawable.getIntrinsicWidth();
        width = width > 0 ? width : 1;
        int height = drawable.getIntrinsicHeight();
        height = height > 0 ? height : 1;

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);

        return bitmap;
    }
}
