
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SequencerScreen() {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stems, setStems] = useState<any>(null);
  const [midiUrl, setMidiUrl] = useState<string | null>(null);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false) {
        setSelectedFile(result);
        setStems(null);
        setMidiUrl(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleStemSeparation = async () => {
    if (selectedFile) {
      setIsLoading(true);
      setStems(null);
      setMidiUrl(null);

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.assets[0].uri,
        name: selectedFile.assets[0].name,
        type: selectedFile.assets[0].mimeType,
      } as any);

      try {
        const response = await fetch('https://demucs.app/api/v1', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = await response.json();
        setStems(data);
      } catch (error) {
        console.error('Error separating stems:', error);
      }

      setIsLoading(false);
    }
  };

  const handleMidiConversion = async () => {
    if (stems && stems.drums) {
      setIsLoading(true);
      try {
        const response = await fetch('https://audio-to-midi-api.com/v1', { // This is a placeholder API
          method: 'POST',
          body: JSON.stringify({ audio_url: stems.drums }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setMidiUrl(data.midi_url);
      } catch (error) {
        console.error('Error converting to MIDI:', error);
      }
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Audio Sequencer</ThemedText>
      <TouchableOpacity style={styles.button} onPress={handleFileUpload}>
        <Text style={styles.buttonText}>Upload Audio File</Text>
      </TouchableOpacity>
      {selectedFile && (
        <ThemedText style={styles.fileName}>Selected file: {selectedFile.assets[0].name}</ThemedText>
      )}
      <TouchableOpacity
        style={[styles.button, (!selectedFile || isLoading) && styles.disabledButton]}
        onPress={handleStemSeparation}
        disabled={!selectedFile || isLoading}
      >
        <Text style={styles.buttonText}>Separate Stems</Text>
      </TouchableOpacity>
      {isLoading && <ActivityIndicator size="large" color="#007BFF" />}
      {stems && (
        <ThemedView style={styles.stemsContainer}>
          <ThemedText type="subtitle">Separated Stems:</ThemedText>
          <Text>Drums: {stems.drums}</Text>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleMidiConversion}
            disabled={isLoading}>
            <Text style={styles.buttonText}>Convert to MIDI</Text>
          </TouchableOpacity>
          <Text>Bass: {stems.bass}</Text>
          <Text>Vocals: {stems.vocals}</Text>
          <Text>Other: {stems.other}</Text>
        </ThemedView>
      )}
      {midiUrl && (
        <ThemedView style={styles.midiContainer}>
          <ThemedText type="subtitle">Generated MIDI:</ThemedText>
          <TouchableOpacity onPress={() => Linking.openURL(midiUrl)}>
            <Text style={styles.link}>{midiUrl}</Text>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  fileName: {
    marginTop: 10,
  },
  stemsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  midiContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
});
