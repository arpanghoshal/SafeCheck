import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { Asset } from 'expo-asset';

const LottieAnimation = ({ 
  source, 
  style, 
  autoPlay = true, 
  loop = true,
  speed = 1,
  onAnimationFinish,
  cacheKey
}) => {
  const [animation, setAnimation] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAnimation = async () => {
      try {
        // Load and cache the animation asset
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();

        if (isMounted) {
          setAnimation(asset);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading Lottie animation:', error);
      }
    };

    loadAnimation();

    return () => {
      isMounted = false;
    };
  }, [source]);

  if (!isLoaded) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <LottieView
        source={animation}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        onAnimationFinish={onAnimationFinish}
        cacheStrategy="strong"
        renderMode="AUTOMATIC"
        style={styles.animation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});

export default LottieAnimation; 