
import * as React from 'react';
import { Button, StyleSheet, Text, TouchableOpacity } from "react-native";


type StartStopButtonProps = {
    isEnabled: boolean, 
    isStop: boolean, 
    onClick: () => void
}

export const StartStopButton = (props: StartStopButtonProps) => {
    return (<TouchableOpacity 
        style={styles.startButton}        
        disabled={!props.isEnabled} 
        onPress={() => props.onClick()}>
            <Text style={styles.startButtonTitle}>{props.isStop ? "STOP" : "START"}</Text>
    </TouchableOpacity>);
}

const styles = StyleSheet.create({
    startButton: {
        width: 100, 
        height: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6200EE',
        borderRadius: 5,
    },
    startButtonTitle: {
        color: 'white'
    }
});