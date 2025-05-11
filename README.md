# SafeCheck

SafeCheck is a mobile application that helps you stay connected with your loved ones through regular check-ins. The app allows you to schedule automated check-ins and receive notifications when someone needs assistance.

## Features

- User authentication (email/password)
- Contact management
- Scheduled check-ins
- Push notifications
- Check-in history
- Customizable check-in questions
- Response tracking
- Settings management

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- Twilio account (optional, for SMS)
- SendGrid account (optional, for email)
- Android Studio (for Android deployment)
- Xcode (for iOS deployment)
- Apple Developer Account (for iOS deployment)
- Google Play Developer Account (for Android deployment)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/safecheck.git
cd safecheck
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure Firebase:
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Set up Firestore Database
   - Configure Cloud Functions
   - Download and add Firebase configuration files:
     - `GoogleService-Info.plist` for iOS
     - `google-services.json` for Android

4. Update Firebase configuration:
   - Open `config/firebase.js`
   - Replace the placeholder values with your Firebase project credentials

5. Start the development server:
```bash
expo start
```

## Deployment

### iOS

1. Update `app.json` with your iOS bundle identifier
2. Build the app:
```bash
eas build --platform ios
```
3. Submit to App Store Connect

### Android

1. Update `app.json` with your Android package name
2. Build the app:
```bash
eas build --platform android
```
3. Submit to Google Play Console

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@safecheck.com or join our Slack channel. 