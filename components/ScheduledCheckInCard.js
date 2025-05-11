import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, IconButton, Menu, Switch, Chip } from 'react-native-paper';
import { format } from 'date-fns';

const ScheduledCheckInCard = ({ schedule, onEdit, onDelete, onToggle }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const getFrequencyText = () => {
    switch (schedule.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return `Weekly on ${format(new Date(schedule.time), 'EEEE')}`;
      case 'custom':
        return `Custom: ${schedule.customDays.join(', ')}`;
      default:
        return 'Unknown';
    }
  };

  const getTimeText = () => {
    return format(new Date(schedule.time), 'h:mm a');
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{schedule.name}</Text>
            <View style={styles.chipContainer}>
              <Chip icon="clock" style={styles.chip}>{getTimeText()}</Chip>
              <Chip icon="calendar" style={styles.chip}>{getFrequencyText()}</Chip>
            </View>
          </View>
          
          <View style={styles.controls}>
            <Switch
              value={schedule.enabled}
              onValueChange={() => onToggle(schedule.id)}
              color="#1976D2"
            />
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
                  onEdit(schedule.id);
                }} 
                title="Edit Schedule" 
                icon="pencil"
              />
              <Menu.Item 
                onPress={() => {
                  closeMenu();
                  onDelete(schedule.id);
                }} 
                title="Delete Schedule" 
                icon="delete"
              />
            </Menu>
          </View>
        </View>
      </Card.Content>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E3F2FD',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    margin: 0,
  },
});

export default ScheduledCheckInCard; 