import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  PermissionsAndroid,
  Platform
} from 'react-native';
import { 
  Text, 
  Button, 
  ActivityIndicator, 
  Card, 
  IconButton,
  Chip,
  Portal,
  Dialog,
  TextInput,
  Surface
} from 'react-native-paper';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LottieView from 'lottie-react-native';
import MapView, { Marker } from 'react-native-maps';

// Status durations in hours
const STATUS_DURATIONS = [1, 3, 6, 12, 24];

const EnhancedRespondScreen = ({ route, navigation }) => {
  const { checkInId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);
  const [contact, setContact] = useState(null);
  const [responding, setResponding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseType, setResponseType] = useState('standard'); // standard, photo, voice, location, status
  
  // For photo response
  const [cameraVisible, setCameraVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [photoUri, setPhotoUri] = useState(null);
  const cameraRef = useRef(null);
  
  // For voice response
  const [recording, setRecording] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioUri, setAudioUri] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  
  // For location response
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  
  // For status response
  const [statusDialogVisible, setStatusDialogVisible] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusDuration, setStatusDuration] = useState(3); // Default 3 hours

  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    fetchCheckInData();
    requestPermissions();
    
    // Set up timer for recording duration
    let recordingTimer;
    if (recordingStatus === 'recording') {
      recordingTimer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    
    // Clean up
    return () => {
      if (recordingTimer) clearInterval(recordingTimer);
      if (sound) sound.unloadAsync();
      if (recording) stopRecording();
    };
  }, [checkInId, recordingStatus]);

  const requestPermissions = async () => {
    // Camera permissions
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(cameraStatus === 'granted');
    
    // Audio permissions
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    if (audioStatus !== 'granted') {
      Alert.alert('Permission required', 'Please grant permission to use the microphone');
    }
    
    // Location permissions
    let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus === 'granted');
  };

  const fetchCheckInData = async () => {
    if (!checkInId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const checkInRef = doc(db, 'checkIns', checkInId);
      const checkInSnap = await getDoc(checkInRef);
      
      if (!checkInSnap.exists()) {
        Alert.alert('Error', 'Check-in not found or has expired.');
        return;
      }
      
      const checkInData = checkInSnap.data();
      setCheckIn(checkInData);
      
      // Check if already responded
      if (checkInData.status === 'responded') {
        setSubmitted(true);
        
        // Set response type based on what was previously submitted
        if (checkInData.responseType) {
          setResponseType(checkInData.responseType);
        }
        
        // Set media URIs if applicable
        if (checkInData.photoUrl) {
          setPhotoUri(checkInData.photoUrl);
        }
        
        if (checkInData.audioUrl) {
          setAudioUri(checkInData.audioUrl);
        }
        
        if (checkInData.locationData) {
          setLocation(checkInData.locationData);
        }
      }
      
      // Get contact details to know response options
      const contactRef = doc(db, 'contacts', checkInData.contactId);
      const contactSnap = await getDoc(contactRef);
      
      if (contactSnap.exists()) {
        setContact(contactSnap.data());
      }
    } catch (error) {
      console.error('Error fetching check-in:', error);
      Alert.alert('Error', 'Failed to load check-in details.');
    } finally {
      setLoading(false);
    }
  };

  // Standard YES/NO response
  const handleStandardResponse = async (response) => {
    if (!checkIn || !checkInId) return;
    
    try {
      setResponding(true);
      
      // Update check-in with response
      const checkInRef = doc(db, 'checkIns', checkInId);
      await updateDoc(checkInRef, {
        status: 'responded',
        response,
        responseType: 'standard',
        respondedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      
      // Show thank you message
      const isPositive = response === (contact?.positiveResponse || 'YES');
      Alert.alert(
        'Thank You',
        isPositive 
          ? 'Thank you for your response!'
          : 'Your loved one will be notified that you need assistance.'
      );
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // Photo response methods
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setPhotoUri(photo.uri);
        setCameraVisible(false);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handlePhotoResponse = async () => {
    if (!checkIn || !checkInId || !photoUri) return;
    
    try {
      setResponding(true);
      
      // Upload photo to Firebase Storage
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `check-in-responses/${checkInId}_photo.jpg`);
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update check-in with response
      const checkInRef = doc(db, 'checkIns', checkInId);
      await updateDoc(checkInRef, {
        status: 'responded',
        response: 'PHOTO',
        responseType: 'photo',
        photoUrl: downloadUrl,
        respondedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      Alert.alert('Thank You', 'Your photo response has been sent.');
    } catch (error) {
      console.error('Error submitting photo response:', error);
      Alert.alert('Error', 'Failed to submit your photo. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // Voice response methods
  const startRecording = async () => {
    try {
      // Clear previous recording
      if (recording) {
        await stopRecording();
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setRecordingStatus('recording');
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setRecordingStatus('stopped');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const playRecording = async () => {
    if (!audioUri) return;
    
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(newSound);
      setAudioPlaying(true);
      
      await newSound.playAsync();
      
      // When audio finishes playing
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setAudioPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording. Please try again.');
    }
  };

  const stopPlayback = async () => {
    if (!sound) return;
    
    try {
      await sound.stopAsync();
      setAudioPlaying(false);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const handleVoiceResponse = async () => {
    if (!checkIn || !checkInId || !audioUri) return;
    
    try {
      setResponding(true);
      
      // Upload audio to Firebase Storage
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `check-in-responses/${checkInId}_audio.m4a`);
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update check-in with response
      const checkInRef = doc(db, 'checkIns', checkInId);
      await updateDoc(checkInRef, {
        status: 'responded',
        response: 'AUDIO',
        responseType: 'voice',
        audioUrl: downloadUrl,
        audioDuration: recordingDuration,
        respondedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      Alert.alert('Thank You', 'Your voice response has been sent.');
    } catch (error) {
      console.error('Error submitting voice response:', error);
      Alert.alert('Error', 'Failed to submit your voice message. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // Location response methods
  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Please grant location permission to share your location.');
      return;
    }
    
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const handleLocationResponse = async () => {
    if (!checkIn || !checkInId || !location) return;
    
    try {
      setResponding(true);
      
      // Update check-in with response
      const checkInRef = doc(db, 'checkIns', checkInId);
      await updateDoc(checkInRef, {
        status: 'responded',
        response: 'LOCATION',
        responseType: 'location',
        locationData: location,
        respondedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      Alert.alert('Thank You', 'Your location has been shared.');
    } catch (error) {
      console.error('Error submitting location response:', error);
      Alert.alert('Error', 'Failed to share your location. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // Status response methods
  const handleSetStatus = async () => {
    if (!statusText.trim()) {
      Alert.alert('Error', 'Please enter a status message.');
      return;
    }
    
    try {
      setResponding(true);
      
      // Calculate expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + statusDuration);
      
      // Update check-in with response
      const checkInRef = doc(db, 'checkIns', checkInId);
      await updateDoc(checkInRef, {
        status: 'responded',
        response: statusText,
        responseType: 'status',
        statusDuration: statusDuration,
        statusExpiresAt: Timestamp.fromDate(expiryTime),
        respondedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      setStatusDialogVisible(false);
      Alert.alert('Status Set', `Your status has been set for ${statusDuration} hours.`);
    } catch (error) {
      console.error('Error setting status:', error);
      Alert.alert('Error', 'Failed to set your status. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // Render functions for different response types
  const renderStandardResponse = () => {
    const positiveResponse = contact?.useCustomResponses ? contact.positiveResponse : 'YES';
    const negativeResponse = contact?.useCustomResponses ? contact.negativeResponse : 'NO';
    
    return (
      <View style={styles.responseContainer}>
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            style={[styles.responseButton, styles.positiveButton]}
            labelStyle={styles.buttonLabel}
            onPress={() => handleStandardResponse(positiveResponse)}
            loading={responding}
            disabled={responding}
          >
            {positiveResponse}
          </Button>
          
          <Button
            mode="contained"
            style={[styles.responseButton, styles.negativeButton]}
            labelStyle={styles.buttonLabel}
            onPress={() => handleStandardResponse(negativeResponse)}
            loading={responding}
            disabled={responding}
          >
            {negativeResponse}
          </Button>
        </View>
        
        <Text style={styles.orText}>or</Text>
        
        <View style={styles.quickOptionsContainer}>
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => setResponseType('photo')}
          >
            <IconButton
              icon="camera"
              size={28}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => setResponseType('voice')}
          >
            <IconButton
              icon="microphone"
              size={28}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Voice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => {
              getCurrentLocation();
              setResponseType('location');
            }}
          >
            <IconButton
              icon="map-marker"
              size={28}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => {
              setStatusDialogVisible(true);
              setResponseType('status');
            }}
          >
            <IconButton
              icon="text"
              size={28}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPhotoResponse = () => {
    if (cameraVisible) {
      return (
        <View style={styles.cameraContainer}>
          {hasPermission ? (
            <>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                type={cameraType}
                ratio="4:3"
              />
              
              <View style={styles.cameraControls}>
                <IconButton
                  icon="camera-flip"
                  size={30}
                  color="#fff"
                  onPress={() => setCameraType(
                    cameraType === Camera.Constants.Type.back
                      ? Camera.Constants.Type.front
                      : Camera.Constants.Type.back
                  )}
                />
                
                <IconButton
                  icon="camera"
                  size={50}
                  color="#fff"
                  style={styles.captureButton}
                  onPress={takePicture}
                />
                
                <IconButton
                  icon="close"
                  size={30}
                  color="#fff"
                  onPress={() => setCameraVisible(false)}
                />
              </View>
            </>
          ) : (
            <View style={styles.noCameraPermission}>
              <Text>No access to camera</Text>
              <Button 
                mode="contained" 
                onPress={() => requestPermissions()}
                style={styles.permissionButton}
              >
                Grant Permission
              </Button>
            </View>
          )}
        </View>
      );
    }
    
    return (
      <View style={styles.responseContainer}>
        <Text style={styles.responseTitle}>Photo Response</Text>
        
        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            
            {!submitted && (
              <View style={styles.previewActions}>
                <Button
                  icon="refresh"
                  mode="outlined"
                  onPress={() => setPhotoUri(null)}
                  style={styles.actionButton}
                >
                  Retake
                </Button>
                
                <Button
                  icon="send"
                  mode="contained"
                  onPress={handlePhotoResponse}
                  style={styles.actionButton}
                  loading={responding}
                  disabled={responding}
                >
                  Send
                </Button>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoOptions}>
            <Button
              icon="camera"
              mode="contained"
              onPress={() => setCameraVisible(true)}
              style={styles.photoButton}
            >
              Take Photo
            </Button>
            
            <Button
              icon="image"
              mode="outlined"
              onPress={pickImage}
              style={styles.photoButton}
            >
              Choose from Gallery
            </Button>
          </View>
        )}
        
        {!photoUri && (
          <Button
            icon="chevron-left"
            onPress={() => setResponseType('standard')}
            style={styles.backButton}
          >
            Back to Options
          </Button>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading check-in...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!checkIn || !checkInId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Invalid check-in link or the check-in has expired.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>SafeCheck</Text>
          
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.questionText}>
                {checkIn.question || 'Is everything alright?'}
              </Text>
              
              {responseType === 'photo' ? 
                renderPhotoResponse() : 
                renderStandardResponse()
              }
            </Card.Content>
          </Card>
          
          <Text style={styles.footerText}>
            From {contact?.name || 'someone who cares about you'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#F44336',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#2196F3',
  },
  card: {
    width: '100%',
    padding: 16,
    marginBottom: 24,
    borderRadius: 16,
  },
  questionText: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  responseContainer: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  responseButton: {
    width: '45%',
    paddingVertical: 10,
    borderRadius: 8,
  },
  positiveButton: {
    backgroundColor: '#4CAF50',
  },
  negativeButton: {
    backgroundColor: '#F44336',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    color: '#757575',
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  optionButton: {
    alignItems: 'center',
    width: '24%',
  },
  optionIcon: {
    backgroundColor: '#f0f0f0',
    margin: 0,
  },
  optionText: {
    fontSize: 12,
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 24,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    width: '100%',
    height: 400,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  noCameraPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButton: {
    marginTop: 16,
  },
  previewContainer: {
    width: '100%',
    marginTop: 16,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  photoOptions: {
    width: '100%',
    marginTop: 16,
  },
  photoButton: {
    marginBottom: 12,
  },
  backButton: {
    marginTop: 16,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default EnhancedRespondScreen; 