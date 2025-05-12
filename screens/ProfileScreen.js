import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Header from '../components/Header';

const fetchUserProfile = async () => {
  try {
    setLoading(true);
    const userId = auth().currentUser.uid;
    
    const userDoc = await firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      setProfile({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  } finally {
    setLoading(false);
  }
};

const updateProfile = async (updatedProfile) => {
  try {
    const userId = auth().currentUser.uid;
    
    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        ...updatedProfile,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    
    setProfile(updatedProfile);
    Alert.alert('Success', 'Profile updated successfully');
  } catch (error) {
    console.error('Error updating profile:', error);
    Alert.alert('Error', 'Failed to update profile');
  }
}; 