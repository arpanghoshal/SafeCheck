import NetInfo from '@react-native-community/netinfo';
import * as SMS from 'expo-sms';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const QUEUE_KEY = 'safecheck_offline_queue';
const MAX_RETRY_ATTEMPTS = 3;

// Check if network is connected
export const isConnected = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};

// Check if SMS is available on the device
export const isSMSAvailable = async () => {
  const isAvailable = await SMS.isAvailableAsync();
  return isAvailable;
};

// Send a message (tries push notification, falls back to SMS if offline)
export const sendMessage = async (recipient, title, body, data = {}) => {
  try {
    // First check if the device is online
    const connected = await isConnected();
    
    if (connected) {
      // Device is online, try to send push notification
      return await sendPushNotification(recipient.expoPushToken, title, body, data);
    } else {
      // Device is offline, check if SMS is available
      const smsAvailable = await isSMSAvailable();
      
      if (smsAvailable && recipient.phoneNumber) {
        // Send via SMS
        return await sendSMS(recipient.phoneNumber, `${title}: ${body}`);
      } else {
        // Queue the message for later delivery
        await queueMessageForLater(recipient, title, body, data);
        throw new Error('Device offline and SMS not available. Message queued for later delivery.');
      }
    }
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Send a push notification
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  // This function should call your existing push notification service
  // In a real implementation, you might need to import your existing function
  // For this example, we'll assume a simple implementation
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    // Here you would use your existing push notification service
    // This is a placeholder - you should integrate with your actual notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Send an SMS message
export const sendSMS = async (phoneNumber, message) => {
  try {
    const { result } = await SMS.sendSMSAsync([phoneNumber], message);
    return result === 'sent';
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

// Queue a message for later delivery when the device comes back online
export const queueMessageForLater = async (recipient, title, body, data = {}) => {
  try {
    // Get the current queue
    const queueString = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueString ? JSON.parse(queueString) : [];
    
    // Add the new message to the queue
    queue.push({
      recipient,
      title,
      body,
      data,
      timestamp: Date.now(),
      attempts: 0,
    });
    
    // Save the updated queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    return true;
  } catch (error) {
    console.error('Error queueing message:', error);
    throw error;
  }
};

// Process the queue when the device comes back online
export const processQueue = async () => {
  try {
    // First check if we're online
    const connected = await isConnected();
    
    if (!connected) {
      console.log('Device still offline, cannot process queue');
      return;
    }
    
    // Get the current queue
    const queueString = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueString) {
      return; // No queue to process
    }
    
    const queue = JSON.parse(queueString);
    if (queue.length === 0) {
      return; // Empty queue
    }
    
    // Process each item in the queue
    const updatedQueue = [];
    
    for (const item of queue) {
      try {
        // Try to send the message via push notification
        await sendPushNotification(
          item.recipient.expoPushToken,
          item.title,
          item.body,
          item.data
        );
        
        // Message sent successfully, don't add back to queue
      } catch (error) {
        // Failed to send the message
        item.attempts += 1;
        
        // If we haven't exceeded max retry attempts, keep in queue
        if (item.attempts < MAX_RETRY_ATTEMPTS) {
          updatedQueue.push(item);
        }
      }
    }
    
    // Save the updated queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    
    return true;
  } catch (error) {
    console.error('Error processing message queue:', error);
    throw error;
  }
};

// Set up a network connectivity listener
export const setupNetworkListener = (onConnected, onDisconnected) => {
  return NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      // We're back online
      if (onConnected) onConnected();
      processQueue(); // Process any queued messages
    } else {
      // We're offline
      if (onDisconnected) onDisconnected();
    }
  });
}; 