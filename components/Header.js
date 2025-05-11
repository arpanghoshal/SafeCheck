import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Header = ({ title, subtitle, showBackButton, onBackPress, rightIcon, onRightIconPress }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
      <View style={styles.titleContainer}>
        {showBackButton && (
          <IconButton
            icon="arrow-left"
            size={26}
            color="#fff"
            onPress={onBackPress}
            style={styles.backButton}
          />
        )}
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        
        {rightIcon && (
          <IconButton
            icon={rightIcon}
            size={24}
            color="#fff"
            onPress={onRightIconPress}
            style={styles.rightButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1976D2', // Darker blue for better contrast
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  backButton: {
    margin: 0,
    marginRight: 8,
  },
  rightButton: {
    margin: 0,
    marginLeft: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    letterSpacing: 0.25,
  },
});

export default Header; 