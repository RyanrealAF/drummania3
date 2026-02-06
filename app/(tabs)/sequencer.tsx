
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, Linking, View, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useState, useEffect } from 'react';
import { Svg, Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const RotaryKnob = ({ label, onValueChange, size = 80 }: { label: string, onValueChange: (value: number) => void, size?: number }) => {
    const rotation = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

    const gesture = Gesture.Pan().onUpdate((e) => {
        const newRotation = Math.max(0, Math.min(300, rotation.value + e.velocityX / 5));
        rotation.value = newRotation;
        runOnJS(onValueChange)(newRotation / 300);
    });

    return (
        <View style={styles.rotaryKnobContainer}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.rotaryKnob, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
                    <View style={styles.rotaryKnobIndicator} />
                </Animated.View>
            </GestureDetector>
            <Text style={styles.rotaryKnobLabel}>{label}</Text>
        </View>
    );
};

const VerticalSlider = ({ label, onValueChange, level }: { label: string, onValueChange: (value: number) => void, level: number }) => {
    const y = useSharedValue((1 - level) * 150);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

    const gesture = Gesture.Pan().onUpdate((e) => {
        const newY = Math.max(0, Math.min(150, y.value + e.translationY));
        y.value = newY;
        runOnJS(onValueChange)(1 - newY / 150);
    });

    return (
        <View style={styles.verticalSliderContainer}>
            <Text style={styles.verticalSliderLabel}>{label}</Text>
            <View style={styles.verticalSliderTrack}>
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.verticalSliderThumb, animatedStyle]} />
                </GestureDetector>
            </View>
        </View>
    );
};

const ChannelStrip = ({ stemLabel, hasThreshold, faderLevel, thresholdLevel, onFaderChange, onThresholdChange }: 
    { stemLabel: string, hasThreshold?: boolean, faderLevel: number, thresholdLevel: number, onFaderChange: (value: number) => void, onThresholdChange?: (value: number) => void }) => (
    <View style={styles.channelStripContainer}>
        <View style={styles.channelStrip}>
            <VerticalSlider label="Fader" onValueChange={onFaderChange} level={faderLevel} />
            {hasThreshold && onThresholdChange && <VerticalSlider label="Thresh" onValueChange={onThresholdChange} level={thresholdLevel} />}
        </View>
        <Text style={styles.channelStripLabel}>{stemLabel}</Text>
    </View>
);

