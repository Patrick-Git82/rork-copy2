import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Modal, Platform, ActivityIndicator, FlatList, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Bookmark, BookmarkCheck, Volume2, Archive, Trash2, Calendar, Globe, Clock, Pause } from "lucide-react-native";
// import * as Speech from "expo-speech"; // (no direct import; utils/tts will lazy-load expo-speech if needed)
import * as Haptics from "expo-haptics";

import { speakNatural, stopNatural } from "@/utils/tts";

import { useSightsStore } from "@/stores/sights-store";
import { useSettingsStore, AudioLength } from "@/stores/settings-store";
import { SavedContent } from "@/types/sight";
import Colors from "@/constants/colors";

export default function SightDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { sights, toggleFavorite, favorites, generateSightContent, deleteSavedContent } = useSightsStore();
  const { openAiApiKey, language: defaultLanguage, audioLength, specialInterests } = useSettingsStore();
  
  // Handle both string and string array from useLocalSearchParams
  const sightId = Array.isArray(id) ? id[0] : id;
  const sight = sights.find(s => s.id.toString() === sightId);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [savedContentModalVisible, setSavedContentModalVisible] = useState(false);
  const [selectedLength, setSelectedLength] = useState<AudioLength>(audioLength);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [currentSavedContent, setCurrentSavedContent] = useState<SavedContent | null>(null);

  useEffect(() => {
    return () => {
      if (isSpeaking) stopNatural();
    };
  }, [isSpeaking]);

  if (!sight) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Sight not found</Text>
      </View>
    );
  }

  // Check if sight is in favorites (handle both string and number IDs)
  const isFavorite = favorites.includes(sight.id.toString());

  const handleFavoritePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite(sight.id);
  };

  const startSpeech = async () => {
    setIsGenerating(true);
    try {
      const text = await generateSightContent(sight, defaultLanguage, selectedLength);
      setGeneratedContent(text);
      await speakNatural(text, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
      
    } catch (e) {
      console.error("Error generating or speaking content:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopSpeech = () => {
    stopNatural();
    setIsSpeaking(false);
  };

  const handlePlayPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isSpeaking) {
      stopSpeech();
    } else {
      setModalVisible(true);
    }
  };

  const confirmAudioSettings = () => {
    setModalVisible(false);
    startSpeech();
  };

  const displayContent = generatedContent || currentSavedContent?.content || (defaultLanguage === "EN" ? sight.briefDescription : sight.briefDescriptionDE);
  
  const handleDeleteSavedContent = (contentId: string) => {
    Alert.alert(
      "Delete Saved Content",
      "Are you sure you want to delete this saved content?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSavedContent(sight.id, contentId);
            if (currentSavedContent?.id === contentId) {
              setCurrentSavedContent(null);
              setGeneratedContent("");
            }
          },
        },
      ]
    );
  };
  
  const handleLoadSavedContent = (content: SavedContent) => {
    setCurrentSavedContent(content);
    setGeneratedContent(content.content);
    setSavedContentModalVisible(false);
  };
  
  const formatContentAttributes = (content: SavedContent) => {
    return `${content.language} • ${content.length} • ${content.interests}`;
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: sight.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleFavoritePress} style={styles.favoriteButton}>
              {isFavorite ? (
                <BookmarkCheck size={24} color={Colors.light.primary} />
              ) : (
                <Bookmark size={24} color={Colors.light.text} />
              )}
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Image 
          source={{ uri: sight.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{sight.name}</Text>
            <Text style={styles.category}>{sight.category}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.distance}>{sight.distance} km away</Text>
            {sight.yearBuilt && (
              <Text style={styles.year}>Built in {sight.yearBuilt}</Text>
            )}
            {sight.rating && (
              <Text style={styles.rating}>★ {sight.rating}</Text>
            )}
          </View>
          
          <Text style={styles.description}>
            {displayContent}
          </Text>
          
          {/* Current content info */}
          {currentSavedContent && (
            <View style={styles.contentInfo}>
              <Text style={styles.contentInfoTitle}>Current Content:</Text>
              <Text style={styles.contentInfoText}>
                {formatContentAttributes(currentSavedContent)}
              </Text>
              <Text style={styles.contentInfoDate}>
                Generated: {new Date(currentSavedContent.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {/* Saved content button */}
          {sight.savedContent && sight.savedContent.length > 0 && (
            <TouchableOpacity 
              style={styles.savedContentButton}
              onPress={() => setSavedContentModalVisible(true)}
            >
              <Archive size={20} color={Colors.light.primary} />
              <Text style={styles.savedContentButtonText}>
                View Saved Content ({sight.savedContent.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {!openAiApiKey && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                💡 Add your OpenAI API key in Settings to get AI-generated personalized descriptions
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.audioButton, isGenerating && styles.audioButtonDisabled]}
            onPress={handlePlayPress}
            disabled={isGenerating}
          >
            <View style={styles.audioButtonContent}>
              {isGenerating ? (
                <ActivityIndicator size={20} color="#FFFFFF" />
              ) : isSpeaking ? (
                <Pause size={20} color="#FFFFFF" />
              ) : (
                <Volume2 size={20} color="#FFFFFF" />
              )}
              <Text style={styles.audioButtonText}>
                {isGenerating ? "Generating Content..." : isSpeaking ? "Stop Audio Guide" : `Listen to Audio Guide (${defaultLanguage})`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Audio Guide Settings</Text>
            
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Information Length</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity 
                  style={[
                    styles.optionButton, 
                    selectedLength === "brief" && styles.selectedOption
                  ]}
                  onPress={() => setSelectedLength("brief")}
                >
                  <Text style={[
                    styles.optionText,
                    selectedLength === "brief" && styles.selectedOptionText
                  ]}>Brief</Text>
                  <Text style={[
                    styles.optionSubtext,
                    selectedLength === "brief" && styles.selectedOptionText
                  ]}>1 min</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.optionButton, 
                    selectedLength === "medium" && styles.selectedOption
                  ]}
                  onPress={() => setSelectedLength("medium")}
                >
                  <Text style={[
                    styles.optionText,
                    selectedLength === "medium" && styles.selectedOptionText
                  ]}>Medium</Text>
                  <Text style={[
                    styles.optionSubtext,
                    selectedLength === "medium" && styles.selectedOptionText
                  ]}>2 min</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.optionButton, 
                    selectedLength === "expert" && styles.selectedOption
                  ]}
                  onPress={() => setSelectedLength("expert")}
                >
                  <Text style={[
                    styles.optionText,
                    selectedLength === "expert" && styles.selectedOptionText
                  ]}>Expert</Text>
                  <Text style={[
                    styles.optionSubtext,
                    selectedLength === "expert" && styles.selectedOptionText
                  ]}>5 min</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.languageInfo}>
              <Text style={styles.languageInfoText}>
                🌐 Language: {defaultLanguage === "EN" ? "English" : "Deutsch"}
              </Text>
              <Text style={styles.languageInfoSubtext}>
                Change language in Settings
              </Text>
            </View>
            
            {openAiApiKey && (
              <View style={styles.aiNotice}>
                <Text style={styles.aiNoticeText}>
                  ✨ AI will generate personalized content based on your interests
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmAudioSettings}
              >
                <Text style={styles.confirmButtonText}>Start Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Saved Content Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={savedContentModalVisible}
        onRequestClose={() => setSavedContentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.savedContentModal}>
            <Text style={styles.modalTitle}>Saved Content</Text>
            
            <FlatList
              data={sight.savedContent || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.savedContentItem}>
                  <TouchableOpacity
                    style={styles.savedContentInfo}
                    onPress={() => handleLoadSavedContent(item)}
                  >
                    <View style={styles.savedContentHeader}>
                      <Text style={styles.savedContentAttributes}>
                        {formatContentAttributes(item)}
                      </Text>
                      <Text style={styles.savedContentDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <Text style={styles.savedContentPreview} numberOfLines={2}>
                      {item.content}
                    </Text>
                    
                    <View style={styles.savedContentTags}>
                      <View style={styles.tag}>
                        <Globe size={12} color={Colors.light.primary} />
                        <Text style={styles.tagText}>{item.language}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Clock size={12} color={Colors.light.primary} />
                        <Text style={styles.tagText}>{item.length}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Calendar size={12} color={Colors.light.primary} />
                        <Text style={styles.tagText}>{item.interests}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteContentButton}
                    onPress={() => handleDeleteSavedContent(item.id)}
                  >
                    <Trash2 size={16} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.savedContentList}
              ListEmptyComponent={
                <View style={styles.emptySavedContent}>
                  <Archive size={48} color={Colors.light.inactive} />
                  <Text style={styles.emptySavedContentText}>
                    No saved content yet. Generate content to save it automatically.
                  </Text>
                </View>
              }
            />
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSavedContentModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 250,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: Colors.light.inactive,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 16,
  },
  distance: {
    fontSize: 14,
    color: Colors.light.primary,
  },
  year: {
    fontSize: 14,
    color: Colors.light.text,
  },
  rating: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
    marginBottom: 16,
  },
  warningContainer: {
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  audioButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  audioButtonDisabled: {
    opacity: 0.7,
  },
  audioButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  audioButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: "center",
  },
  optionSection: {
    marginBottom: 20,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  selectedOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  optionText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "600",
  },
  optionSubtext: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  languageInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  languageInfoText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  languageInfoSubtext: {
    fontSize: 12,
    color: Colors.light.inactive,
    marginTop: 2,
  },
  aiNotice: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  aiNoticeText: {
    fontSize: 14,
    color: Colors.light.primary,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  contentInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  contentInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  contentInfoText: {
    fontSize: 13,
    color: Colors.light.primary,
    marginBottom: 2,
  },
  contentInfoDate: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  savedContentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  savedContentButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  savedContentModal: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  savedContentList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  savedContentItem: {
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  savedContentInfo: {
    flex: 1,
    marginRight: 12,
  },
  savedContentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  savedContentAttributes: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
  },
  savedContentDate: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  savedContentPreview: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  savedContentTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  deleteContentButton: {
    padding: 8,
  },
  emptySavedContent: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  emptySavedContentText: {
    fontSize: 14,
    color: Colors.light.inactive,
    textAlign: "center",
    maxWidth: 250,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: "500",
  },
});