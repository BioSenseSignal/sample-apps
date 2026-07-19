import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/ui/camera_preview_view.dart';
import 'package:biosensesignal_flutter_sdk/images/image_data.dart'
    as sdk_image_data;

import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:focus_detector/focus_detector.dart';
import 'package:provider/provider.dart';
import 'package:sample_app/measurement_model.dart';
import 'package:sample_app/widget_size.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => MeasurementModel(),
      child: const MaterialApp(
        home: SafeArea(child: MeasurementScreen()),
      ),
    );
  }
}

class MeasurementScreen extends StatelessWidget {
  const MeasurementScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var warning =
        context.select<MeasurementModel, String?>((model) => model.warning);
    var error =
        context.select<MeasurementModel, String?>((model) => model.error);
    var finalResults = context
        .select<MeasurementModel, String?>((model) => model.finalResultsString);

    if (warning != null) {
      Fluttertoast.showToast(
          msg: warning,
          toastLength: Toast.LENGTH_SHORT,
          textColor: Colors.white);
    }

    if (error != null) {
      showAlert(context, null, error);
    }

    if (finalResults != null) {
      showAlert(context, "Final Results", finalResults);
    }

    return FocusDetector(
        onFocusLost: () {
          context.read<MeasurementModel>().screenInFocus(false);
        },
        onFocusGained: () {
          context.read<MeasurementModel>().screenInFocus(true);
        },
        child: Scaffold(
            body: Column(children: [
          Expanded(
              child: Stack(children: [
            const _CameraPreview(),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(bottom: 20),
              child: const Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _ImageValidity(),
                    SizedBox(
                      height: 30,
                    ),
                    _PulseRate(),
                    SizedBox(
                      height: 30,
                    ),
                    _StartStopButton(),
                  ]),
            )
          ])),
        ])));
  }

  void showAlert(BuildContext context, String? title, String message) {
    Future.delayed(Duration.zero, () {
      if (context.mounted) {
      showDialog(
        context: context,
        builder: (BuildContext context) => AlertDialog(
          title: title != null ? Text(title) : null,
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, 'OK'),
              child: const Text('OK'),
            ),
            ],
          ),
        );
      }
    });
  }
}

class _CameraPreview extends StatefulWidget {
  const _CameraPreview({Key? key}) : super(key: key);

  @override
  _CameraPreviewState createState() => _CameraPreviewState();
}

class _CameraPreviewState extends State<_CameraPreview> {
  Size? size;

  @override
  Widget build(BuildContext context) {
    var sessionState = context
        .select<MeasurementModel, SessionState?>((model) => model.sessionState);
    if (sessionState == null || sessionState == SessionState.initializing) {
      return Container();
    }

    return WidgetSize(
        onChange: (size) => setState(() {
              this.size = size;
            }),
        child: SizedBox(
            width: double.infinity,
            child: AspectRatio(
                aspectRatio: 0.75,
                child: Stack(children: [
                  Stack(
                    children: <Widget>[
                      const CameraPreviewView(),
                      Image.asset('assets/images/rppg_video_mask.png'),
                      _FaceDetectionView(size: size)
                    ],
                  ),
                ]))));
  }
}

class _FaceDetectionView extends StatelessWidget {
  final Size? size;

  const _FaceDetectionView({Key? key, required this.size}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var imageInfo = context.select<MeasurementModel, sdk_image_data.ImageData?>(
        (model) => model.imageData);
    if (imageInfo == null) {
      return Container();
    }

    var roi = imageInfo.captureData?.face.roi;
    if (roi == null) {
      return Container();
    }

    var devicePixelRatio = MediaQuery.of(context).devicePixelRatio;
    var widthFactor = size!.width / (imageInfo.imageWidth / devicePixelRatio);
    var heightFactor =
        size!.height / (imageInfo.imageHeight / devicePixelRatio);
    return Positioned(
        left: (roi.left * widthFactor) / devicePixelRatio,
        top: (roi.top * heightFactor) / devicePixelRatio,
        child: Container(
            decoration: BoxDecoration(
              color: Colors.transparent,
              border: Border.all(width: 4, color: const Color(0xff0653F4)),
              borderRadius: BorderRadius.circular(5),
            ),
            width: (roi.width * widthFactor) / devicePixelRatio,
            height: (roi.height * heightFactor) / devicePixelRatio));
  }
}

class _StartStopButton extends StatelessWidget {
  const _StartStopButton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var state = context
        .select<MeasurementModel, SessionState?>((model) => model.sessionState);
    var opacity =
        (state == SessionState.ready || state == SessionState.processing)
            ? 1.0
            : 0.5;

    return Opacity(
        opacity: opacity,
        child: InkWell(
            child: Container(
              width: 100,
              padding: const EdgeInsets.only(top: 20, bottom: 20),
              height: 60,
              alignment: Alignment.center,
              color: const Color(0xFF6200EE),
              child: Text(
                state == SessionState.processing ? "STOP" : "START",
                style: const TextStyle(color: Colors.white),
              ),
            ),
            onTap: () {
              var measurementModel =
                  Provider.of<MeasurementModel>(context, listen: false);
              measurementModel.startStopButtonClicked();
            }));
  }
}

class _PulseRate extends StatelessWidget {
  const _PulseRate({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var pulseRate =
        context.select<MeasurementModel, String?>((model) => model.pulseRate);
    return Text(pulseRate ?? "",
        style: const TextStyle(color: Colors.black, fontSize: 26));
  }
}

class _ImageValidity extends StatelessWidget {
  const _ImageValidity({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var showImageValidity = context
        .select<MeasurementModel, bool>((model) => model.showImageValidity);
    var imageValidityString = context
        .select<MeasurementModel, String>((model) => model.imageValidityString);

    return Center(
      child: Visibility(
        visible: showImageValidity,
        child: Container(
            color: const Color(0xFF3D3734),
            padding: const EdgeInsets.all(5.0),
            width: 180,
            child: Column(
              children: [
                const Text(
                  "Image Validity",
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15),
                ),
                const SizedBox(
                  height: 5,
                ),
                Text(
                  imageValidityString,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                )
              ],
            )),
      ),
    );
  }
}
