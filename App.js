import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Navigation
import AppNavigator from './navigation/AppNavigator';
import PhoneAuthScreen from './screens/PhoneAuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';

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

// Enable offline persistence
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
});

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Background task for location updates
const LOCATION_TASK_NAME = 'background-location-task';
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Handle location updates
    console.log('Received background location:', locations);
  }
});

const Stack = createStackNavigator();

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();

  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('onboardingComplete');
        setOnboardingComplete(value === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    // Register for push notifications
    const registerForPushNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }
        
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setPushToken(token);
        
        // Save token to Firestore if user is logged in
        if (user) {
          await firestore()
            .collection('users')
            .doc(user.uid)
            .update({
              pushToken: token,
              updatedAt: firestore.FieldValue.serverTimestamp()
            });
        }
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      
      // Handle different notification types
      switch (data.type) {
        case 'checkIn':
          // Handle check-in notification
          break;
        case 'emergency':
          // Handle emergency notification
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Handle notification response
      switch (data.type) {
        case 'checkIn':
          // Navigate to check-in screen
          navigation.navigate('EnhancedRespond', { checkInId: data.checkInId });
          break;
        case 'emergency':
          // Navigate to emergency screen
          navigation.navigate('EmergencyDetails', { emergencyId: data.emergencyId });
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    });

    // Set up auth state listener
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        await registerForPushNotifications();
      }
      setLoading(false);
    });

    checkOnboarding();

    // Cleanup
    return () => {
      unsubscribe();
      notificationListener.current.remove();
      responseListener.current.remove();
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              // Auth Stack
              <Stack.Screen name="Auth" component={AuthNavigator} />
            ) : !onboardingComplete ? (
              // Onboarding Stack
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : (
              // Main App Stack
              <Stack.Screen name="Main" component={MainNavigator} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;

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
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId
    })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
} 
} 