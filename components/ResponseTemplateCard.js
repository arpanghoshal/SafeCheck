import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Menu, Button } from 'react-native-paper';

const ResponseTemplateCard = ({ template, onEdit, onDelete, onUse }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{template.name}</Text>
            <Text style={styles.message}>{template.message}</Text>
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
                onEdit(template.id);
              }} 
              title="Edit Template" 
              icon="pencil"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                onDelete(template.id);
              }} 
              title="Delete Template" 
              icon="delete"
            />
          </Menu>
        </View>
      </Card.Content>
      
      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => onUse(template)}
          icon="send"
          style={styles.useButton}
          labelStyle={styles.buttonLabel}
        >
          Use Template
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
  message: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  menuButton: {
    margin: 0,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  useButton: {
    borderRadius: 8,
    backgroundColor: '#1976D2',
  },
  buttonLabel: {
    fontSize: 14,
    letterSpacing: 0.25,
    fontWeight: '500',
  },
});

export default ResponseTemplateCard; 