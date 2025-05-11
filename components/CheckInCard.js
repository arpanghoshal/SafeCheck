import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, IconButton, Menu, Avatar } from 'react-native-paper';
import { useState } from 'react';

const formatDate = (timestamp) => {
  if (!timestamp) return 'No check-ins sent yet';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  return `Last check-in: ${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const getInitials = (name) => {
  if (!name) return "?";
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

const CheckInCard = ({ contact, onSendCheckIn, onViewHistory, onEditContact }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  
  // Define colors based on last check-in time
  const getStatusColor = () => {
    if (!contact.lastCheckIn) return '#9E9E9E'; // Gray for no check-ins
    
    const date = contact.lastCheckIn.toDate ? contact.lastCheckIn.toDate() : new Date(contact.lastCheckIn);
    const now = new Date();
    const differenceHours = (now - date) / (1000 * 60 * 60);
    
    if (differenceHours < 24) return '#4CAF50'; // Green for recent
    if (differenceHours < 72) return '#FFC107'; // Yellow for medium
    return '#F44336'; // Red for old
  };
  
  const statusColor = getStatusColor();
  
  return (
    <Card style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
      <Card.Content>
        <View style={styles.header}>
          <Avatar.Text 
            size={50} 
            label={getInitials(contact.name)}
            style={[styles.avatar, { backgroundColor: statusColor }]}
          />
          
          <View style={styles.titleContainer}>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.lastCheckIn}>{formatDate(contact.lastCheckIn)}</Text>
          </View>
          
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={openMenu}
                style={styles.menuButton}
              />
            }
          >
            <Menu.Item 
              onPress={() => {
                closeMenu();
                onEditContact();
              }} 
              title="Edit Contact" 
              icon="account-edit"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                onViewHistory();
              }} 
              title="View History" 
              icon="history"
            />
          </Menu>
        </View>
      </Card.Content>
      
      <Card.Actions style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onViewHistory}
          icon="history"
          style={styles.historyButton}
          labelStyle={styles.buttonLabel}
        >
          History
        </Button>
        
        <Button
          mode="contained"
          onPress={onSendCheckIn}
          icon="send"
          style={styles.checkInButton}
          labelStyle={styles.buttonLabel}
        >
          Check In Now
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.25,
  },
  lastCheckIn: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  menuButton: {
    margin: 0,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  historyButton: {
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  checkInButton: {
    borderRadius: 8,
    flex: 1.5,
    backgroundColor: '#1976D2',
  },
  buttonLabel: {
    fontSize: 14,
    letterSpacing: 0.25,
    fontWeight: '500',
  },
});

export default CheckInCard; 