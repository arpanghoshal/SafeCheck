# SafeCheck Mobile App

A React Native mobile application for personal safety and check-ins.

## Features

- User authentication (phone OTP)
- Real-time check-ins with location sharing
- Emergency alerts with location tracking
- Push notifications for check-ins and emergencies
- Contact management
- Profile customization
- User preferences management
- Dark mode support

## Technical Stack

- React Native
- Expo
- Firebase
  - Authentication (Phone OTP)
  - Firestore
  - Cloud Functions
  - Storage
- React Navigation
- Expo Notifications
- React Native Maps

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Create a Firebase project
   - Enable Phone Authentication
   - Set up Firestore
   - Configure Cloud Functions
   - Set up Storage

3. Update Firebase configuration in `app.json`:
```json
{
  "expo": {
    "extra": {
      "firebaseConfig": {
        // Your Firebase config
      }
    }
  }
}
```

4. Start the development server:
```bash
expo start
```

## Project Structure

```
SafeCheck/
├── components/         # Reusable components
├── screens/           # Screen components
├── navigation/        # Navigation configuration
├── services/         # API and service functions
├── utils/            # Utility functions
├── assets/           # Images and other assets
└── functions/        # Firebase Cloud Functions
```

## Features in Detail

### Authentication
- Phone number verification using Firebase Authentication
- Secure OTP-based login
- Profile management with photo upload

### Check-ins
- Real-time location sharing
- Customizable check-in intervals
- Auto check-in support
- Check-in history with pagination
- Response options (text, photo, voice)

### Emergency Alerts
- One-tap emergency activation
- Real-time location tracking
- Contact notifications
- Emergency history

### Notifications
- Push notifications for:
  - Check-in reminders
  - Emergency alerts
  - Response requests
  - Contact updates
- Customizable notification preferences

### User Preferences
- Notification settings
- Location sharing preferences
- Check-in interval selection
- Dark mode toggle
- Profile customization

## Security

- Firebase Security Rules for data access
- Secure file uploads with size limits
- Phone number verification
- Location data encryption

## Performance Optimizations

- Image compression for uploads
- Pagination for history screens
- Efficient data loading
- Background task optimization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@safecheck.com or join our Slack channel. 