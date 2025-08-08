import { useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Key, MapPin, Eye, EyeOff, User, Globe, Heart } from "lucide-react-native";

import { useSettingsStore } from "@/stores/settings-store";
import Colors from "@/constants/colors";

export default function SettingsScreen() {
  const { 
    googleMapsApiKey, 
    openAiApiKey, 
    userName,
    language,
    specialInterests,
    setGoogleMapsApiKey, 
    setOpenAiApiKey,
    setUserName,
    setLanguage,
    setSpecialInterests
  } = useSettingsStore();
  
  const [localGoogleKey, setLocalGoogleKey] = useState(googleMapsApiKey);
  const [localOpenAiKey, setLocalOpenAiKey] = useState(openAiApiKey);
  const [localUserName, setLocalUserName] = useState(userName);
  const [localLanguage, setLocalLanguage] = useState(language);
  const [localSpecialInterests, setLocalSpecialInterests] = useState(specialInterests);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);

  const handleSaveSettings = () => {
    setGoogleMapsApiKey(localGoogleKey);
    setOpenAiApiKey(localOpenAiKey);
    setUserName(localUserName);
    setLanguage(localLanguage);
    setSpecialInterests(localSpecialInterests);
    Alert.alert("Success", "Settings have been saved successfully!");
  };

  const handleClearSettings = () => {
    Alert.alert(
      "Clear All Settings",
      "Are you sure you want to clear all settings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setLocalGoogleKey("");
            setLocalOpenAiKey("");
            setLocalUserName("");
            setLocalLanguage("EN");
            setLocalSpecialInterests("");
            setGoogleMapsApiKey("");
            setOpenAiApiKey("");
            setUserName("");
            setLanguage("EN");
            setSpecialInterests("");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Settings</Text>
          <Text style={styles.sectionDescription}>
            Customize your experience and preferences.
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <User size={20} color={Colors.light.primary} />
            <Text style={styles.inputLabel}>Your Name</Text>
          </View>
          <Text style={styles.inputDescription}>
            Used for personalized greetings and tour recommendations.
          </Text>
          <TextInput
            style={styles.textInput}
            value={localUserName}
            onChangeText={setLocalUserName}
            placeholder="Enter your name"
            placeholderTextColor={Colors.light.inactive}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <Globe size={20} color={Colors.light.secondary} />
            <Text style={styles.inputLabel}>Language</Text>
          </View>
          <Text style={styles.inputDescription}>
            Default language for audio guides and app content.
          </Text>
          <View style={styles.languageOptions}>
            <TouchableOpacity 
              style={[
                styles.languageOption, 
                localLanguage === "EN" && styles.selectedLanguageOption
              ]}
              onPress={() => setLocalLanguage("EN")}
            >
              <Text style={[
                styles.languageOptionText,
                localLanguage === "EN" && styles.selectedLanguageOptionText
              ]}>English</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.languageOption, 
                localLanguage === "DE" && styles.selectedLanguageOption
              ]}
              onPress={() => setLocalLanguage("DE")}
            >
              <Text style={[
                styles.languageOptionText,
                localLanguage === "DE" && styles.selectedLanguageOptionText
              ]}>Deutsch</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <Heart size={20} color={Colors.light.secondary} />
            <Text style={styles.inputLabel}>Special Interests</Text>
          </View>
          <Text style={styles.inputDescription}>
            Tell us about your interests to get personalized content (e.g., "art history", "architecture", "finance and economics").
          </Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={localSpecialInterests}
            onChangeText={setLocalSpecialInterests}
            placeholder="e.g., art history, architecture, local cuisine..."
            placeholderTextColor={Colors.light.inactive}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          <Text style={styles.sectionDescription}>
            Configure your API keys to enable real location data and AI-generated content.
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <MapPin size={20} color={Colors.light.primary} />
            <Text style={styles.inputLabel}>Google Maps API Key</Text>
          </View>
          <Text style={styles.inputDescription}>
            Required for fetching real nearby places and location data.
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={localGoogleKey}
              onChangeText={setLocalGoogleKey}
              placeholder="Enter your Google Maps API key"
              placeholderTextColor={Colors.light.inactive}
              secureTextEntry={!showGoogleKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowGoogleKey(!showGoogleKey)}
            >
              {showGoogleKey ? (
                <EyeOff size={20} color={Colors.light.inactive} />
              ) : (
                <Eye size={20} color={Colors.light.inactive} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <Key size={20} color={Colors.light.secondary} />
            <Text style={styles.inputLabel}>OpenAI API Key</Text>
          </View>
          <Text style={styles.inputDescription}>
            Required for generating detailed descriptions and personalized content about sights.
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={localOpenAiKey}
              onChangeText={setLocalOpenAiKey}
              placeholder="Enter your OpenAI API key"
              placeholderTextColor={Colors.light.inactive}
              secureTextEntry={!showOpenAiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowOpenAiKey(!showOpenAiKey)}
            >
              {showOpenAiKey ? (
                <EyeOff size={20} color={Colors.light.inactive} />
              ) : (
                <Eye size={20} color={Colors.light.inactive} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to get API keys:</Text>
          <Text style={styles.infoText}>
            • Google Maps API: Visit Google Cloud Console, enable Places API, and create credentials
          </Text>
          <Text style={styles.infoText}>
            • OpenAI API: Sign up at platform.openai.com and generate an API key
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveSettings}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearSettings}
          >
            <Text style={styles.clearButtonText}>Clear All Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Status</Text>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: localUserName ? Colors.light.success : Colors.light.error }]} />
            <Text style={styles.statusText}>
              Profile: {localUserName ? "Complete" : "Incomplete"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: googleMapsApiKey ? Colors.light.success : Colors.light.error }]} />
            <Text style={styles.statusText}>
              Google Maps API: {googleMapsApiKey ? "Configured" : "Not configured"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: openAiApiKey ? Colors.light.success : Colors.light.error }]} />
            <Text style={styles.statusText}>
              OpenAI API: {openAiApiKey ? "Configured" : "Not configured"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: Colors.light.inactive,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 8,
  },
  inputDescription: {
    fontSize: 14,
    color: Colors.light.inactive,
    marginBottom: 12,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  multilineInput: {
    minHeight: 80,
  },
  eyeButton: {
    padding: 8,
  },
  languageOptions: {
    flexDirection: "row",
    gap: 12,
  },
  languageOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  selectedLanguageOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  languageOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  selectedLanguageOptionText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  infoSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.inactive,
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  clearButton: {
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  clearButtonText: {
    color: Colors.light.error,
    fontSize: 16,
    fontWeight: "500",
  },
  statusSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: Colors.light.text,
  },
});