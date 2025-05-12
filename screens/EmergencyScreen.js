import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Header from '../components/Header';

const handleEmergency = async () => {
  try {
    setLoading(true);
    const userId = auth().currentUser.uid;
    
    // Get user's contacts
    const contactsSnapshot = await firestore()
      .collection('contacts')
      .where('userId', '==', userId)
      .get();

    const contacts = contactsSnapshot.docs.map(doc => doc.data());
    
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Please add emergency contacts before using this feature.');
      return;
    }

    // Create emergency record
    await firestore()
      .collection('emergencies')
      .add({
        userId,
        status: 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
        contacts: contacts.map(contact => contact.id)
      });

    Alert.alert('Emergency Alert Sent', 'Your emergency contacts have been notified.');
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    Alert.alert('Error', 'Failed to send emergency alert');
  } finally {
    setLoading(false);
  }
}; 