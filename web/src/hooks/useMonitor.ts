import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import monitor, {
  AlertData,
  CaptureData,
  DeviceOrientation,
  EnabledVitalSigns,
  FaceSessionOptions,
  HealthMonitorCodes,
  HealthMonitorSession,
  ImageData,
  ImageValidity,
  OfflineMeasurements,
  SessionState,
  VitalSigns,
  VitalSignsResults,
} from '@biosensesignal/web-sdk';
import { InfoType, InfoData } from '../types';

const useMonitor = (
  video: MutableRefObject<HTMLVideoElement>,
  cameraId: string,
  processingTime: number,
  licenseKey: string,
  productId: string,
  startMeasuring: boolean,
) => {
  const [session, setSession] = useState<HealthMonitorSession>();
  const [sessionState, setSessionState] = useState<SessionState>();
  const [isMonitorReady, setIsMonitorReady] = useState<boolean>();
  const [enabledVitalSigns, setEnabledVitalSigns] = useState<
    EnabledVitalSigns
  >();
  const [offlineMeasurements, setOfflineMeasurements] = useState<
    OfflineMeasurements
  >();
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>();

  const [error, setError] = useState<AlertData>({ code: -1 });
  const [warning, setWarning] = useState<AlertData>({ code: -1 });
  const [info, setInfo] = useState<InfoData>({ type: InfoType.NONE });
  const [captureData, setCaptureData] = useState<CaptureData | undefined>(undefined);
  const isDismissing = useRef<boolean>(false);

  const setInfoWithDismiss = useCallback(
    (info: InfoData, seconds?: number) => {
      if (!isDismissing.current) {
        setInfo(info);
        if (seconds) {
          isDismissing.current = true;
          setTimeout(() => {
            setInfo({ type: InfoType.NONE });
            isDismissing.current = false;
          }, seconds * 1000);
        }
      }
    },
    [InfoType, setInfo, info, isDismissing, isDismissing.current],
  );

  const updateVitalSigns = useCallback((vitalSigns) => {
    setVitalSigns((prev) => ({
      ...prev,
      ...vitalSigns,
    }));
  }, []);

  const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    updateVitalSigns(vitalSign);
  }, []);

  const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    setVitalSigns(null);
    updateVitalSigns(vitalSignsResults.results);
  }, []);

  const onError = (errorData: AlertData) => {
    setError(errorData);
  };

  const onWarning = (warningData: AlertData) => {
    if (
      warningData.code ===
      HealthMonitorCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING
    ) {
      setVitalSigns(null);
    }
    setWarning(warningData);
  };

  const onStateChange = useCallback((state: SessionState) => {
    setSessionState(state);
    if (state === SessionState.POSTURE_CHECK || state === SessionState.MEASURING) {
      setError({ code: -1 });
      setWarning({ code: -1 });
    }
    if (state === SessionState.MEASURING) {
      setVitalSigns(null);
    }
  }, []);

  const onEnabledVitalSigns = useCallback((vitalSigns: EnabledVitalSigns) => {
    setEnabledVitalSigns(vitalSigns);
  }, []);

  const onOfflineMeasurement = useCallback(
    (offlineMeasurements: OfflineMeasurements) => {
      setOfflineMeasurements(offlineMeasurements);
    },
    [],
  );

  const onActivation = useCallback((activationId: string) => {
    // the device has been activated with activationId
  }, []);

  const onImageData = useCallback((_imageValidity: ImageValidity, imageData: ImageData) => {
    const { imageValidity, captureData } = imageData;
    // Update PGS capture data for UI
    setCaptureData(imageValidity === ImageValidity.INVALID_ROI ? undefined : captureData);

    // Mirrors the Android app: the instruction strip is driven by the single
    // per-frame imageValidity value, independent of whether captureData (used
    // by the PGS metrics pane) is also present for that frame.
    if (imageValidity !== ImageValidity.VALID) {
      let message: string;
      switch (imageValidity) {
        case ImageValidity.INVALID_DEVICE_ORIENTATION:
          message = 'Unsupported Orientation';
          break;
        case ImageValidity.TILTED_HEAD:
          message = 'Head Tilted';
          break;
        case ImageValidity.FACE_TOO_FAR:
          message = 'Invalid Distance';
          break;
        case ImageValidity.DEVICE_NOT_ALIGNED:
          message = 'Device Not Aligned';
          break;
        case ImageValidity.FACE_NOT_CENTERED:
          message = 'Face Not Centered';
          break;
        case ImageValidity.UNEVEN_LIGHT:
          message = 'Uneven Lighting';
          break;
        case ImageValidity.INVALID_ROI:
        default:
          message = 'Face Not Detected';
      }
      setInfo({ type: InfoType.INSTRUCTION, message });
    } else {
      setInfoWithDismiss({ type: InfoType.NONE });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await monitor.initialize({
          licenseKey,
          licenseInfo: {
            onEnabledVitalSigns,
            onOfflineMeasurement,
            onActivation,
          },
        });
        console.log(`Initialized monitor`);
        setIsMonitorReady(true);
        setError({ code: -1 });
      } catch (e) {
        console.error('Error initializing HealthMonitor', e);
        setIsMonitorReady(false);
        setError({ code: e.errorCode });
      }
    })();
  }, [licenseKey, productId]);

  useEffect(() => {
    (async () => {
      try {
        if (!isMonitorReady || !processingTime || !video.current) {
          return;
        }

        sessionState === SessionState.ACTIVE && session.terminate();

        const options: FaceSessionOptions = {
          input: video.current,
          cameraDeviceId: cameraId,
          processingTime,
          onVitalSign,
          onFinalResults,
          onError,
          onWarning,
          onStateChange,
          orientation: DeviceOrientation.PORTRAIT,
          onImageData,
          // isAnalyticsEnabled: true,
          /*******************************************************************************
           * For accurate vital signs calculation the user's parameters should be provided.
           * The following is an example of how the parameters are passed to the SDK:
           *
           * subjectDemographic: {sex: Sex.MALE, age: 35, weight: 75, height: 165}
           *
           * When measuring a new user then a new session must be created using the
           * new user's parameters
           * The parameters are used locally on the device only for the vital sign
           * calculation, and deleted when the session is terminated.
           *******************************************************************************/
        };

        const faceSession = await monitor.createFaceSession(options);
        console.log(`Session created`);
        setSession(faceSession);
        setError({ code: -1 });
      } catch (e) {
        setError({ code: e.errorCode });
        console.error('Error creating a session', e);
      }
    })();
  }, [processingTime, isMonitorReady]);

  useEffect(() => {
    if (startMeasuring) {
      if (sessionState === SessionState.ACTIVE) {
        session.start();
        setError({ code: -1 });
      }
    } else {
      sessionState === SessionState.MEASURING && session.stop();
    }
  }, [startMeasuring]);

  return {
    session,
    sessionState,
    captureData,
    vitalSigns: {
      pulseRate: {
        value: vitalSigns?.pulseRate?.value,
        isEnabled: enabledVitalSigns?.isEnabledPulseRate,
      },
      respirationRate: {
        value: vitalSigns?.respirationRate?.value,
        isEnabled: enabledVitalSigns?.isEnabledRespirationRate,
      },
      stress: {
        value: vitalSigns?.stressLevel?.value,
        isEnabled: enabledVitalSigns?.isEnabledStressLevel,
      },
      hrvSdnn: {
        value: vitalSigns?.sdnn?.value,
        isEnabled: enabledVitalSigns?.isEnabledSdnn,
      },
      spo2: {
        value: null, //TODO Spo2 is currently disabled by algo
        isEnabled: false, //enabledVitalSigns?.isEnabledSpo2,
      },
      bloodPressure: {
        value: vitalSigns?.bloodPressure?.value,
        isEnabled: enabledVitalSigns?.isEnabledBloodPressure,
      },
    },
    offlineMeasurements,
    error,
    warning,
    info,
  };
};

export default useMonitor;
