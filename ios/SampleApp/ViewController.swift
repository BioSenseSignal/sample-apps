import UIKit
import BiosenseSignal

class ViewController: UIViewController {

    private static let licenseKey = "<ENTER_YOUR_LICENSE_KEY>"
    private static let measurementDuration = UInt64(60)
    
    private var session: Session?
    private var faceDetection = UIImageView(image: UIImage(named: "face_detection"))
    
    //MARK: - Outlets
    @IBOutlet weak var cameraPreview: UIImageView!
    @IBOutlet weak var pulseRateLabel: UILabel!
    @IBOutlet weak var startStopButton: UIButton!
    @IBOutlet weak var imageValidityView: UIView!
    @IBOutlet weak var imageValidityDescription: UILabel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        cameraPreview?.addSubview(faceDetection)
        faceDetection.isHidden = true
        
        
        let notificationCenter = NotificationCenter.default
        notificationCenter.addObserver(self,
                                       selector: #selector(appMovedToBackground),
                                       name: UIApplication.didEnterBackgroundNotification, object: nil)
        notificationCenter.addObserver(self,
                                       selector: #selector(appMovedBackToForeground),
                                       name: UIApplication.willEnterForegroundNotification, object: nil)
    }
    
    //MARK: - Lifecycle
    @objc
    private func appMovedBackToForeground() {
        createSession()
    }

    @objc
    private func appMovedToBackground() {
        session?.terminate()
    }
    

    //MARK: - Actions
    @IBAction func startStopButtonClicked(_ sender: Any) {
        handleStartStopButtonClicked()
    }
}


//MARK: - Image Listener
extension ViewController: ImageListener {
    
    func onImage(imageData: ImageData) {
        printCaptureData(imageData: imageData)

        DispatchQueue.main.async {
            if (imageData.imageValidity != ImageValidity.valid) {
                self.imageValidityView.isHidden = false
                switch (imageData.imageValidity) {
                case ImageValidity.invalidDeviceOrientation:
                    self.imageValidityDescription.text = "Invalid Orientation"
                case ImageValidity.invalidRoi:
                    self.imageValidityDescription.text = "Face Not Detected"
                case ImageValidity.tiltedHead:
                    self.imageValidityDescription.text = "Tilted Head"
                case ImageValidity.faceTooFar:
                    self.imageValidityDescription.text = "You are Too Far"
                case ImageValidity.unevenLight:
                    self.imageValidityDescription.text = "Uneven Lighting"
                case ImageValidity.faceNotCentered:
                    self.imageValidityDescription.text = "Face Not Centered"
                case ImageValidity.deviceNotAligned:
                    self.imageValidityDescription.text = "Device Not Aligned"
                default: break
                    
                }
            }
            else {
                self.imageValidityView.isHidden = true
            }
            
            self.cameraPreview.image = imageData.image
            guard let roi = imageData.captureData?.face.roi, !roi.isNull else {
                self.faceDetection.isHidden = true
                return
            }
            let scaleX = CGFloat(self.cameraPreview.frame.size.width / imageData.image.size.width)
            let scaleY = CGFloat(self.cameraPreview.frame.size.height / imageData.image.size.height)
            let resSize = CGSize(width: (roi.size.width * scaleX), height: (roi.size.height * scaleY))
            let resPoint = CGPoint(x: (roi.origin.x * scaleX), y: (roi.origin.y * scaleY))
            self.faceDetection.frame = CGRect(x: resPoint.x, y: resPoint.y, width: resSize.width, height: resSize.height)
            self.faceDetection.isHidden = false
            self.faceDetection.backgroundColor = .clear
        }
    }

    private func printCaptureData(imageData: ImageData) {
        guard let captureData = imageData.captureData else {
            return
        }

        let face = captureData.face
        let device = captureData.device
        let environment = captureData.environment

        print(
            "CaptureData: " +
            "validity=\(formatCaptureValidity(captureData.validity)), " +
            "roi=\(formatRoi(face.roi)), " +
            "yaw=\(formatCaptureMetric(face.yaw)), " +
            "roll=\(formatCaptureMetric(face.roll)), " +
            "pitch=\(formatCaptureMetric(face.pitch)), " +
            "verticalAlignment=\(formatCaptureMetric(face.verticalAlignment)), " +
            "horizontalAlignment=\(formatCaptureMetric(face.horizontalAlignment)), " +
            "devicePitch=\(formatCaptureMetric(device.pitch)), " +
            "distance=\(formatCaptureMetric(device.distance)), " +
            "lightingUniformity=\(formatCaptureMetric(environment.lightingUniformity))"
        )
    }

    private func formatCaptureMetric(_ metric: CaptureMetric?) -> String {
        guard let metric else {
            return "N/A"
        }

        return String(format: "%.2f (%@)", metric.value, formatCaptureMetricStatus(metric.status))
    }

    private func formatCaptureValidity(_ validity: CaptureValidity) -> String {
        switch validity {
        case .captureValid:
            return "CAPTURE_VALID"
        case .captureWarning:
            return "CAPTURE_WARNING"
        case .captureError:
            return "CAPTURE_ERROR"
        default:
            return String(describing: validity)
        }
    }

