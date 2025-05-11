import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, List, Switch, Button, Divider, Dialog, Portal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Header from '../components/Header';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyOnNegative, setNotifyOnNegative] = useState(true);
  const [notifyOnNoResponse, setNotifyOnNoResponse] = useState(true);
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  useEffect(() => {
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        const preferences = data.preferences || {};
        
        setNotificationsEnabled(preferences.notificationsEnabled !== false); // Default to true
        setNotifyOnNegative(preferences.notifyOnNegative !== false); // Default to true
        setNotifyOnNoResponse(preferences.notifyOnNoResponse !== false); // Default to true
        setUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const saveUserPreferences = async (key, value) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const userRef = firestore().collection('users').doc(user.uid);
      
      await userRef.set({
        preferences: {
          ...userPreferences,
          [key]: value
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const handleToggleNotifications = (value) => {
    setNotificationsEnabled(value);
    saveUserPreferences('notificationsEnabled', value);
  };

  const handleToggleNegativeNotifications = (value) => {
    setNotifyOnNegative(value);
    saveUserPreferences('notifyOnNegative', value);
  };

  const handleToggleNoResponseNotifications = (value) => {
    setNotifyOnNoResponse(value);
    saveUserPreferences('notifyOnNoResponse', value);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      
      const user = auth().currentUser;
      
      // Get the user's current credential
      const credential = auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      // Re-authenticate
      await user.reauthenticateWithCredential(credential);
      
      // Change password
      await user.updatePassword(newPassword);
      
      setPasswordDialogVisible(false);
      Alert.alert('Success', 'Your password has been updated.');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      
      let errorMessage = 'Failed to update password.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'The current password you entered is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The new password is too weak.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      // Navigation will handle redirection based on auth state
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" />
      
      <ScrollView style={styles.scrollView}>
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          
          <List.Item
            title="Enable Notifications"
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
              />
            )}
          />
          
          <List.Item
            title="Notify on Negative Responses"
            description="Get notified immediately when someone responds NO"
            right={() => (
              <Switch
                value={notifyOnNegative}
                onValueChange={handleToggleNegativeNotifications}
                disabled={!notificationsEnabled}
              />
            )}
          />
          
          <List.Item
            title="Notify on No Response"
            description="Get notified if someone doesn't respond within 4 hours"
            right={() => (
              <Switch
                value={notifyOnNoResponse}
                onValueChange={handleToggleNoResponseNotifications}
                disabled={!notificationsEnabled}
              />
            )}
          />
        </List.Section>
        
        <Divider />
        
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="Change Password"
            description="Update your account password"
            left={props => <List.Icon {...props} icon="lock" />}
            onPress={() => setPasswordDialogVisible(true)}
          />
          
          <List.Item
            title="Sign Out"
            description="Sign out of your account"
            left={props => <List.Icon {...props} icon="logout" />}
            onPress={handleSignOut}
          />
        </List.Section>
        
        <Divider />
        
        <List.Section>
          <List.Subheader>About</List.Subheader>
          
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield" />}
            onPress={() => {/* Navigate to privacy policy */}}
          />
          
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => {/* Navigate to terms of service */}}
          />
        </List.Section>
      </ScrollView>
      
      <Portal>
        <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)}>
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              style={styles.dialogInput}
              mode="outlined"
            />
            
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={styles.dialogInput}
              mode="outlined"
            />
            
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.dialogInput}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleChangePassword} loading={loading} disabled={loading}>
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  dialogInput: {
    marginBottom: 12,
  },
});

export default SettingsScreen; 