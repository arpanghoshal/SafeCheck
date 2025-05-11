import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Chip, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import Header from '../components/Header';

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const CheckInHistoryScreen = ({ route, navigation }) => {
  const { contactId } = route.params;
  const [contact, setContact] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadContactAndHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch contact details
      const contactDoc = await firestore().collection('contacts').doc(contactId).get();
      
      if (!contactDoc.exists) {
        Alert.alert('Error', 'Contact not found.');
        navigation.goBack();
        return;
      }
      
      setContact(contactDoc.data());
      
      // Fetch check-in history
      const checkInsSnapshot = await firestore()
        .collection('checkIns')
        .where('contactId', '==', contactId)
        .orderBy('sentAt', 'desc')
        .get();
      
      const checkInList = [];
      checkInsSnapshot.forEach(doc => {
        checkInList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setCheckIns(checkInList);
    } catch (error) {
      console.error('Error loading check-in history:', error);
      Alert.alert('Error', 'Failed to load check-in history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContactAndHistory();
  }, [contactId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadContactAndHistory();
  };

  const getStatusChip = (status, response) => {
    let color;
    let label;
    
    switch (status) {
      case 'pending':
        color = '#FFA000';
        label = 'Pending';
        break;
      case 'responded':
        color = response === (contact?.positiveResponse || 'YES') ? '#4CAF50' : '#F44336';
        label = response || 'Responded';
        break;
      case 'expired':
        color = '#757575';
        label = 'No Response';
        break;
      default:
        color = '#9E9E9E';
        label = status;
    }
    
    return (
      <Chip style={[styles.statusChip, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{label}</Text>
      </Chip>
    );
  };

  const renderCheckInItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.question}>{item.question || 'Check-in'}</Text>
          {getStatusChip(item.status, item.response)}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sent:</Text>
          <Text>{formatDateTime(item.sentAt)}</Text>
        </View>
        
        {item.status === 'responded' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Response:</Text>
              <Text style={item.response === (contact?.positiveResponse || 'YES') ? styles.positiveResponse : styles.negativeResponse}>
                {item.response}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Responded:</Text>
              <Text>{formatDateTime(item.respondedAt)}</Text>
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={`Check-in History`}
        subtitle={contact?.name}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading check-in history...</Text>
        </View>
      ) : checkIns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No check-ins have been sent yet.</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Home')}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      ) : (
        <FlatList
          data={checkIns}
          renderItem={renderCheckInItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
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
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    width: 90,
  },
  positiveResponse: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  negativeResponse: {
    color: '#F44336',
    fontWeight: 'bold',
  },
});

export default CheckInHistoryScreen; 