import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Portal, Modal, Text, ActivityIndicator, Chip } from 'react-native-paper';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Import network connectivity utilities
import { isConnected, sendMessage } from '../utils/networkConnectivity';

const EmergencyButton = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [networkStatus, setNetworkStatus] = useState(true);
  const [usingSMS, setUsingSMS] = useState(false);

  // Check network status on component mount and when visible
  useEffect(() => {
    if (modalVisible) {
      checkNetworkStatus();
    }
  }, [modalVisible]);

  const checkNetworkStatus = async () => {
    const connected = await isConnected();
    setNetworkStatus(connected);
    setUsingSMS(!connected);
  };

  const handleEmergencyPress = () => {
    setModalVisible(true);
    startCountdown();
  };

  const startCountdown = () => {
    let count = 5;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(timer);
        setModalVisible(false);
        sendEmergencyAlert();
      }
    }, 1000);
  };

  const sendEmergencyAlert = async () => {
    try {
      setLoading(true);
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission is required for emergency alerts.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Get all contacts
      const currentUser = auth().currentUser;
      const contactsRef = firestore().collection('contacts');
      const snapshot = await contactsRef
        .where('userId', '==', currentUser.uid)
        .get();
      
      const contacts = [];
      snapshot.forEach(doc => {
        contacts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      if (contacts.length === 0) {
        Alert.alert('Error', 'No emergency contacts found. Please add contacts first.');
        return;
      }
      
      // Create emergency alert
      const emergencyData = {
        userId: currentUser.uid,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        },
        timestamp: firestore.FieldValue.serverTimestamp(),
        status: 'active',
        contacts: contacts.map(c => c.id),
      };
      
      // Save to Firestore if online, otherwise save locally and sync later
      const emergencyRef = await firestore().collection('emergencies').add(emergencyData);
      
      // Get user info for notifications
      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const userData = userDoc.data();
      const userName = userData?.displayName || userData?.phoneNumber || 'Your contact';
      
      // Send notifications to all contacts using our network-aware utility
      const notificationPromises = contacts.map(async (contact) => {
        try {
          // Look up the contact's user information
          const contactUserDoc = await firestore().collection('users').doc(contact.contactId).get();
          
          if (contactUserDoc.exists) {
            const contactUserData = contactUserDoc.data();
            
            // Create the recipient object with both push token and phone number
            const recipient = {
              expoPushToken: contactUserData.pushToken,
              phoneNumber: contactUserData.phoneNumber
            };
            
            // Send the message with SMS fallback
            await sendMessage(
              recipient,
              'EMERGENCY ALERT',
              `${userName} needs help! Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`,
              {
                type: 'emergency',
                emergencyId: emergencyRef.id,
              }
            );
          }
        } catch (error) {
          console.error(`Error sending alert to contact ${contact.id}:`, error);
        }
      });
      
      try {
        await Promise.all(notificationPromises);
      } catch (error) {
        console.error('Some notifications may have failed:', error);
      }
      
      Alert.alert(
        'Emergency Alert Sent',
        networkStatus 
          ? 'Your emergency contacts have been notified with your location.' 
          : 'Your emergency contacts have been notified via SMS with your location.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        mode="contained"
        onPress={handleEmergencyPress}
        style={styles.emergencyButton}
        labelStyle={styles.emergencyButtonLabel}
        icon="alert"
        loading={loading}
        disabled={loading}
      >
        EMERGENCY
      </Button>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Emergency Alert</Text>
          <Text style={styles.modalText}>
            An emergency alert will be sent to all your contacts with your current location.
          </Text>
          
          {usingSMS && (
            <Chip 
              icon="message-text" 
              style={styles.smsChip}
              mode="outlined"
            >
              Using SMS (Offline Mode)
            </Chip>
          )}
          
          <Text style={styles.countdownText}>
            Sending in {countdown} seconds...
          </Text>
          <Button
            mode="outlined"
            onPress={() => setModalVisible(false)}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  emergencyButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 4,
  },
  emergencyButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
    lineHeight: 24,
  },
  countdownText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 24,
  },
  cancelButton: {
    width: '100%',
  },
  smsChip: {
    marginBottom: 16,
    backgroundColor: '#fff3e0',
  },
});

export default EmergencyButton; 