import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Button, IconButton, Menu, Avatar, Badge, Chip, Surface } from 'react-native-paper';
import { getDateTimeString, getTimeString } from '../utils/dateTime';

const EnhancedCheckInCard = ({ 
  contact, 
  latestCheckIn, 
  hasAlert,
  hasActiveStatus,
  onSendCheckIn, 
  onViewHistory, 
  onEditContact 
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const getLastCheckInText = () => {
    if (!latestCheckIn) {
      return 'No check-ins sent yet';
    }
    
    const timeString = getDateTimeString(latestCheckIn.sentAt);
    
    if (latestCheckIn.status === 'pending') {
      return `Sent ${timeString} • Awaiting response`;
    } else if (latestCheckIn.status === 'responded') {
      const responseTime = getTimeString(latestCheckIn.respondedAt);
      
      if (latestCheckIn.response === 'NO' || latestCheckIn.response === contact?.negativeResponse) {
        return `Responded ${responseTime} • Needs attention`;
      } else if (latestCheckIn.responseType === 'photo') {
        return `Responded ${responseTime} • Photo shared`;
      } else if (latestCheckIn.responseType === 'voice') {
        return `Responded ${responseTime} • Voice message`;
      } else if (latestCheckIn.responseType === 'location') {
        return `Responded ${responseTime} • Location shared`;
      } else if (latestCheckIn.responseType === 'status' && hasActiveStatus) {
        const expiryTime = getTimeString(latestCheckIn.statusExpiresAt);
        return `Status active until ${expiryTime}`;
      } else {
        return `Responded ${responseTime}`;
      }
    } else if (latestCheckIn.status === 'expired') {
      return `Sent ${timeString} • No response`;
    }
    
    return `Last check-in: ${timeString}`;
  };

  const getStatusColor = () => {
    if (!latestCheckIn) return '#9E9E9E'; // Gray for no check-ins
    
    if (latestCheckIn.status === 'pending') {
      // If pending for more than 4 hours, show alert
      const hoursSinceSent = (new Date() - latestCheckIn.sentAt) / (1000 * 60 * 60);
      return hoursSinceSent > 4 ? '#F44336' : '#FFC107'; // Red if over 4 hours, yellow if pending
    } else if (latestCheckIn.status === 'responded') {
      if (latestCheckIn.response === 'NO' || latestCheckIn.response === contact?.negativeResponse) {
        return '#F44336'; // Red for negative response
      } else if (latestCheckIn.responseType === 'status' && hasActiveStatus) {
        return '#2196F3'; // Blue for active status
      } else {
        return '#4CAF50'; // Green for positive response
      }
    } else if (latestCheckIn.status === 'expired') {
      return '#F44336'; // Red for expired check-ins
    }
    
    return '#9E9E9E'; // Gray default
  };

  const renderLatestResponse = () => {
    if (!latestCheckIn || latestCheckIn.status !== 'responded') return null;
    
    if (latestCheckIn.responseType === 'status' && hasActiveStatus) {
      // Show status message
      return (
        <Surface style={styles.statusContainer}>
          <Text style={styles.statusText}>"{latestCheckIn.response}"</Text>
        </Surface>
      );
    } else if (latestCheckIn.responseType === 'photo' || 
               latestCheckIn.responseType === 'voice' || 
               latestCheckIn.responseType === 'location') {
      // Show media response indicator
      const iconName = 
        latestCheckIn.responseType === 'photo' ? 'image' :
        latestCheckIn.responseType === 'voice' ? 'microphone' : 'map-marker';
      
      return (
        <Chip 
          icon={iconName} 
          style={styles.mediaChip}
          onPress={onViewHistory}
        >
          View {latestCheckIn.responseType}
        </Chip>
      );
    }
    
    return null;
  };

  return (
    <Card style={[styles.card, hasAlert && styles.alertCard]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar.Text 
              size={40} 
              label={contact.name.charAt(0)} 
              style={[styles.avatar, { backgroundColor: getStatusColor() }]}
            />
            {hasAlert && <Badge style={styles.alertBadge} size={12} />}
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.lastCheckIn}>{getLastCheckInText()}</Text>
          </View>
          
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={openMenu}
              />
            }
          >
            <Menu.Item 
              onPress={() => {
                closeMenu();
                onViewHistory();
              }}
              title="View History" 
              leadingIcon="history"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                onEditContact();
              }}
              title="Edit Contact" 
              leadingIcon="pencil"
            />
          </Menu>
        </View>
        
        {renderLatestResponse()}
      </Card.Content>
      
      <Card.Actions style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onViewHistory}
          icon="history"
        >
          History
        </Button>
        
        <Button
          mode="contained"
          onPress={onSendCheckIn}
          icon="send"
          style={[
            styles.checkInButton,
            hasAlert && styles.alertCheckInButton
          ]}
        >
          Check In
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    marginTop: 4,
  },
  alertBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: '#F44336',
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastCheckIn: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  checkInButton: {
    backgroundColor: '#2196F3',
  },
  alertCheckInButton: {
    backgroundColor: '#F44336',
  },
  statusContainer: {
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    fontStyle: 'italic',
  },
  mediaChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
});

export default EnhancedCheckInCard; 