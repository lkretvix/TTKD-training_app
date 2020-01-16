import React, {useState, useRef, useEffect, useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {withNavigationFocus} from 'react-navigation';
import {HeaderBackButton} from 'react-navigation-stack';

import {addRecordedVideo} from './../redux/actions';

const ReactCamera = props => {
  const dispatch = useDispatch();

  const {isFocused, navigation} = props;
  const contentId = navigation.getParam('contentId');
  const maxLength = navigation.getParam('maxLength');
  const shouldCancelVideo = navigation.getParam('shouldCancelVideo');

  const [countdown, setCountdown] = useState(5);
  const [shouldShowCountdown, setShouldShowCountdown] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);

  // Handles Countdown and Setting Recording
  useEffect(() => {
    if (shouldShowCountdown && countdown === 5) {
      let methodCountdown = 5;
      const newIntervalId = setInterval(() => {
        methodCountdown--;
        setCountdown(methodCountdown);
        if (!methodCountdown) {
          setShouldShowCountdown(false);
          clearInterval(newIntervalId);
          setRecording(true);
        }
      }, 1000);
    }
  }, [shouldShowCountdown, countdown]);
  // Handles starting recording
  useEffect(() => {
    if (recording === true) {
      startRecording();
    }
  }, [recording, startRecording]);

  // Handles stopping video if back button is pressed
  useEffect(() => {
    if (recording) {
      shouldCancelVideo &&
        cameraRef.current &&
        cameraRef.current.stopRecording();
    } else {
      shouldCancelVideo && navigation.goBack();
    }
  }, [shouldCancelVideo, navigation, recording]);

  // Handles dispatching video and navigation once recording is stopped
  useEffect(() => {
    if (recordedVideo) {
      if (!shouldCancelVideo) {
        dispatch(addRecordedVideo({...recordedVideo, contentId}));
        navigation.navigate('VideoWithControls', {
          recordedVideo: recordedVideo,
          contentId: contentId,
        });
      } else {
        navigation.goBack();
      }
    }
  }, [shouldCancelVideo, recordedVideo, contentId, dispatch, navigation]);

  const startRecording = useCallback(async () => {
    // default to mp4 for android as codec is not set
    try {
      if (cameraRef.current) {
        const video = await cameraRef.current.recordAsync({
          mute: true,
          maxDuration: maxLength,
        });

        setRecording(false);
        setRecordedVideo(video);
      }
    } catch (e) {
      console.error('Recording Failed', e);
    }
  }, [maxLength]);

  const button = (
    <TouchableOpacity
      onPress={() => setShouldShowCountdown(true)}
      style={styles.capture}>
      <Text style={styles.text}> RECORD </Text>
    </TouchableOpacity>
  );

  const cameraRef = useRef(null);

  return (
    isFocused && (
      <View style={styles.container}>
        <RNCamera
          ref={cameraRef}
          style={styles.preview}
          type={RNCamera.Constants.Type.back}
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
        {!recording && !shouldShowCountdown && (
          <View style={styles.button}>{button}</View>
        )}
        {shouldShowCountdown && (
          <View style={styles.countdown}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>
    )
  );
};

ReactCamera.navigationOptions = ({navigation}) => {
  return {
    title: 'Recording',
    headerLeft: () => (
      <HeaderBackButton
        tintColor="white"
        onPress={() => navigation.setParams({shouldCancelVideo: true})}
      />
    ),
  };
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
  button: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  countdown: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  countdownText: {fontSize: 75, color: 'red'},
  text: {
    fontSize: 14,
  },
});
