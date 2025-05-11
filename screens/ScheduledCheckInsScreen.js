import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Button, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Header from '../components/Header';
import ScheduledCheckInCard from '../components/ScheduledCheckInCard';

const ScheduledCheckInsScreen = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [name, setName] = useState('');
  const [time, setTime] = useState(new Date());
  const [frequency, setFrequency] = useState('daily');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const currentUser = auth().currentUser;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const schedulesRef = firestore().collection('scheduledCheckIns');
      const snapshot = await schedulesRef
        .where('userId', '==', currentUser.uid)
        .get();
      
      const schedulesList = [];
      snapshot.forEach(doc => {
        schedulesList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setSchedules(schedulesList);
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Error', 'Failed to load scheduled check-ins.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setName('');
    setTime(new Date());
    setFrequency('daily');
    setModalVisible(true);
  };

  const handleEditSchedule = (scheduleId) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      setEditingSchedule(schedule);
      setName(schedule.name);
      setTime(new Date(schedule.time));
      setFrequency(schedule.frequency);
      setModalVisible(true);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await firestore().collection('scheduledCheckIns').doc(scheduleId).delete();
      setSchedules(schedules.filter(s => s.id !== scheduleId));
      Alert.alert('Success', 'Schedule deleted successfully.');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      Alert.alert('Error', 'Failed to delete schedule.');
    }
  };

  const handleToggleSchedule = async (scheduleId) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        await firestore().collection('scheduledCheckIns').doc(scheduleId).update({
          enabled: !schedule.enabled
        });
        setSchedules(schedules.map(s => 
          s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
      Alert.alert('Error', 'Failed to update schedule.');
    }
  };

  const handleSaveSchedule = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the schedule.');
      return;
    }

    try {
      const scheduleData = {
        name: name.trim(),
        time: time.toISOString(),
        frequency,
        enabled: true,
        userId: auth().currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      if (editingSchedule) {
        await firestore().collection('scheduledCheckIns').doc(editingSchedule.id).update(scheduleData);
        setSchedules(schedules.map(s => 
          s.id === editingSchedule.id ? { ...s, ...scheduleData } : s
        ));
      } else {
        const docRef = await firestore().collection('scheduledCheckIns').add(scheduleData);
        setSchedules([...schedules, { id: docRef.id, ...scheduleData }]);
      }

      setModalVisible(false);
      Alert.alert('Success', `Schedule ${editingSchedule ? 'updated' : 'created'} successfully.`);
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', `Failed to ${editingSchedule ? 'update' : 'create'} schedule.`);
    }
  };

  const renderSchedule = ({ item }) => (
    <ScheduledCheckInCard
      schedule={item}
      onEdit={handleEditSchedule}
      onDelete={handleDeleteSchedule}
      onToggle={handleToggleSchedule}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Scheduled Check-ins" 
        subtitle="Set up automatic check-ins"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : schedules.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No scheduled check-ins yet.</Text>
          <Button 
            mode="contained" 
            onPress={handleAddSchedule}
            style={styles.addButton}
            icon="plus"
          >
            Add Schedule
          </Button>
        </View>
      ) : (
        <FlatList
          data={schedules}
          renderItem={renderSchedule}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddSchedule}
        color="white"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>
            {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
          </Text>
          
          <TextInput
            label="Schedule Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />
          
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            style={styles.timeButton}
            icon="clock"
          >
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button>
          
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setTime(selectedTime);
                }
              }}
            />
          )}
          
          <View style={styles.frequencyContainer}>
            <Button
              mode={frequency === 'daily' ? 'contained' : 'outlined'}
              onPress={() => setFrequency('daily')}
              style={styles.frequencyButton}
            >
              Daily
            </Button>
            <Button
              mode={frequency === 'weekly' ? 'contained' : 'outlined'}
              onPress={() => setFrequency('weekly')}
              style={styles.frequencyButton}
            >
              Weekly
            </Button>
          </View>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveSchedule}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
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
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#757575',
  },
  addButton: {
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976D2',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1976D2',
  },
  input: {
    marginBottom: 16,
  },
  timeButton: {
    marginBottom: 16,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  frequencyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 8,
  },
});

export default ScheduledCheckInsScreen; 