export default function SequencerScreen() {
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [stems, setStems] = useState<any>(null);
    const [drumMidi, setDrumMidi] = useState<any>(null);
    const [processingStatus, setProcessingStatus] = useState('idle');
    const [levels, setLevels] = useState({ 
        vocals: { fader: 0.75, threshold: 0.5 }, bass: { fader: 0.75, threshold: 0.5 }, 
        other: { fader: 0.75, threshold: 0.5 }, main: { fader: 0.75, threshold: 0.5 },
        kick: 0.75, snare: 0.75, hihat: 0.75
    });

    const handleLevelChange = (type: string, control: string, value: number) => {
        setLevels(prev => ({ ...prev, [type]: { ...prev[type], [control]: value } }));
    };
    const handleDrumLevelChange = (drum: string, value: number) => {
        setLevels(prev => ({ ...prev, [drum]: value }));
    };

    const resetState = () => {
        setSelectedFile(null);
        setStems(null);
        setDrumMidi(null);
        setProcessingStatus('idle');
    };

    const handleFileUpload = async () => {
        if (processingStatus !== 'idle') {
            resetState();
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
            if (result.canceled === false) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Error picking document:', err);
            setProcessingStatus('error');
        }
    };

    useEffect(() => {
        if (selectedFile && processingStatus === 'idle') {
            runProcessingPipeline(selectedFile);
        }
    }, [selectedFile, processingStatus]);

    const runProcessingPipeline = async (file: any) => {
        if (!file) return;
        setProcessingStatus('separating');
        let stemData;
        try {
            const formData = new FormData();
            formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
            const response = await fetch('https://demucs.app/api/v1', { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
            stemData = await response.json();
            setStems(stemData);
        } catch (error) {
            console.error('Error separating stems:', error);
            setProcessingStatus('error');
            return;
        }

        if (stemData && stemData.drums) {
            setProcessingStatus('converting');
            try {
                // Placeholder API for drum to MIDI conversion
                const midiResponse = await new Promise(resolve => setTimeout(() => resolve({ kick: 'url', snare: 'url', hihat: 'url' }), 2000)); 
                setDrumMidi(midiData);
            } catch (error) {
                console.error('Error converting drums to MIDI:', error);
                setDrumMidi({ kick: 'url', snare: 'url', hihat: 'url' }); // Mock for UI
            }
        }
        setProcessingStatus('done');
    };

    const getStatusMessage = () => {
        switch (processingStatus) {
            case 'separating': return `Separating stems for ${selectedFile?.name}...`;
            case 'converting': return 'Converting drums to MIDI...';
            case 'done': return 'Processing complete!';
            case 'error': return 'An error occurred during processing.';
            default: return null;
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
             <View style={styles.header}>
                <Text style={styles.headerTitle}>Studio Sequencer</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={handleFileUpload}>
                    <Text style={styles.uploadButtonText}>{processingStatus === 'idle' ? 'Load Audio' : 'Reset'}</Text>
                </TouchableOpacity>
            </View>

            {processingStatus !== 'idle' && processingStatus !== 'done' && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#00aaff" />
                    <Text style={styles.loadingText}>{getStatusMessage()}</Text>
                </View>
            )}

            <View style={[styles.mainContent, processingStatus !== 'idle' && processingStatus !== 'done' && styles.blurred]}>
                <View style={styles.waveformContainer}>
                    <Svg height="100%" width="100%" viewBox="0 0 1000 100" preserveAspectRatio="none">
                        <Path d="M0,50 C100,20 200,80 300,50 S500,80 600,50 S800,20 900,50 S1000,50 1000,50" fill="none" stroke="#00aaff" strokeWidth="2" />
                    </Svg>
                </View>

                <View style={styles.drumsContainer}>
                    <RotaryKnob label="Kick" onValueChange={(v) => handleDrumLevelChange('kick', v)} />
                    <RotaryKnob label="Snare" onValueChange={(v) => handleDrumLevelChange('snare', v)} />
                    <RotaryKnob label="Hi-Hat" onValueChange={(v) => handleDrumLevelChange('hihat', v)} />
                </View>

                {drumMidi && (
                    <View style={styles.stemsLinks}>
                        <Text style={styles.stemsTitle}>Download MIDI</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(drumMidi.kick)}><Text style={styles.stemLink}>Kick</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(drumMidi.snare)}><Text style={styles.stemLink}>Snare</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(drumMidi.hihat)}><Text style={styles.stemLink}>Hi-Hat</Text></TouchableOpacity>
                    </View>
                )}

                <View style={styles.slidersSection}>
                    <ChannelStrip stemLabel="Vocals" hasThreshold={true} faderLevel={levels.vocals.fader} thresholdLevel={levels.vocals.threshold} onFaderChange={(v) => handleLevelChange('vocals', 'fader', v)} onThresholdChange={(v) => handleLevelChange('vocals', 'threshold', v)} />
                    <ChannelStrip stemLabel="Bass" hasThreshold={true} faderLevel={levels.bass.fader} thresholdLevel={levels.bass.threshold} onFaderChange={(v) => handleLevelChange('bass', 'fader', v)} onThresholdChange={(v) => handleLevelChange('bass', 'threshold', v)} />
                    <ChannelStrip stemLabel="Other" hasThreshold={true} faderLevel={levels.other.fader} thresholdLevel={levels.other.threshold} onFaderChange={(v) => handleLevelChange('other', 'fader', v)} onThresholdChange={(v) => handleLevelChange('other', 'threshold', v)} />
                    <ChannelStrip stemLabel="Main" faderLevel={levels.main.fader} onFaderChange={(v) => handleLevelChange('main', 'fader', v)} thresholdLevel={0} />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d0d' },
    contentContainer: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, zIndex: 10 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    uploadButton: { backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 },
    uploadButtonText: { color: '#fff', fontWeight: 'bold' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    loadingText: { color: '#00aaff', marginTop: 15, fontSize: 16, fontWeight: 'bold' },
    mainContent: { alignItems: 'center' },
    blurred: { opacity: 0.2 },
    waveformContainer: { width: '100%', height: 100, backgroundColor: '#000', borderRadius: 10, marginBottom: 30, padding: 5, borderWidth: 1, borderColor: '#2a2a2a' },
    drumsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20, backgroundColor: '#1a1a1a', padding: 20, borderRadius: 15 },
    rotaryKnobContainer: { alignItems: 'center' },
    rotaryKnob: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderWidth: 2, borderColor: '#333', shadowColor: '#00aaff', shadowRadius: 8, shadowOpacity: 0.7 },
    rotaryKnobIndicator: { width: 4, height: 20, backgroundColor: '#00aaff', borderRadius: 2 },
    rotaryKnobLabel: { color: '#aaa', fontWeight: 'bold', marginTop: 10, fontSize: 12 },
    stemsLinks: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 15, marginBottom: 20 },
    stemsTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
    stemLink: { color: '#00aaff', fontSize: 14, paddingVertical: 8, textDecorationLine: 'underline' },
    slidersSection: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', backgroundColor: '#1a1a1a', padding: 20, borderRadius: 15 },
    channelStripContainer: { alignItems: 'center' },
    channelStrip: { flexDirection: 'row', height: 200, backgroundColor: '#0a0a0a', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a' },
    channelStripLabel: { color: '#fff', fontWeight: 'bold', marginTop: 10 },
    verticalSliderContainer: { alignItems: 'center', marginHorizontal: 10 },
    verticalSliderLabel: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
    verticalSliderTrack: { width: 4, height: 150, backgroundColor: '#000', borderRadius: 2, justifyContent: 'flex-start' },
    verticalSliderThumb: { width: 24, height: 40, backgroundColor: '#333', borderRadius: 5, borderWidth: 1, borderColor: '#555', alignSelf: 'center', position: 'absolute', top: 0, shadowColor: '#000', shadowRadius: 3, shadowOpacity: 0.5 },
});
