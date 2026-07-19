import * as React from 'react';


import { AlertCodes, SessionState, VitalSignTypes, useSessionState, useSessionWarnings, useVitalSigns } from 'biosensesignal-react-native-sdk';
import { StyleSheet, Text } from 'react-native';


export const PulseRate = () => {
    const vitalSign = useVitalSigns();
    const sessionState = useSessionState();
    const warning = useSessionWarnings();
    const [pulseRate, setPulseRate] = React.useState<string>();

    React.useEffect(() => {
        if (!vitalSign) {
            return;
        }

        if (vitalSign.type == VitalSignTypes.PULSE_RATE) {
            setPulseRate(vitalSign.value)
        }
    }, [vitalSign]);

    React.useEffect(() => {
        if (warning?.code == AlertCodes.MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING) {
            setPulseRate(undefined);
        }
    }, [warning]);

    React.useEffect(() => {
        if (sessionState == SessionState.STARTING) {
            setPulseRate(undefined);
        }
    }, [sessionState]);

    return pulseRate 
        ? (<Text style={styles.pulseRate}>PR: {pulseRate}</Text>) 
        : null;
}

const styles = StyleSheet.create({
    pulseRate: {
        fontSize: 26
    }
});