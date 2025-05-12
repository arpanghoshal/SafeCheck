import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import PhoneInput from 'react-native-phone-number-input';
import LottieView from 'lottie-react-native';

const PhoneAuthScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneInputValid, setPhoneInputValid] = useState(false);
  const [phoneInputRef, setPhoneInputRef] = useState(null);

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prevCountdown => prevCountdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phoneInputValid) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Firebase phone authentication
      const confirmation = await auth().signInWithPhoneNumber(formattedPhoneNumber);
      setVerificationId(confirmation);
      setVerificationSent(true);
      setCountdown(60); // 60 seconds cooldown
      
      Alert.alert('Code Sent', `Verification code has been sent to ${formattedPhoneNumber}`);
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      
      // Confirm the verification code
      await verificationId.confirm(verificationCode);
      
      // Check if user exists in Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(auth().currentUser.uid)
        .get();
      
      if (!userDoc.exists) {
        // Create new user record if this is their first login
        await firestore()
          .collection('users')
          .doc(auth().currentUser.uid)
          .set({
            phoneNumber: formattedPhoneNumber,
            createdAt: firestore.FieldValue.serverTimestamp(),
            preferences: {
              notificationsEnabled: true,
              notifyOnNegative: true,
              notifyOnNoResponse: true
            }
          });
      }
      
      // Navigation will be handled automatically by the auth state listener
    } catch (error) {
      console.error('Error verifying code:', error);
      
      let errorMessage = 'Failed to verify code.';
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'The verification code is invalid. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'The verification code has expired. Please request a new one.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    if (countdown === 0) {
      handleSendCode();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>SafeCheck</Text>
            <LottieView
              source={require('../assets/animations/phone-verification.json')}
              autoPlay
              loop
              style={styles.animation}
            />
            <Text style={styles.subtitle}>
              {verificationSent
                ? 'Enter the verification code sent to your phone'
                : 'Enter your phone number to get started'}
            </Text>
          </View>
          
          {!verificationSent ? (
            // Phone Number Input
            <View style={styles.inputContainer}>
              <PhoneInput
                ref={ref => setPhoneInputRef(ref)}
                defaultValue={phoneNumber}
                defaultCode="US"
                layout="first"
                onChangeText={text => {
                  setPhoneNumber(text);
                }}
                onChangeFormattedText={text => {
                  setFormattedPhoneNumber(text);
                  setPhoneInputValid(text.length >= 8);
                }}
                containerStyle={styles.phoneInputContainer}
                textContainerStyle={styles.phoneInputTextContainer}
                withDarkTheme={false}
                withShadow={true}
                autoFocus
              />
              
              <Button
                mode="contained"
                onPress={handleSendCode}
                style={styles.actionButton}
                loading={loading}
                disabled={loading || !phoneInputValid}
              >
                Send Verification Code
              </Button>
            </View>
          ) : (
            // Verification Code Input
            <View style={styles.inputContainer}>
              <TextInput
                label="Verification Code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                style={styles.codeInput}
                mode="outlined"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              
              <Button
                mode="contained"
                onPress={handleVerifyCode}
                style={styles.actionButton}
                loading={loading}
                disabled={loading || verificationCode.length < 6}
              >
                Verify Code
              </Button>
              
              <TouchableOpacity 
                onPress={handleResendCode}
                style={styles.resendContainer}
                disabled={countdown > 0}
              >
                <Text style={[
                  styles.resendText,
                  countdown > 0 && styles.resendTextDisabled
                ]}>
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 16,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  phoneInputContainer: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 8,
  },
  phoneInputTextContainer: {
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  codeInput: {
    marginBottom: 16,
    fontSize: 18,
    letterSpacing: 4,
  },
  actionButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    color: '#2196F3',
    fontSize: 16,
  },
  resendTextDisabled: {
    color: '#bdbdbd',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: '#2196F3',
  },
});

export default PhoneAuthScreen; 