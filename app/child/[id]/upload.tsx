import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'K85403655288957'; // Free tier key

async function performOCR(imageUri: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append('file', blob, 'image.jpg');
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const ocrResponse = await fetch(OCR_API_URL, {
    method: 'POST',
    headers: {
      apikey: OCR_API_KEY,
    },
    body: formData,
  });

  const result = await ocrResponse.json();

  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
  }

  const text = result.ParsedResults?.map((r: any) => r.ParsedText).join('\n') || '';
  return text.trim();
}

export default function UploadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, addSession } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];

  const child = children.find(c => c.id === id);

  const [bookTitle, setBookTitle] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'review'>('upload');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  const pickImage = async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        `Please grant ${useCamera ? 'camera' : 'photo library'} access to use this feature.`
      );
      return;
    }

    const launchFn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: !useCamera,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      setCapturedImages(prev => [...prev, ...newUris]);
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractText = async () => {
    if (capturedImages.length === 0) return;

    setOcrLoading(true);
    try {
      const results: string[] = [];
      for (const uri of capturedImages) {
        const text = await performOCR(uri);
        if (text) results.push(text);
      }

      const combined = results.join('\n\n');
      if (combined) {
        setExtractedText(prev => prev ? `${prev}\n\n${combined}` : combined);
        setActiveTab('review');
      } else {
        Alert.alert('No Text Found', 'Could not detect any text in the image(s). Try taking a clearer photo.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('OCR Error', 'Failed to extract text. Please try again or enter text manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedText.trim()) return;

    setLoading(true);
    try {
      await addSession(
        id,
        bookTitle.trim() || 'Reading Session',
        extractedText.trim()
      );
      router.back();
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>New Session</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Book Title Input */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Book Title (optional)</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.background,
                color: colors.onSurface,
                borderColor: colors.outline,
              }]}
              placeholder="Enter the book name..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={bookTitle}
              onChangeText={setBookTitle}
            />
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'upload' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('upload')}
            >
              <Ionicons
                name="camera"
                size={18}
                color={activeTab === 'upload' ? colors.onPrimary : colors.onSurfaceVariant}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'upload' ? colors.onPrimary : colors.onSurfaceVariant }
              ]}>
                Capture
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'review' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('review')}
            >
              <Ionicons
                name="document-text"
                size={18}
                color={activeTab === 'review' ? colors.onPrimary : colors.onSurfaceVariant}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'review' ? colors.onPrimary : colors.onSurfaceVariant }
              ]}>
                Review
              </Text>
              {extractedText.length > 0 && (
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          </View>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {/* Capture Buttons */}
              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={[styles.captureButton, { backgroundColor: colors.primary }]}
                  onPress={() => pickImage(true)}
                  disabled={ocrLoading}
                >
                  <Ionicons name="camera" size={28} color={colors.onPrimary} />
                  <Text style={[styles.captureButtonText, { color: colors.onPrimary }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => pickImage(false)}
                  disabled={ocrLoading}
                >
                  <Ionicons name="images" size={28} color={colors.onSurface} />
                  <Text style={[styles.captureButtonText, { color: colors.onSurface }]}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Image Previews */}
              {capturedImages.length > 0 && (
                <View style={styles.previewSection}>
                  <Text style={[styles.previewLabel, { color: colors.onSurface }]}>
                    {capturedImages.length} page{capturedImages.length !== 1 ? 's' : ''} captured
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewScroll}
                  >
                    {capturedImages.map((uri, index) => (
                      <View key={index} style={styles.previewContainer}>
                        <Image source={{ uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Extract Text Button */}
                  <TouchableOpacity
                    style={[styles.extractButton, { backgroundColor: colors.primary }]}
                    onPress={handleExtractText}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? (
                      <View style={styles.extractingRow}>
                        <ActivityIndicator color={colors.onPrimary} size="small" />
                        <Text style={[styles.extractButtonText, { color: colors.onPrimary }]}>
                          Extracting text...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.extractingRow}>
                        <Ionicons name="scan" size={20} color={colors.onPrimary} />
                        <Text style={[styles.extractButtonText, { color: colors.onPrimary }]}>
                          Extract Text (OCR)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Hint when no images */}
              {capturedImages.length === 0 && (
                <View style={styles.hintArea}>
                  <Ionicons name="book-outline" size={40} color={colors.onSurfaceVariant} />
                  <Text style={[styles.hintText, { color: colors.onSurfaceVariant }]}>
                    Take a photo of a book page or choose from your gallery to automatically extract text.
                  </Text>
                  <TouchableOpacity
                    style={[styles.manualButton, { borderColor: colors.outline }]}
                    onPress={() => setActiveTab('review')}
                  >
                    <Text style={[styles.manualButtonText, { color: colors.onSurfaceVariant }]}>
                      Or enter text manually
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Review Tab */}
          {activeTab === 'review' && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Extracted Text</Text>
                <Text style={[styles.editHint, { color: colors.onSurfaceVariant }]}>
                  Edit to add or remove words
                </Text>
              </View>
              <TextInput
                style={[styles.textArea, {
                  backgroundColor: colors.background,
                  color: colors.onSurface,
                  borderColor: colors.outline,
                }]}
                placeholder="Enter or paste text here..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={extractedText}
                onChangeText={setExtractedText}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: extractedText.trim() ? colors.primary : colors.surfaceVariant,
                    opacity: extractedText.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleSave}
                disabled={!extractedText.trim() || loading}
              >
                {loading ? (
                  <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                    Processing...
                  </Text>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                    <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                      Save Session
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 4,
  },
  captureButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  captureButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 8,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewSection: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  previewScroll: {
    gap: 12,
  },
  previewContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  extractButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  extractingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintArea: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  manualButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editHint: {
    fontSize: 12,
  },
  textArea: {
    minHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
