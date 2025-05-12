import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, FAB, Card, Button, ActivityIndicator, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import CheckInCard from '../components/CheckInCard';
import Header from '../components/Header';
import EmergencyButton from '../components/EmergencyButton';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const HomeScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [sound, setSound] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const currentUser = auth().currentUser;
      
      if (!currentUser) {
        // User not logged in
        setLoading(false);
        return;
      }
      
      const contactsRef = firestore().collection('contacts');
      const snapshot = await contactsRef
        .where('userId', '==', currentUser.uid)
        .get();
      
      const contactsList = [];
      snapshot.forEach(doc => {
        contactsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setContacts(contactsList);
      setFilteredContacts(contactsList);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load your contacts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContacts();
    
    // Subscribe to focus event to refresh data when navigating back to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadContacts();
    });
    
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  const handleSendCheckIn = async (contactId) => {
    // Logic to send immediate check-in
    try {
      // Get the contact document reference
      const contactRef = firestore().doc(`contacts/${contactId}`);
      const contact = (await contactRef.get()).data();
      
      if (!contact) {
        Alert.alert('Error', 'Contact not found.');
        return;
      }
      
      // Choose a random question
      const questions = contact.questions || ['Is everything alright?'];
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      
      // Create a new check-in in the database
      await firestore().collection('checkIns').add({
        contactId,
        userId: auth().currentUser.uid,
        question: randomQuestion,
        sentAt: firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        response: null,
        respondedAt: null
      });
      
      // Update the lastCheckIn field in the contact
      await contactRef.update({
        lastCheckIn: firestore.FieldValue.serverTimestamp()
      });
      
      Alert.alert('Check-in sent', 'Your loved one has been notified.');
      
    } catch (error) {
      console.error('Error sending check-in:', error);
      Alert.alert('Error', 'Failed to send check-in. Please try again.');
    }
  };

  const renderContact = ({ item }) => (
    <CheckInCard
      contact={item}
      onSendCheckIn={() => handleSendCheckIn(item.id)}
      onViewHistory={() => navigation.navigate('CheckInHistory', { contactId: item.id })}
      onEditContact={() => navigation.navigate('AddContact', { contactId: item.id })}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyImageContainer}>
        <IconButton
          icon="account-group"
          size={120}
          color="#1976D2"
          style={styles.emptyIcon}
        />
      </View>
      <Text style={styles.emptyTitle}>No contacts yet</Text>
      <Text style={styles.emptyText}>Add your loved ones to start checking on them regularly.</Text>
      <Button 
        mode="contained" 
        onPress={() => navigation.navigate('AddContact')}
        style={styles.addButton}
        icon="account-plus"
      >
        Add Your First Contact
      </Button>
    </View>
  );

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      const userId = auth().currentUser.uid;
      
      const checkInsSnapshot = await firestore()
        .collection('checkIns')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const checkIns = checkInsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRecentCheckIns(checkIns);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
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
    }
  };

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    // Set up real-time listener for check-ins
    const unsubscribe = firestore()
      .collection('checkIns')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          const newCheckIns = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCheckIns(newCheckIns);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching check-ins:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const playAudio = async (audioUrl, checkInId) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(checkInId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio message');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingId(null);
    }
  };

  const renderMediaResponse = (checkIn) => {
    if (checkIn.photoResponse) {
      return (
        <TouchableOpacity
          style={styles.mediaContainer}
          onPress={() => navigation.navigate('MediaViewer', { uri: checkIn.photoResponse })}
        >
          <Image
            source={{ uri: checkIn.photoResponse }}
            style={styles.mediaPreview}
            resizeMode="cover"
          />
          <Text style={styles.mediaLabel}>Photo Response</Text>
        </TouchableOpacity>
      );
    }

    if (checkIn.voiceResponse) {
      return (
        <TouchableOpacity
          style={styles.mediaContainer}
          onPress={() => {
            if (playingId === checkIn.id) {
              stopAudio();
            } else {
              playAudio(checkIn.voiceResponse, checkIn.id);
            }
          }}
        >
          <Ionicons
            name={playingId === checkIn.id ? 'pause-circle' : 'play-circle'}
            size={40}
            color="#007AFF"
          />
          <Text style={styles.mediaLabel}>Voice Response</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderCheckIn = ({ item }) => (
    <View style={styles.checkInItem}>
      <View style={styles.checkInHeader}>
        <Text style={styles.checkInTime}>
          {format(item.createdAt.toDate(), 'MMM d, h:mm a')}
        </Text>
        <Text style={[
          styles.checkInStatus,
          { color: item.status === 'responded' ? '#4CAF50' : '#FFA000' }
        ]}>
          {item.status.toUpperCase()}
        </Text>
      </View>

      {renderMediaResponse(item)}

      <View style={styles.checkInFooter}>
        <Text style={styles.checkInMessage}>{item.message}</Text>
        {item.location && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => navigation.navigate('Map', { location: item.location })}
          >
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text style={styles.locationText}>View Location</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="SafeCheck" subtitle="Keep in touch with your loved ones" />
      
      {!loading && contacts.length > 0 && (
        <Searchbar
          placeholder="Search contacts"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      )}
      
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading your contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No contacts matching "{searchQuery}"</Text>
              </View>
            ) : null
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        label={contacts.length > 0 ? "Add Contact" : undefined}
        onPress={() => navigation.navigate('AddContact')}
        color="white"
      />
    </SafeAreaView>
  );
};

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
  listContainer: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1976D2',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyImageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976D2',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
    lineHeight: 22,
  },
  addButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#1976D2',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976D2',
  },
  checkInItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInTime: {
    fontSize: 14,
    color: '#666666',
  },
  checkInStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  mediaPreview: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  mediaLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  checkInFooter: {
    marginTop: 12,
  },
  checkInMessage: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
  },
});

export default HomeScreen; 