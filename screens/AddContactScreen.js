import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Switch, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';

const AddContactScreen = ({ route, navigation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState(['Is everything alright?']);
  const [newQuestion, setNewQuestion] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [enabledDays, setEnabledDays] = useState([1, 2, 3, 4, 5, 6, 0]); // All days enabled
  const [useCustomResponses, setUseCustomResponses] = useState(false);
  const [positiveResponse, setPositiveResponse] = useState('YES');
  const [negativeResponse, setNegativeResponse] = useState('NO');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contactId, setContactId] = useState(null);

  // Check if we're editing an existing contact
  useEffect(() => {
    if (route.params?.contactId) {
      setIsEditing(true);
      setContactId(route.params.contactId);
      fetchContactDetails(route.params.contactId);
    }
  }, [route.params]);

  const fetchContactDetails = async (id) => {
    try {
      setLoading(true);
      const contactDoc = await firestore().collection('contacts').doc(id).get();
      
      if (contactDoc.exists) {
        const data = contactDoc.data();
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setQuestions(data.questions || ['Is everything alright?']);
        setScheduleType(data.scheduleType || 'daily');
        
        if (data.scheduleTime) {
          // Convert Firestore timestamp to Date
          setScheduleTime(data.scheduleTime.toDate());
        }
        
        setEnabledDays(data.enabledDays || [1, 2, 3, 4, 5, 6, 0]);
        setUseCustomResponses(data.useCustomResponses || false);
        setPositiveResponse(data.positiveResponse || 'YES');
        setNegativeResponse(data.negativeResponse || 'NO');
      } else {
        Alert.alert('Error', 'Contact not found.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      Alert.alert('Error', 'Failed to load contact details.');
    } finally {
      setLoading(false);
    }
  };

  const openContactPicker = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      
      if (data.length > 0) {
        // Show contact picker or use first contact for simplicity
        const contact = data[0];
        setName(contact.name);
        
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          setPhone(contact.phoneNumbers[0].number);
        }
        
        if (contact.emails && contact.emails.length > 0) {
          setEmail(contact.emails[0].email);
        }
      } else {
        Alert.alert('No contacts found', 'Your contacts list is empty.');
      }
    } else {
      Alert.alert('Permission denied', 'Please enable contacts permission in your settings.');
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return false;
    }
    
    if (!phone.trim() && !email.trim()) {
      Alert.alert('Error', 'Please enter either a phone number or email.');
      return false;
    }
    
    if (questions.length === 0) {
      Alert.alert('Error', 'Please add at least one check-in question.');
      return false;
    }
    
    return true;
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      Alert.alert('Error', 'You must have at least one check-in question.');
      return;
    }
    
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
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

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setScheduleTime(selectedTime);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const contactData = {
        userId: auth().currentUser.uid,
        name,
        phone: phone.trim(),
        email: email.trim(),
        questions,
        scheduleType,
        scheduleTime: firestore.Timestamp.fromDate(scheduleTime),
        enabledDays,
        useCustomResponses,
        positiveResponse,
        negativeResponse,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      if (isEditing) {
        // Update existing contact
        await firestore()
          .collection('contacts')
          .doc(contactId)
          .update(contactData);
        
        Alert.alert('Success', `${name} has been updated.`);
      } else {
        // Add new contact
        contactData.createdAt = firestore.FieldValue.serverTimestamp();
        
        await firestore()
          .collection('contacts')
          .add(contactData);
        
        Alert.alert('Success', `${name} has been added to your contacts.`);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    } finally {
      setLoading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={isEditing ? 'Edit Contact' : 'Add New Contact'} 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            keyboardType="email-address"
          />
          
          <Button 
            mode="outlined" 
            onPress={openContactPicker}
            style={styles.contactButton}
            icon="contacts"
          >
            Choose from Contacts
          </Button>
          
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Check-in Questions</Text>
            <HelperText>Your loved one will receive one of these questions at random.</HelperText>
          </View>
          
          {questions.map((question, index) => (
            <View key={index} style={styles.questionContainer}>
              <TextInput
                value={question}
                onChangeText={(text) => {
                  const updatedQuestions = [...questions];
                  updatedQuestions[index] = text;
                  setQuestions(updatedQuestions);
                }}
                style={styles.questionInput}
                mode="outlined"
                dense
              />
              <Button
                icon="delete"
                onPress={() => handleRemoveQuestion(index)}
                disabled={questions.length <= 1}
              />
            </View>
          ))}
          
          <View style={styles.addQuestionContainer}>
            <TextInput
              label="New Question"
              value={newQuestion}
              onChangeText={setNewQuestion}
              style={styles.newQuestionInput}
              mode="outlined"
              dense
              onSubmitEditing={handleAddQuestion}
            />
            <Button
              mode="contained"
              onPress={handleAddQuestion}
              disabled={!newQuestion.trim()}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>
          
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Check-in Schedule</Text>
          </View>
          
          <View style={styles.scheduleTypeContainer}>
            <Text>Schedule Type:</Text>
            <View style={styles.scheduleTypeButtons}>
              <Button
                mode={scheduleType === 'daily' ? 'contained' : 'outlined'}
                onPress={() => setScheduleType('daily')}
                style={styles.scheduleButton}
              >
                Daily
              </Button>
              <Button
                mode={scheduleType === 'custom' ? 'contained' : 'outlined'}
                onPress={() => setScheduleType('custom')}
                style={styles.scheduleButton}
              >
                Custom Days
              </Button>
            </View>
          </View>
          
          {scheduleType === 'custom' && (
            <View style={styles.daysContainer}>
              {dayButtons.map((day) => (
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
          )}
          
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            style={styles.timeButton}
          >
            Time: {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Response Options</Text>
          </View>
          
          <View style={styles.switchContainer}>
            <Text>Use custom response options</Text>
            <Switch
              value={useCustomResponses}
              onValueChange={setUseCustomResponses}
            />
          </View>
          
          {useCustomResponses && (
            <View style={styles.customResponsesContainer}>
              <TextInput
                label="Positive Response"
                value={positiveResponse}
                onChangeText={setPositiveResponse}
                style={styles.input}
                mode="outlined"
              />
              
              <TextInput
                label="Negative Response"
                value={negativeResponse}
                onChangeText={setNegativeResponse}
                style={styles.input}
                mode="outlined"
              />
              
              <HelperText>
                These are the options your loved one will see when responding.
              </HelperText>
            </View>
          )}
          
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={loading}
            disabled={loading}
          >
            {isEditing ? 'Update Contact' : 'Add Contact'}
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
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  contactButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionInput: {
    flex: 1,
    marginRight: 8,
  },
  addQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  newQuestionInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    marginTop: 8,
  },
  scheduleTypeContainer: {
    marginVertical: 12,
  },
  scheduleTypeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  scheduleButton: {
    marginRight: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  dayButton: {
    width: 40,
    marginHorizontal: 2,
  },
  timeButton: {
    marginVertical: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  customResponsesContainer: {
    marginTop: 8,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 8,
  },
});

export default AddContactScreen; 