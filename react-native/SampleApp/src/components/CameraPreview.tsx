import { CameraPreviewView, useImages } from "biosensesignal-react-native-sdk";
import React, { useState } from "react";
import { Image, LayoutChangeEvent, LayoutRectangle, PixelRatio, StyleSheet, View } from 'react-native'


export const CameraPreview = () => {
    const [previewSize, setPreviewSize] = useState({x: 0, y: 0, width: 0, height: 0} as LayoutRectangle)
    const onLayout = (event: LayoutChangeEvent) => {
        setPreviewSize(event.nativeEvent.layout);
    };

    return (
        <View style={styles.container} onLayout={onLayout}>
                <CameraPreviewView style={styles.preview} />
                <Image source={require('../../assets/rppg_video_mask.png')} style={styles.image} />
                <FaceDetection previewSize={previewSize} />
        </View>
      );
};

const FaceDetection = (props: {previewSize: LayoutRectangle}) => {
    const imageData = useImages();
    if (!imageData) {
        return null;
    }
    
    const roi = imageData.captureData?.face.roi;
    if (!roi) {
        return null;
    }

    const devicePixelRatio = PixelRatio.get();
    const widthFactor = props.previewSize.width / (imageData.imageWidth / devicePixelRatio);
    const heightFactor = props.previewSize.height / (imageData.imageHeight / devicePixelRatio);  
    const left = (roi.left * widthFactor) / devicePixelRatio;
    const top = (roi.top * heightFactor) / devicePixelRatio;
    const width = (roi.width * widthFactor) / devicePixelRatio;
    const height = (roi.height * heightFactor) / devicePixelRatio;
    
    return <View style={{...styles.faceDetection, ...{ width: width, height: height, left: left, top: top, position:'absolute'}}}/>
}

const styles = StyleSheet.create({
    container: {
        aspectRatio: 0.75,
        width: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    preview: {
        flex: 1,
    },
    faceDetection: {
        position: 'absolute',
        backgroundColor: 'none', 
        borderColor: '#0653F4', 
        borderWidth: 4
    },
});
