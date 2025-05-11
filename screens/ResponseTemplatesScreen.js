import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, FAB, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import ResponseTemplateCard from '../components/ResponseTemplateCard';

const ResponseTemplatesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templatesRef = collection(db, 'responseTemplates');
      const q = query(templatesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTemplates = [];
      querySnapshot.forEach((doc) => {
        loadedTemplates.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load response templates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateMessage('');
    setModalVisible(true);
  };

  const handleEditTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateMessage(template.message);
      setModalVisible(true);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteDoc(doc(db, 'responseTemplates', templateId));
      setTemplates(templates.filter(t => t.id !== templateId));
      Alert.alert('Success', 'Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template');
    }
  };

  const handleUseTemplate = (template) => {
    // Navigate back to the check-in screen with the selected template
    navigation.navigate('CheckIn', { template });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        message: templateMessage.trim(),
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      if (editingTemplate) {
        await updateDoc(doc(db, 'responseTemplates', editingTemplate.id), templateData);
        setTemplates(templates.map(t => 
          t.id === editingTemplate.id ? { ...t, ...templateData } : t
        ));
      } else {
        const docRef = await addDoc(collection(db, 'responseTemplates'), templateData);
        setTemplates([...templates, { id: docRef.id, ...templateData }]);
      }

      setModalVisible(false);
      Alert.alert('Success', `Template ${editingTemplate ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', `Failed to ${editingTemplate ? 'update' : 'create'} template`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Response Templates</Text>
        <Text style={styles.subtitle}>Create and manage quick response templates</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading templates...</Text>
        ) : templates.length === 0 ? (
          <Text style={styles.emptyText}>No templates yet. Create your first one!</Text>
        ) : (
          templates.map((template) => (
            <ResponseTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onUse={handleUseTemplate}
            />
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </Text>
          
          <TextInput
            label="Template Name"
            value={templateName}
            onChangeText={setTemplateName}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Message"
            value={templateMessage}
            onChangeText={setTemplateMessage}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveTemplate}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddTemplate}
        label="New Template"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#757575',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#757575',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976D2',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1976D2',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
});

export default ResponseTemplatesScreen; 