import { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Modal } from "react-native";
import { X, MapPin, Clock, Car, Route, Settings as SettingsIcon } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useSettingsStore, TourWizardSettings, AudioLength, TransportMode, TourType } from "@/stores/settings-store";
import { SightTier } from "@/types/sight";

interface TourWizardProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (settings: TourWizardSettings) => void;
}

const AUDIO_LENGTHS: { value: AudioLength; label: string; description: string }[] = [
  { value: "brief", label: "Brief", description: "1 min" },
  { value: "medium", label: "Medium", description: "2 min" },
  { value: "expert", label: "Expert", description: "5 min" },
];

const TRANSPORT_MODES: { value: TransportMode; label: string; icon: string }[] = [
  { value: "walk", label: "Walking", icon: "🚶" },
  { value: "taxi", label: "Taxi", icon: "🚕" },
  { value: "public", label: "Public Transport", icon: "🚌" },
  { value: "mix", label: "Mixed", icon: "🚶🚕" },
];

const TOUR_TYPES: { value: TourType; label: string; description: string }[] = [
  { value: "round-trip", label: "Round Trip", description: "Return to starting point" },
  { value: "point-to-point", label: "Point to Point", description: "End at different location" },
];

export function TourWizard({ visible, onClose, onGenerate }: TourWizardProps) {
  const { tourWizardSettings, setTourWizardSettings, resetTourWizardToDefaults } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<TourWizardSettings>(tourWizardSettings);

  const updateSetting = <K extends keyof TourWizardSettings>(key: K, value: TourWizardSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleTier = (tier: SightTier) => {
    const currentTiers = localSettings.interestLevel;
    if (currentTiers.includes(tier)) {
      updateSetting('interestLevel', currentTiers.filter(t => t !== tier));
    } else {
      updateSetting('interestLevel', [...currentTiers, tier].sort() as SightTier[]);
    }
  };

  const handleGenerate = () => {
    setTourWizardSettings(localSettings);
    onGenerate(localSettings);
    onClose();
  };

  const handleReset = () => {
    resetTourWizardToDefaults();
    setLocalSettings({
      numberOfDays: 1,
      dailyDurationHours: 2,
      maxLengthKm: 5,
      transportMode: "walk",
      interestLevel: [1, 2],
      tourType: "round-trip",
      detailLevelPerSight: "medium",
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Tour Wizard</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Duration Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duration</Text>
              
              <View style={styles.row}>
                <Text style={styles.label}>Number of days:</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateSetting('numberOfDays', Math.max(1, localSettings.numberOfDays - 1))}
                  >
                    <Text style={styles.numberButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{localSettings.numberOfDays}</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateSetting('numberOfDays', Math.min(7, localSettings.numberOfDays + 1))}
                  >
                    <Text style={styles.numberButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Daily duration (hours):</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateSetting('dailyDurationHours', Math.max(1, localSettings.dailyDurationHours - 0.5))}
                  >
                    <Text style={styles.numberButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{localSettings.dailyDurationHours}</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateSetting('dailyDurationHours', Math.min(12, localSettings.dailyDurationHours + 0.5))}
                  >
                    <Text style={styles.numberButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Max length (km):</Text>
                <TextInput
                  style={styles.textInput}
                  value={localSettings.maxLengthKm.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    updateSetting('maxLengthKm', Math.max(0, value));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="5"
                />
              </View>
            </View>

            {/* Transport Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transport Mode</Text>
              <View style={styles.optionsGrid}>
                {TRANSPORT_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[
                      styles.optionCard,
                      localSettings.transportMode === mode.value && styles.selectedOption
                    ]}
                    onPress={() => updateSetting('transportMode', mode.value)}
                  >
                    <Text style={styles.optionIcon}>{mode.icon}</Text>
                    <Text style={[
                      styles.optionText,
                      localSettings.transportMode === mode.value && styles.selectedOptionText
                    ]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Interest Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interest Level (Tiers)</Text>
              <View style={styles.tierOptions}>
                {[1, 2, 3].map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      styles.tierOption,
                      localSettings.interestLevel.includes(tier as SightTier) && styles.selectedTierOption
                    ]}
                    onPress={() => toggleTier(tier as SightTier)}
                  >
                    <Text style={styles.tierIcon}>
                      {tier === 1 ? '👑' : tier === 2 ? '⭐' : '👁️'}
                    </Text>
                    <View style={styles.tierInfo}>
                      <Text style={[
                        styles.tierTitle,
                        localSettings.interestLevel.includes(tier as SightTier) && styles.selectedTierText
                      ]}>
                        Tier {tier} - {tier === 1 ? 'Top' : tier === 2 ? 'Popular' : 'Niche'} Sights
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tour Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tour Type</Text>
              <View style={styles.tourTypeOptions}>
                {TOUR_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.tourTypeOption,
                      localSettings.tourType === type.value && styles.selectedTourType
                    ]}
                    onPress={() => updateSetting('tourType', type.value)}
                  >
                    <Text style={[
                      styles.tourTypeLabel,
                      localSettings.tourType === type.value && styles.selectedTourTypeText
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={[
                      styles.tourTypeDescription,
                      localSettings.tourType === type.value && styles.selectedTourTypeText
                    ]}>
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Detail Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detail Level per Sight</Text>
              <View style={styles.audioOptions}>
                {AUDIO_LENGTHS.map((length) => (
                  <TouchableOpacity
                    key={length.value}
                    style={[
                      styles.audioOption,
                      localSettings.detailLevelPerSight === length.value && styles.selectedAudioOption
                    ]}
                    onPress={() => updateSetting('detailLevelPerSight', length.value)}
                  >
                    <Text style={[
                      styles.audioLabel,
                      localSettings.detailLevelPerSight === length.value && styles.selectedAudioText
                    ]}>
                      {length.label}
                    </Text>
                    <Text style={[
                      styles.audioDescription,
                      localSettings.detailLevelPerSight === length.value && styles.selectedAudioText
                    ]}>
                      {length.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>Generate Tour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  numberInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  numberButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
    minWidth: 40,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.light.text,
    minWidth: 80,
    textAlign: "center",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  selectedOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
  tierOptions: {
    gap: 8,
  },
  tierOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  selectedTierOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tierIcon: {
    fontSize: 20,
  },
  tierInfo: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
  },
  selectedTierText: {
    color: "#FFFFFF",
  },
  tourTypeOptions: {
    gap: 8,
  },
  tourTypeOption: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
  },
  selectedTourType: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tourTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  tourTypeDescription: {
    fontSize: 14,
    color: Colors.light.inactive,
  },
  selectedTourTypeText: {
    color: "#FFFFFF",
  },
  audioOptions: {
    flexDirection: "row",
    gap: 8,
  },
  audioOption: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  selectedAudioOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  audioLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  audioDescription: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  selectedAudioText: {
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
  },
  generateButton: {
    flex: 2,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});