import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPhoneOnly, setIsPhoneOnly] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    checkInReminders: true,
    emergencyAlerts: true,
    locationSharing: true,
    autoCheckIn: false,
    checkInInterval: 3, // hours
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        await checkAuthMethod(user);
        await loadUserPreferences(user.uid);
        await loadProfileImage(user.uid);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const checkAuthMethod = async (user) => {
    const userDoc = await firestore().collection('users').doc(user.uid).get();
    setIsPhoneOnly(userDoc.data()?.authMethod === 'phone');
  };

  const loadUserPreferences = async (userId) => {
    try {
      const prefsDoc = await firestore().collection('userPreferences').doc(userId).get();
      if (prefsDoc.exists) {
        setUserPreferences(prefsDoc.data());
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadProfileImage = async (userId) => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      setProfileImage(userDoc.data()?.profileImageUrl);
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const updatePreference = async (key, value) => {
    try {
      const newPreferences = { ...userPreferences, [key]: value };
      await firestore()
        .collection('userPreferences')
        .doc(user.uid)
        .set(newPreferences, { merge: true });
      setUserPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    }
  };

  const handleProfileImageUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setLoading(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const storageRef = storage().ref(`profile_images/${user.uid}.jpg`);
        
        await storageRef.put(blob);
        const downloadUrl = await storageRef.getDownloadURL();
        
        await firestore().collection('users').doc(user.uid).update({
          profileImageUrl: downloadUrl
        });
        
        setProfileImage(downloadUrl);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image. Please try again.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const renderPreferenceItem = (title, key, value, onValueChange) => (
    <View style={styles.preferenceItem}>
      <Text style={styles.preferenceTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#1976D2' : '#f4f3f4'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleProfileImageUpdate}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={40} color="#757575" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {renderPreferenceItem(
          'Enable Notifications',
          'notificationsEnabled',
          notificationsEnabled,
          (value) => setNotificationsEnabled(value)
        )}
        {renderPreferenceItem(
          'Check-in Reminders',
          'checkInReminders',
          userPreferences.checkInReminders,
          (value) => updatePreference('checkInReminders', value)
        )}
        {renderPreferenceItem(
          'Emergency Alerts',
          'emergencyAlerts',
          userPreferences.emergencyAlerts,
          (value) => updatePreference('emergencyAlerts', value)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        {renderPreferenceItem(
          'Enable Location',
          'locationEnabled',
          locationEnabled,
          (value) => setLocationEnabled(value)
        )}
        {renderPreferenceItem(
          'Location Sharing',
          'locationSharing',
          userPreferences.locationSharing,
          (value) => updatePreference('locationSharing', value)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Check-ins</Text>
        {renderPreferenceItem(
          'Auto Check-in',
          'autoCheckIn',
          userPreferences.autoCheckIn,
          (value) => updatePreference('autoCheckIn', value)
        )}
        <TouchableOpacity
          style={styles.checkInIntervalButton}
          onPress={() => {
            Alert.alert(
              'Check-in Interval',
              'Select interval',
              [
                { text: '1 hour', onPress: () => updatePreference('checkInInterval', 1) },
                { text: '3 hours', onPress: () => updatePreference('checkInInterval', 3) },
                { text: '6 hours', onPress: () => updatePreference('checkInInterval', 6) },
                { text: '12 hours', onPress: () => updatePreference('checkInInterval', 12) },
                { text: '24 hours', onPress: () => updatePreference('checkInInterval', 24) },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.checkInIntervalText}>
            Check-in Interval: {userPreferences.checkInInterval} hours
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#757575" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        {renderPreferenceItem(
          'Dark Mode',
          'darkMode',
          darkMode,
          (value) => setDarkMode(value)
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  userPhone: {
    fontSize: 16,
    color: '#757575',
    marginTop: 5,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  preferenceTitle: {
    fontSize: 16,
  },
  checkInIntervalButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkInIntervalText: {
    fontSize: 16,
  },
  signOutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#FF5252',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 