    private func formatCaptureMetricStatus(_ status: CaptureMetricStatus) -> String {
        switch status {
        case .valid:
            return "VALID"
        case .warning:
            return "WARNING"
        case .error:
            return "ERROR"
        default:
            return String(describing: status)
        }
    }

    private func formatRoi(_ roi: CGRect) -> String {
        return String(
            format: "Rect.fromLTRB(%.0f, %.0f, %.0f, %.0f)",
            roi.minX,
            roi.minY,
            roi.maxX,
            roi.maxY
        )
    }
}


//MARK: - Vital Signs Listener
extension ViewController: VitalSignsListener {
    
    func onVitalSign(vitalSign: VitalSign) {
        DispatchQueue.main.async {
            if let pulseRate = vitalSign as? VitalSignPulseRate {
                self.pulseRateLabel.text = String(format: "PR: %d", pulseRate.value)
            }
        }
    }
    
    func onFinalResults(results: VitalSignsResults) {
        DispatchQueue.main.async {
            var pulseRateValue: String?
            if let pulseRate = results.getResult(of: VitalSignTypes.pulseRate) as? VitalSignPulseRate {
                pulseRateValue = pulseRate.value.description
            }
            
            var meanRriValue: String?
            if let meanRri = results.getResult(of: VitalSignTypes.meanRri) as? VitalSignMeanRRI {
                meanRriValue = meanRri.value.description
            }
            
            self.showAlert(
                title: "Final Results",
                message: String(
                    format:"Pulse Rate: %@\nMean RRi: %@",
                    pulseRateValue ?? "N/A",
                    meanRriValue ?? "N/A"
                )
            )
        }
    }
}


//MARK: - Session Info Listener
extension ViewController: SessionInfoListener {
    func onSessionStateChange(sessionState: SessionState) {
        DispatchQueue.main.async {
            switch (sessionState) {
                case .ready:
                    self.startStopButton.isEnabled = true
                    self.startStopButton.setTitle("START", for: .normal)
                    UIApplication.shared.isIdleTimerDisabled = false
                case .processing:
                    self.startStopButton.isEnabled = true
                    self.startStopButton.setTitle("STOP", for: .normal)
                    UIApplication.shared.isIdleTimerDisabled = true
                default:
                    self.startStopButton.isEnabled = false
                    UIApplication.shared.isIdleTimerDisabled = false
            }
        }
        
    }
    
    func onWarning(warningData: WarningData) {
        DispatchQueue.main.async {
            if (warningData.code == AlertCodes.measurementMisdetectionDurationExceedsLimitWarning) {
                self.pulseRateLabel.text = ""
            }
            
            let toastLabel = UILabel(frame: CGRect(x: self.view.frame.size.width/2 - 75, y: self.view.frame.size.height-100, width: 150, height: 35))
            toastLabel.backgroundColor = UIColor.black.withAlphaComponent(0.6)
            toastLabel.textColor = UIColor.white
            toastLabel.textAlignment = .center;
            toastLabel.text = String(format: "Warning: %d", warningData.code)
            toastLabel.layer.cornerRadius = 10;
            toastLabel.clipsToBounds = true
            self.view.addSubview(toastLabel)
            DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 2) {
                toastLabel.removeFromSuperview()
            }
        }
    }
    
    func onError(errorData: ErrorData) {
        DispatchQueue.main.async {
            self.showAlert(message: String(format: "Error: %d", errorData.code))
        }
    }
    
    func onLicenseInfo(licenseInfo: LicenseInfo) {
        let activationId = licenseInfo.licenseActivationInfo.activationID
        print(String(format: "License Activation ID: %@", activationId))
        
        if let offlineMeasurements = licenseInfo.licenseOfflineMeasurements {
            print(String(
                format: "License Offline Measurements: %d/%d",
                offlineMeasurements.remainingMeasurements, offlineMeasurements.totalMeasurements))
        }
    }
    
    func onEnabledVitalSigns(enabledVitalSigns: SessionEnabledVitalSigns) {
        print(String(
            format: "Pulse Rate Enabled: %@",
            String(enabledVitalSigns.isEnabled(vitalSignType: VitalSignTypes.pulseRate))))
    }
}


extension ViewController {
    
    private func createSession() {
        do {
            session = try FaceSessionBuilder()
                .withImageListener(self)
                .withVitalSignsListener(self)
                .withSessionInfoListener(self)
                //.withAnalytics()
                .build(licenseDetails: LicenseDetails(licenseKey: ViewController.licenseKey))
        } catch {
            showAlert(message: String(format: "Error: %d", (error as NSError).code))
        }
    }
    
    private func handleStartStopButtonClicked() {
        imageValidityView.isHidden = true
        do {
            if (session?.state == .ready) {
                self.pulseRateLabel.text = ""
                try session?.start(measurementDuration: ViewController.measurementDuration)
            } else {
                try session?.stop()
            }
        } catch {
            showAlert(message: String(format: "Error: %d", (error as NSError).code))
        }
    }
    
    private func showAlert(title: String? = nil, message: String) {
        let alert = UIAlertController(
            title: title,
            message: message,
            preferredStyle: .alert)
        
        alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
        self.present(alert, animated: true, completion: nil)
    }
}
