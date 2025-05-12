const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// Send push notification using Expo's push notification service
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    await axios.post('https://exp.host/--/api/v2/push/send', message);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Triggered when a new check-in is created
exports.onCheckInCreated = functions.firestore
  .document('checkIns/{checkInId}')
  .onCreate(async (snap, context) => {
    const checkIn = snap.data();
    const { checkInId } = context.params;

    try {
      // Get the recipient's user document
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(checkIn.recipientId)
        .get();

      if (!userDoc.exists) {
        console.log('User not found:', checkIn.recipientId);
        return;
      }

      const userData = userDoc.data();
      const expoPushToken = userData.expoPushToken;

      if (!expoPushToken) {
        console.log('No push token found for user:', checkIn.recipientId);
        return;
      }

      // Send notification
      await sendPushNotification(
        expoPushToken,
        'New Check-In',
        `${checkIn.senderName} is checking in on you`,
        {
          type: 'checkIn',
          checkInId,
        }
      );
    } catch (error) {
      console.error('Error sending check-in notification:', error);
    }
  });

// Triggered when a check-in response is received
exports.onCheckInResponse = functions.firestore
  .document('checkIns/{checkInId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    const { checkInId } = context.params;

    // Only proceed if status changed to 'responded'
    if (newData.status !== 'responded' || previousData.status === 'responded') {
      return;
    }

    try {
      // Get the sender's user document
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(newData.senderId)
        .get();

      if (!userDoc.exists) {
        console.log('User not found:', newData.senderId);
        return;
      }

      const userData = userDoc.data();
      const expoPushToken = userData.expoPushToken;

      if (!expoPushToken) {
        console.log('No push token found for user:', newData.senderId);
        return;
      }

      // Check if response is negative
      const isNegative = newData.response === (newData.negativeResponse || 'NO');

      // Only send notification if response is negative or user has enabled notifications for all responses
      if (isNegative || userData.preferences?.notifyOnAllResponses) {
        await sendPushNotification(
          expoPushToken,
          'Check-In Response',
          `${newData.recipientName} has ${isNegative ? 'indicated they need help' : 'responded to your check-in'}`,
          {
            type: 'checkIn',
            checkInId,
          }
        );
      }
    } catch (error) {
      console.error('Error sending response notification:', error);
    }
  });

// Triggered when a check-in is overdue
exports.onCheckInOverdue = functions.firestore
  .document('checkIns/{checkInId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    const { checkInId } = context.params;

    // Only proceed if status changed to 'overdue'
    if (newData.status !== 'overdue' || previousData.status === 'overdue') {
      return;
    }

    try {
      // Get the sender's user document
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(newData.senderId)
        .get();

      if (!userDoc.exists) {
        console.log('User not found:', newData.senderId);
        return;
      }

      const userData = userDoc.data();
      const expoPushToken = userData.expoPushToken;

      if (!expoPushToken) {
        console.log('No push token found for user:', newData.senderId);
        return;
      }

      // Only send notification if user has enabled notifications for no response
      if (userData.preferences?.notifyOnNoResponse) {
        await sendPushNotification(
          expoPushToken,
          'Check-In Overdue',
          `${newData.recipientName} hasn't responded to your check-in`,
          {
            type: 'checkIn',
            checkInId,
          }
        );
      }
    } catch (error) {
      console.error('Error sending overdue notification:', error);
    }
  });

// Triggered when an emergency alert is created
exports.onEmergencyCreated = functions.firestore
  .document('emergencies/{emergencyId}')
  .onCreate(async (snap, context) => {
    const emergency = snap.data();
    const { emergencyId } = context.params;

    try {
      // Get all contacts for the emergency
      const contactsSnapshot = await admin.firestore()
        .collection('contacts')
        .where('userId', '==', emergency.userId)
        .get();

      // Send notifications to all contacts
      const notificationPromises = contactsSnapshot.docs.map(async (contactDoc) => {
        const contact = contactDoc.data();
        
        // Get the contact's user document
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(contact.contactId)
          .get();

        if (!userDoc.exists) {
          console.log('Contact user not found:', contact.contactId);
          return;
        }

        const userData = userDoc.data();
        const expoPushToken = userData.expoPushToken;

        if (!expoPushToken) {
          console.log('No push token found for contact:', contact.contactId);
          return;
        }

        return sendPushNotification(
          expoPushToken,
          'Emergency Alert',
          `${contact.name} has triggered an emergency alert`,
          {
            type: 'emergency',
            emergencyId,
          }
        );
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending emergency notifications:', error);
    }
  }); 