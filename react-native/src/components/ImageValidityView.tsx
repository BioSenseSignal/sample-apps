import * as React from 'react';

import {
    useImages,
    ImageValidity,
    SessionState,
    useSessionState,
    ImageData,
    CaptureMetricStatus,
    CaptureValidity,
} from "biosensesignal-react-native-sdk";
import { StyleSheet, Text, View } from 'react-native';

const formatCaptureValidity = (validity: CaptureValidity) => {
    return CaptureValidity[validity] ?? validity;
};

const formatCaptureMetricStatus = (status: CaptureMetricStatus) => {
    return CaptureMetricStatus[status] ?? status;
};

const formatCaptureMetric = (metric?: { value: number; status: unknown }) => {
    if (!metric) {
        return "N/A";
    }

    return `${metric.value.toFixed(2)} (${formatCaptureMetricStatus(metric.status as CaptureMetricStatus)})`;
};

const formatRoi = (roi?: { left: number; top: number; width: number; height: number }) => {
    if (!roi) {
        return "N/A";
    }

    return `Rect.fromLTRB(${roi.left}, ${roi.top}, ${roi.left + roi.width}, ${roi.top + roi.height})`;
};

const printCaptureData = (imageData?: ImageData) => {
    const captureData = (imageData as (ImageData & { captureData?: any }) | undefined)?.captureData;
    if (!captureData) {
        return;
    }

    const { face, device, environment, validity } = captureData;

    console.log(
        "CaptureData: " +
        `validity=${formatCaptureValidity(validity)}, ` +
        `roi=${formatRoi(face.roi)}, ` +
        `yaw=${formatCaptureMetric(face.yaw)}, ` +
        `roll=${formatCaptureMetric(face.roll)}, ` +
        `pitch=${formatCaptureMetric(face.pitch)}, ` +
        `verticalAlignment=${formatCaptureMetric(face.verticalAlignment)}, ` +
        `horizontalAlignment=${formatCaptureMetric(face.horizontalAlignment)}, ` +
        `devicePitch=${formatCaptureMetric(device.pitch)}, ` +
        `distance=${formatCaptureMetric(device.distance)}, ` +
        `lightingUniformity=${formatCaptureMetric(environment.lightingUniformity)}`
    );
};

export const ImageValidityView = () => {
    const sessionState = useSessionState();
    const [imageValidity, setImageValidity] = React.useState<string>();
    const imageData = useImages();

    React.useEffect(() => {
        if (sessionState != SessionState.PROCESSING) {
            setImageValidity(undefined);
        }
    }, [sessionState]);

    React.useEffect(() => {
        printCaptureData(imageData);

        if (!imageData || imageData.imageValidity == ImageValidity.VALID) {
            setImageValidity(undefined);
        } else {
            switch (imageData.imageValidity) {
                case ImageValidity.INVALID_DEVICE_ORIENTATION:
                    setImageValidity("Invalid Orientation");
                    break;
                case ImageValidity.INVALID_ROI:
                    setImageValidity("Face Not Detected");
                    break;
                case ImageValidity.TILTED_HEAD:
                    setImageValidity("Titled Head");
                    break;
                case ImageValidity.FACE_TOO_FAR:
                    setImageValidity("You are Too Far");
                    break;
                case ImageValidity.UNEVEN_LIGHT:
                    setImageValidity("Uneven Lighting");
                    break;
                case ImageValidity.FACE_NOT_CENTERED:
                    setImageValidity("Face Not Centered");
                    break;
                case ImageValidity.DEVICE_NOT_ALIGNED:
                    setImageValidity("Device Not Aligned");
                    break;
            }
        }
    }, [imageData])

    return imageValidity
    ? (<View style={styles.container}>
        <Text style={styles.title}>Image Validity</Text>
        <Text style={styles.text}>{imageValidity}</Text>
    </View>)
    : null;
}

const styles = StyleSheet.create({
    container: {
        height: 70,
        width: 160,
        padding: 5,
        backgroundColor: '#3D3734FF'
    },

    title: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 5
    },

    text: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center'
    }
});
