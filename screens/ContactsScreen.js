import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Header from '../components/Header';

const fetchContacts = async () => {
  try {
    setLoading(true);
    const userId = auth().currentUser.uid;
    
    const contactsSnapshot = await firestore()
      .collection('contacts')
      .where('userId', '==', userId)
      .get();

    const contacts = contactsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setContacts(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
  } finally {
    setLoading(false);
  }
};

const deleteContact = async (contactId) => {
  try {
    await firestore()
      .collection('contacts')
      .doc(contactId)
      .delete();
    
    setContacts(prev => prev.filter(contact => contact.id !== contactId));
  } catch (error) {
    console.error('Error deleting contact:', error);
    Alert.alert('Error', 'Failed to delete contact');
  }
};

const addContact = async (contactData) => {
  try {
    const userId = auth().currentUser.uid;
    
    await firestore()
      .collection('contacts')
      .add({
        ...contactData,
        userId,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
    
    fetchContacts();
  } catch (error) {
    console.error('Error adding contact:', error);
    Alert.alert('Error', 'Failed to add contact');
  }
}; 