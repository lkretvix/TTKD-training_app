import React, {useState, useRef, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {
  StyleSheet,
  View,
  Dimensions,
  TouchableWithoutFeedback,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {withNavigationFocus} from 'react-navigation';
import {HeaderBackButton} from 'react-navigation-stack';

import Video from 'react-native-video';

import Controls from './Controls';
import {
  getContentOwnStepsSorted,
  getContentOwnVideoUri,
  getContentOwnCachedVideoPath,
} from '../../redux/selectors';
import {genCachedUri} from '../../redux/actions';
import {PROGRESS_BAR_WIDTH} from './constants';

const DEFAULT_SPEED = 1.0;
const BASE_URI = 'https://ttkd-test-s3.s3.amazonaws.com/ttkd';

const VideoWithControls = props => {
  const dispatch = useDispatch();

  /////////// Props/Navigation access////////////////
  const contentId =
    (props.navigation && props.navigation.getParam('contentId')) ||
    props.contentId;
  const recordedVideo =
    props.navigation && props.navigation.getParam('recordedVideo');

  ////////////////// Selector Access /////////////////////
  const steps = useSelector(state =>
    getContentOwnStepsSorted(state, contentId),
  );
  const contentVideoUri = useSelector(state =>
    getContentOwnVideoUri(state, contentId),
  );
  const cachedVideoPath = useSelector(state =>
    getContentOwnCachedVideoPath(state, contentId),
  );

  //////////////// State ////////////////////////
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(DEFAULT_SPEED);
  const [loading, setLoading] = useState(true);

  //Remove and do it a better way
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  ///////////////////// Effects /////////////////////
  useEffect(() => {
    Array.isArray(steps) &&
      steps.length &&
      flatListRef.current &&
      flatListRef.current.scrollToIndex({index: currentStepIndex});
  }, [steps, currentStepIndex]);

  useEffect(() => {
    !cachedVideoPath &&
      dispatch(genCachedUri(contentId, BASE_URI, contentVideoUri));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!props.isFocused) {
      setPaused(true);
    }
  }, [props.isFocused]);

  ////////////////// Helper Methods ////////////////////

  const handleLoad = meta => {
    // Should be removed when video_length is added to db schema
    setDuration(meta.duration);
    props.setVideoLength && props.setVideoLength(meta.duration);

    setLoading(false);
    console.info('Finished loading');
  };

  const handlePlayPausePress = () => {
    progress >= 1 && Object.values(videoRefs).map(ref => ref.current.seek(0));
    setPaused(!paused);
  };

  const handleProgress = curProgress => {
    loading && setLoading(false);
    setProgress(curProgress.currentTime / duration);
  };

  const handleEnd = () => {
    setPaused(true);
    setProgress(1);
  };

  const handleStepPress = stepTime =>
    Object.values(videoRefs).map(ref => ref.current.seek(stepTime));

  const {width} = Dimensions.get('window');
  const videoHeight = width * 0.5265;
  const fullHeight = recordedVideo ? videoHeight * 2 : videoHeight;

  const recordedVideoRef = useRef();
  const videoRefs = {
    contentVideoRef: useRef(),
    ...(recordedVideo ? {recordedVideoRef: recordedVideoRef} : {}),
  };
  const flatListRef = useRef();

  ///////////////////////////// Render Code //////////////////////////////

  const renderSteps = (
    <View style={styles.steps}>
      <FlatList
        onScrollToIndexFailed={error => {
          console.info('onScrollToIndex failed', error);
        }}
        ref={flatListRef}
        data={steps}
        keyExtractor={step => `${step.id}`}
        renderItem={({item, index}) => {
          const progressSeconds = Math.round(progress * duration);
          const isCurrentStep =
            (!item.start_time || item.start_time <= progressSeconds) &&
            (!item.end_time || item.end_time > progressSeconds);
          isCurrentStep &&
            index !== currentStepIndex &&
            setCurrentStepIndex(index);
          return (
            <TouchableOpacity
              onPress={() => handleStepPress(item.start_time || 0)}>
              <View
                style={[
                  styles.step,
                  isCurrentStep ? styles.currentStep : null,
                ]}>
                <Text style={styles.stepText}>
                  {`${index + 1}: ${item.description}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Videos */}
      <View style={{height: fullHeight, ...styles.video}}>
        <TouchableWithoutFeedback onPress={handlePlayPausePress}>
          <View>
            {recordedVideo && (
              <Video
                source={recordedVideo}
                paused={paused}
                rate={rate}
                resizeMode="contain"
                ref={videoRefs.recordedVideoRef}
                style={{height: videoHeight, ...styles.video}}
              />
            )}
            {cachedVideoPath && (
              <Video
                source={{
                  uri: cachedVideoPath,
                }}
                paused={paused}
                rate={rate}
                // Because we are downloading and caching videos, there should realistically
                // never be a time where the video needs to buffer
                // onBuffer={() => {
                //   console.info('Loading!');
                //   setLoading(true);
                // }}
                // bufferConfig={{
                //   minBufferMs: 15000,
                //   maxBufferMs: 50000,
                //   bufferForPlaybackMs: 2500,
                //   bufferForPlaybackAfterRebufferMs: 5000,
                // }}
                resizeMode="contain"
                onLoad={handleLoad}
                onError={e => console.info('Error on Video', e)}
                onProgress={handleProgress}
                onEnd={handleEnd}
                ref={videoRefs.contentVideoRef}
                style={{height: videoHeight, ...styles.video}}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
      <Controls
        videoRefs={videoRefs}
        paused={paused}
        handlePlayPausePress={handlePlayPausePress}
        duration={duration}
        progress={progress}
        rate={rate}
        setRate={setRate}
      />
      {renderSteps}
      {/* Loading Indicator */}
      <ActivityIndicator
        style={{top: fullHeight / 2 - 16, ...styles.activityIndicator}}
        animating={loading}
        size="large"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
  },

  steps: {
    height: 50,
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
  },
  step: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentStep: {
    backgroundColor: '#C4BBBB',
  },
  stepText: {
    fontSize: 16,
  },
  activityIndicator: {
    position: 'absolute',
  },
});

VideoWithControls.navigationOptions = ({navigation}) => {
  return {
    headerLeft: (
      <HeaderBackButton
        tintColor="white"
        onPress={() => navigation.navigate('Content')}
      />
    ),
  };
};

export default withNavigationFocus(VideoWithControls);
