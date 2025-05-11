import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

// Navigation
import AppNavigator from './navigation/AppNavigator';
import PhoneAuthScreen from './screens/PhoneAuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';

// Firebase config
import firebaseConfig from './config/firebase';

// Custom theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976D2',
    accent: '#03A9F4',
    background: '#F5F5F7',
    surface: '#FFFFFF',
    text: '#212121',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    disabled: '#E0E0E0',
    error: '#D32F2F',
    notification: '#FF9800',
    onSurface: '#212121',
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
};

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Handle user auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    // Check if user has seen onboarding
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@safecheck_onboarding_complete');
        setHasSeenOnboarding(value === 'true');
      } catch (error) {
        console.log('Error checking onboarding status:', error);
      }
    };
    
    checkOnboarding();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Loading state
  if (initializing) {
    return null; // Consider adding a splash screen or loader here
  }

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@safecheck_onboarding_complete', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  };

  // Render either onboarding, auth screen, or main app based on state
  const renderScreen = () => {
    if (user) {
      // User is logged in, show the main app
      return <AppNavigator />;
    } else if (!hasSeenOnboarding) {
      // User hasn't seen onboarding yet
      return <OnboardingScreen onComplete={completeOnboarding} />;
    } else {
      // User has seen onboarding but isn't logged in
      return <PhoneAuthScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          {renderScreen()}
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
} 