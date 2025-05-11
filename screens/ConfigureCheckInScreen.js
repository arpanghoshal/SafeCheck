import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, Switch, Divider, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import Header from '../components/Header';

const ConfigureCheckInScreen = ({ route, navigation }) => {
  const { contactId } = route.params;
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [enabledDays, setEnabledDays] = useState([1, 2, 3, 4, 5, 6, 0]); // All days enabled
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContactDetails();
  }, [contactId]);

  const fetchContactDetails = async () => {
    try {
      setLoading(true);
      const contactDoc = await firestore().collection('contacts').doc(contactId).get();
      
      if (!contactDoc.exists) {
        Alert.alert('Error', 'Contact not found.');
        navigation.goBack();
        return;
      }
      
      const data = contactDoc.data();
      setContact(data);
      setScheduleType(data.scheduleType || 'daily');
      
      if (data.scheduleTime) {
        setScheduleTime(data.scheduleTime.toDate());
      }
      
      setEnabledDays(data.enabledDays || [1, 2, 3, 4, 5, 6, 0]);
    } catch (error) {
      console.error('Error fetching contact:', error);
      Alert.alert('Error', 'Failed to load contact details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setScheduleTime(selectedTime);
    }
  };

  const toggleDay = (day) => {
    if (enabledDays.includes(day)) {
      // Don't allow removing the last day
      if (enabledDays.length > 1) {
        setEnabledDays(enabledDays.filter(d => d !== day));
      }
    } else {
      setEnabledDays([...enabledDays, day]);
    }
  };

  const saveCheckInSettings = async () => {
    try {
      setIsSaving(true);
      
      await firestore().collection('contacts').doc(contactId).update({
        scheduleType,
        scheduleTime: firestore.Timestamp.fromDate(scheduleTime),
        enabledDays,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      Alert.alert(
        'Success',
        'Check-in settings have been updated.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving check-in settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const dayButtons = [
    { label: 'S', value: 0 }, // Sunday
    { label: 'M', value: 1 }, // Monday
    { label: 'T', value: 2 }, // Tuesday
    { label: 'W', value: 3 }, // Wednesday
    { label: 'T', value: 4 }, // Thursday
    { label: 'F', value: 5 }, // Friday
    { label: 'S', value: 6 }, // Saturday
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Configure Check-ins"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContent}>
          <Text>Loading contact details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Configure Check-ins"
        subtitle={contact?.name}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Schedule Type</Text>
          <RadioButton.Group
            onValueChange={value => setScheduleType(value)}
            value={scheduleType}
          >
            <View style={styles.radioOption}>
              <RadioButton value="daily" />
              <Text>Daily check-ins</Text>
            </View>
            
            <View style={styles.radioOption}>
              <RadioButton value="custom" />
              <Text>Custom days</Text>
            </View>
          </RadioButton.Group>
          
          {scheduleType === 'custom' && (
            <View style={styles.daysContainer}>
              <Text style={styles.label}>Select days:</Text>
              <View style={styles.dayButtonsContainer}>
                {dayButtons.map(day => (
                  <Button
                    key={day.value}
                    mode={enabledDays.includes(day.value) ? 'contained' : 'outlined'}
                    style={styles.dayButton}
                    onPress={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </View>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Check-in Time</Text>
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            style={styles.timeButton}
          >
            {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button>
          
          {showTimePicker && (
            <DateTimePicker
              value={scheduleTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
          
          <Text style={styles.helperText}>
            Your loved one will receive a check-in message at this time on the selected days.
          </Text>
          
          <Button
            mode="contained"
            onPress={saveCheckInSettings}
            style={styles.saveButton}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Settings
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  daysContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  dayButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    marginHorizontal: 2,
  },
  divider: {
    marginVertical: 24,
  },
  timeButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  saveButton: {
    marginVertical: 16,
    paddingVertical: 8,
  },
});

export default ConfigureCheckInScreen; 