import * as React from 'react';
import { Alert, AppState, AppStateStatus, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeepAwake from 'react-native-keep-awake';
import { useFocusEffect } from '@react-navigation/native';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';

import { CameraPreview } from './components/CameraPreview';
import { StartStopButton } from './components/StartStopButton';
import { PulseRate } from './components/PulseRate';
import { ImageValidityView } from './components/ImageValidityView';

import { 
    Session, 
    SessionState, 
    SessionBuilder,
    VitalSignTypes, 
    useSessionState, 
    useSessionWarnings, 
    useSessionErrors, 
    HealthMonitorException, 
    useFinalResults,
    useEnabledVitalSigns,
    useLicenseInfo
} from 'biosensesignal-react-native-sdk';


const MEASUREMENT_DURATION = 60;
const LICENSE_KEY = "<ENTER_YOUR_LICENSE_KEY>";

const checkCameraPermissions = async (): Promise<boolean> => {
    try {
        const permission = Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA;
        return await check(permission) == RESULTS.GRANTED 
                || await request(permission) == RESULTS.GRANTED;
    } catch (e) {
        return false;
    }
};

enum ScreenActiveState {
    ACTIVE,
    INACTIVE
}

export default function MeasurementScreen({ navigation }) {
    const finalResults = useFinalResults();
    const sessionState = useSessionState();
    const warning = useSessionWarnings();
    const error = useSessionErrors();
    const enabledVitalSigns = useEnabledVitalSigns();
    const licenseInfo = useLicenseInfo();

    const duringPermissionsCheck = React.useRef(false);
    const warningTimeout = React.useRef<NodeJS.Timeout>();
    const insets = useSafeAreaInsets();
    const session = React.useRef<Session>();
    const [warningMessage, setWarningMessage] = React.useState<string>();
    const [screenActiveState, setScreenActiveState] = React.useState(ScreenActiveState.ACTIVE);

    const createNewSession = async () => {
        duringPermissionsCheck.current = true;
        const permissionsGranted = await checkCameraPermissions();
        duringPermissionsCheck.current = false;
        if (!permissionsGranted) {
            showError("Please approve permissions in the device settings")
            return;
        }

        await terminateSession();
        try { 
            session.current = await SessionBuilder.faceSession(
              {
                licenseKey: LICENSE_KEY
              },
              {
                // sdkAnalytics: true
              }
            );
        } catch (e) {
            const exception = (e as HealthMonitorException)
            showError(`Error: ${exception?.code}`);
        }
    }

    const terminateSession = async () => {
        await session.current?.terminate();
        session.current = undefined;
    }

    const startStopClicked = React.useCallback(async () => {
        try {
            if (sessionState == SessionState.READY) {
                await session.current?.start(MEASUREMENT_DURATION);
            } else {
                await session.current?.stop();
            }
        } catch (e) {
            const exception = (e as HealthMonitorException)
            showError(`Error: ${exception?.code}`);
        }
    }, [sessionState]);

    const showError = (errorMessage: string) => {
        Alert.alert('', errorMessage,
            [{ text: 'OK' }],
            { cancelable: false },
        );
    }
    
    // Lifecycle handling. Create a session when the screen is visible and terminate the session when the screen is invisible
    // Either when navigating to/from the screen or when the application foreground state changes
    React.useEffect(() => {
        screenActiveState == ScreenActiveState.ACTIVE ? createNewSession() : terminateSession();
    }, [screenActiveState])

    // Handle application foreground/background events
    React.useEffect(() => {
        const subscription = AppState.addEventListener('change', (appState: AppStateStatus) => {
            if (appState === 'active' && !session.current) {
                setScreenActiveState(ScreenActiveState.ACTIVE);
                
            } else if (appState === 'background' && !duringPermissionsCheck.current) {
                setScreenActiveState(ScreenActiveState.INACTIVE);
            }
        });

        return subscription.remove;
      }, []);

    // Handle screen navigation events
    useFocusEffect(React.useCallback(() => {
        setScreenActiveState(ScreenActiveState.ACTIVE);
        return () => {
            terminateSession();
            setScreenActiveState(ScreenActiveState.INACTIVE);
        }
    }, []));

    // Keeping the screen on during measurement
    React.useEffect(() => {
        if (sessionState == SessionState.STARTING || sessionState == SessionState.PROCESSING) {
            KeepAwake.activate();
        } else {
            KeepAwake.deactivate();
        }
    }, [sessionState])

    // Handle warnings - presenting it for 3 seconds
    React.useEffect(() => {
        if (!warning || warningMessage) {
            return;
        }
        
        setWarningMessage(`Warning: ${warning?.code}`);
        warningTimeout.current && clearTimeout(warningTimeout.current);
        warningTimeout.current = setTimeout(() => {
            setWarningMessage(undefined);
            warningTimeout.current = undefined;
        }, 3000);
    }, [warning]);

    //Handle errors - showing a popup dialog
    React.useEffect(() => {
        if (error) {
            showError(`Error: ${error?.code}`)
        }
    }, [error]);

    React.useEffect(() => {
        if (enabledVitalSigns) {
            console.log(`Pulse Rate Enabled: ${enabledVitalSigns.isEnabled(VitalSignTypes.PULSE_RATE)}`)
        }
    }, [enabledVitalSigns]);

    React.useEffect(() => {
        if (licenseInfo) {
            console.log(`License Activation ID: ${licenseInfo.activationInfo.activationId}`)
            
            if (licenseInfo.offlineMeasurements) { 
                console.log(`License Offline Measurements: 
                        ${licenseInfo.offlineMeasurements.totalMeasurements}/
                        ${licenseInfo.offlineMeasurements.remainingMeasurements}`);
            }
        }
    }, [licenseInfo]);

    //Handle the final results - showing a final results dialog
    React.useEffect(() => {
        if (finalResults) {
            const pr = finalResults.getResult(VitalSignTypes.PULSE_RATE)?.value ?? 'N/A';
            const meanRRI = finalResults.getResult(VitalSignTypes.MEAN_RRI)?.value ?? 'N/A';
            
            Alert.alert(
                'Final Results', 
                `Pulse Rate: ${pr}\nMean RRi: ${meanRRI}`,
                [{ text: 'OK' }],
                { cancelable: false },
            );
        }
    }, [finalResults]);

    return (
        <View style={{...styles.container, ...{paddingBottom: insets.bottom+50, paddingTop: insets.top}}}>
            <CameraPreview />
            <View style={styles.bottomContainer}>
                <ImageValidityView />
                <View style={{height: 30}} />
                <PulseRate />
                <View style={{height: 30}} />
                <StartStopButton 
                    isEnabled={sessionState == SessionState.READY || sessionState == SessionState.PROCESSING}
                    isStop={sessionState == SessionState.STARTING || sessionState == SessionState.PROCESSING}
                    onClick={startStopClicked} />
                {warningMessage && (<Text style={styles.warningMessage}>{warningMessage}</Text>)}
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        flex: 1,
    },

    bottomContainer: {
        position: 'absolute',
        height: '30%',
        width: '100%',
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },

    warningMessage: {
        position: 'absolute',
        bottom: '0%',
        backgroundColor: '#000000',
        textAlign: 'center',
        width: '100%',
        color: 'white',
        padding: 16,
    },
});