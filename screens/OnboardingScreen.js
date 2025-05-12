import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Image, Animated } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();
  const scrollX = useRef(new Animated.Value(0)).current;

  const onboardingData = [
    {
      id: '1',
      title: 'Welcome to SafeCheck',
      description: 'A simple way to check on the safety and well-being of your loved ones.',
      animation: require('../assets/animations/welcome.json'),
    },
    {
      id: '2',
      title: 'Non-Intrusive Check-Ins',
      description: 'Send quick check-ins that recipients can respond to with a single tap.',
      animation: require('../assets/animations/check-in.json'),
    },
    {
      id: '3',
      title: 'Quick & Easy Responses',
      description: 'Respond with a tap, a photo, your location, or a voice message.',
      animation: require('../assets/animations/respond.json'),
    },
    {
      id: '4',
      title: 'Stay Connected',
      description: 'Get notified when your loved ones need help or haven\'t responded.',
      animation: require('../assets/animations/connected.json'),
    },
  ];

  // Auto-scroll to next screen every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentIndex < onboardingData.length - 1) {
        flatListRef.current.scrollToIndex({
          index: currentIndex + 1,
          animated: true,
        });
      }
    }, 8000);
    
    return () => clearInterval(timer);
  }, [currentIndex]);

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width
    ];
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp'
    });
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp'
    });
    
    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.animationContainer, { opacity, transform: [{ scale }] }]}>
          <LottieView
            source={item.animation}
            autoPlay
            loop
            style={styles.animation}
          />
        </Animated.View>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const Pagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {onboardingData.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { 
                  width: dotWidth,
                  opacity,
                  backgroundColor: index === currentIndex ? '#1976D2' : '#BDBDBD' 
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const handleComplete = async () => {
    try {
      const userId = auth().currentUser.uid;
      
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          onboardingCompleted: true,
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        scrollEventThrottle={16}
      />

      <Pagination />

      <View style={styles.buttonContainer}>
        <Button
          mode="text"
          onPress={handleSkip}
          labelStyle={styles.skipButton}
        >
          Skip
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
          labelStyle={styles.nextButtonLabel}
        >
          {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width,
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  animationContainer: {
    marginBottom: 20,
  },
  animation: {
    width: width * 0.8,
    height: width * 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: '#1976D2',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#757575',
    paddingHorizontal: 24,
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    height: 40,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  skipButton: {
    color: '#757575',
    fontSize: 16,
  },
  nextButton: {
    borderRadius: 8,
    backgroundColor: '#1976D2',
    elevation: 2,
  },
  nextButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen; 