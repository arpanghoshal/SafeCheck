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

// New function to send SMS using Twilio (you would need to set up Twilio account)
// This is a server-side fallback in case the client can't send SMS directly
async function sendSMS(phoneNumber, message) {
  // You would implement Twilio or another SMS service here
  // This is a placeholder for demonstration
  console.log(`Would send SMS to ${phoneNumber}: ${message}`);
  
  // Example with Twilio (commented out since it requires setup)
  /*
  const twilio = require('twilio');
  const accountSid = functions.config().twilio.account_sid;
  const authToken = functions.config().twilio.auth_token;
  const twilioNumber = functions.config().twilio.phone_number;
  
  const client = new twilio(accountSid, authToken);
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: phoneNumber
    });
    return result;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    throw error;
  }
  */
}

// Combined function to try push notification first, with SMS fallback
async function sendAlert(userData, title, body, data = {}) {
  try {
    // Try push notification first
    if (userData.pushToken) {
      await sendPushNotification(userData.pushToken, title, body, data);
      return true;
    }
  } catch (error) {
    console.error('Push notification failed, trying SMS fallback:', error);
  }
  
  // If push notification failed or wasn't available, try SMS
  if (userData.phoneNumber) {
    try {
      await sendSMS(userData.phoneNumber, `${title}: ${body}`);
      return true;
    } catch (smsError) {
      console.error('SMS fallback also failed:', smsError);
      throw smsError;
    }
  } else {
    throw new Error('No valid delivery channel (push token or phone number) available');
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
      
      // Use the combined function for push/SMS delivery
      await sendAlert(
        userData,
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
      
      // Check if response is negative
      const isNegative = newData.response === (newData.negativeResponse || 'NO');

      // Only send notification if response is negative or user has enabled notifications for all responses
      if (isNegative || userData.preferences?.notifyOnAllResponses) {
        await sendAlert(
          userData,
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
      
      // Only send notification if user has enabled notifications for no response
      if (userData.preferences?.notifyOnNoResponse) {
        await sendAlert(
          userData,
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
      // Get user data for the emergency creator
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(emergency.userId)
        .get();
      
      if (!userDoc.exists) {
        console.log('Emergency creator not found:', emergency.userId);
        return;
      }
      
      const userData = userDoc.data();
      const userName = userData.displayName || userData.phoneNumber || 'Your contact';
      
      // Get all contacts for the emergency
      const contactsSnapshot = await admin.firestore()
        .collection('contacts')
        .where('userId', '==', emergency.userId)
        .get();

      // Send notifications to all contacts with SMS fallback
      const notificationPromises = contactsSnapshot.docs.map(async (contactDoc) => {
        const contact = contactDoc.data();
        
        // Get the contact's user document
        const contactUserDoc = await admin.firestore()
          .collection('users')
          .doc(contact.contactId)
          .get();

        if (!contactUserDoc.exists) {
          console.log('Contact user not found:', contact.contactId);
          return;
        }

        const contactUserData = contactUserDoc.data();
        
        // Create emergency alert message
        const locationText = emergency.location ? 
          `Location: https://maps.google.com/?q=${emergency.location.latitude},${emergency.location.longitude}` :
          '';
        
        // Send alert with SMS fallback
        return sendAlert(
          contactUserData,
          'EMERGENCY ALERT',
          `${userName} needs help! ${locationText}`,
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