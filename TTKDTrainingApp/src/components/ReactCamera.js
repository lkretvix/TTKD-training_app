import React, {useState, useRef, useEffect, useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {withNavigationFocus} from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import Orientation from 'react-native-orientation-locker';

import ContentVideo from './VideoWithControls/ContentVideo';
import Countdown from './Countdown';
import {addRecordedVideo} from './../redux/actions';

const ReactCamera = props => {
  const dispatch = useDispatch();

  const {isFocused, navigation} = props;
  const contentId = navigation.getParam('contentId');

  const [recording, setRecording] = useState(false);
  const [shouldKeepVideo, setShouldKeepVideo] = useState(true);
  const [recordedVideo, setRecordedVideo] = useState(null);

  const [shouldShowCountdown, setShouldShowCountdown] = useState(false);
  const [frontCamera, setFrontCamera] = useState(true);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [maxDuration, setMaxDuration] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);

  // Ref to store previous recording state in order to prevent calling
  //  startRecording() more than once
  const prevRecording = useRef(false);
  const cameraRef = useRef();

  // Handles starting recording
  useEffect(() => {
    if (!prevRecording.current && recording === true) {
      startRecording();
    } else if (prevRecording.current && !recording) {
      if (shouldKeepVideo) {
        dispatch(addRecordedVideo({...recordedVideo, contentId}));
        navigation.navigate('VideoWithControls', {
          recordedVideo: recordedVideo,
          contentId: contentId,
        });
      } else {
        navigation.goBack();
      }
    }
    prevRecording.current = recording;
  }, [
    contentId,
    dispatch,
    navigation,
    recordedVideo,
    recording,
    shouldKeepVideo,
    startRecording,
  ]);

  useEffect(() => {
    isFocused && Orientation.lockToLandscape();
    !isFocused && Orientation.lockToPortrait();
    !isFocused && Orientation.unlockAllOrientations();
  }, [isFocused]);

  const backButtonPress = () => {
    if (recording) {
      setShouldKeepVideo(false);
      cameraRef.current && cameraRef.current.stopRecording();
    } else {
      navigation.goBack();
    }
  };

  const startRecording = useCallback(async () => {
    // default to mp4 for android as codec is not set
    try {
      if (cameraRef.current) {
        await cameraRef.current
          .recordAsync({
            mute: true,
            maxDuration: maxDuration,
          })
          .then(video => {
            setRecordedVideo(video);
          });

        setRecording(false);
      }
    } catch (e) {
      console.error('Recording Failed', e);
    }
  }, [maxDuration]);

  const handleLoad = response => {
    const maxDim = 300;
    const {duration, naturalSize} = response;
    const {height, width, orientation} = naturalSize;
    const isPortrait = orientation === 'portrait';

    const calcHeight = isPortrait
      ? maxDim
      : Math.round((height * maxDim) / width);
    const calcWidth = isPortrait
      ? Math.round((width * maxDim) / height)
      : maxDim;

    setMaxDuration(duration);
    setVideoHeight(calcHeight);
    setVideoWidth(calcWidth);
    setVideoLoaded(true);
    console.info('Finished loading');
  };

  const backButton = (
    <TouchableOpacity style={styles.backButton} onPress={backButtonPress}>
      <Icon name="md-arrow-back" size={24} color="rgb(255,255,255)" />
    </TouchableOpacity>
  );

  const swapCameraButton = (
    <TouchableOpacity
      style={styles.swapCameraButton}
      onPress={() => setFrontCamera(!frontCamera)}>
      <Icon name="md-sync" size={24} color="rgb(255,255,255)" />
    </TouchableOpacity>
  );

  const recordButton = (
    <View style={styles.button}>
      <TouchableOpacity
        onPress={() => setShouldShowCountdown(true)}
        disabled={!videoLoaded}
        style={{
          ...styles.capture,
          ...(videoLoaded ? null : styles.disabledButton),
        }}>
        <Text style={styles.text}> RECORD </Text>
      </TouchableOpacity>
    </View>
  );

  const countdown = (
    <View style={styles.countdown}>
      <Countdown
        countdownTime={5}
        countdownFinished={() => {
          setShouldShowCountdown(false);
          setRecording(true);
        }}
      />
    </View>
  );

  return (
    isFocused && (
      <View style={styles.container}>
        <RNCamera
          ref={cameraRef}
          style={styles.preview}
          type={
            frontCamera
              ? RNCamera.Constants.Type.front
              : RNCamera.Constants.Type.back
          }
          flashMode={RNCamera.Constants.FlashMode.off}
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'TTKD would like to access the Camera',
            buttonPositive: 'Ok',
            buttonNegative: 'Cancel',
          }}
          // androidRecordAudioPermissionOptions={{
          //   title: 'Permission to use audio recording',
          //   message: 'We need your permission to use your audio',
          //   buttonPositive: 'Ok',
          //   buttonNegative: 'Cancel',
          // }}
        />
        <View style={styles.video}>
          <ContentVideo
            contentId={contentId}
            paused={!recording}
            handleLoad={handleLoad}
            videoHeight={videoHeight}
            videoWidth={videoWidth}
          />
        </View>
        {backButton}
        {!shouldShowCountdown && !recording && (
          <React.Fragment>
            {swapCameraButton}
            {recordButton}
          </React.Fragment>
        )}
        {shouldShowCountdown && countdown}
      </View>
    )
  );
};

ReactCamera.navigationOptions = {
  headerShown: false,
};

export default withNavigationFocus(ReactCamera);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  disabledButton: {
    opacity: 0.3,
  },
  button: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
  },
  swapCameraButton: {
    position: 'absolute',
    transform: [{rotate: '90deg'}],
    top: 10,
    right: 20,
  },
  countdown: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  text: {
    fontSize: 14,
  },
});
