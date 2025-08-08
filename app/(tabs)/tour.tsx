import { useState } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { MapPin, Navigation, Shuffle, Save, Folder, Trash2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react-native";

import { useSightsStore } from "@/stores/sights-store";
import { useTourStore } from "@/stores/tour-store";
import { useSettingsStore, TourWizardSettings, AudioLength, TransportMode } from "@/stores/settings-store";
import { TourSightCard } from "@/components/TourSightCard";
import { TourMapView } from "@/components/TourMapView";
import Colors from "@/constants/colors";
import { SightTier } from "@/types/sight";



export default function TourPlannerScreen() {
  const router = useRouter();
  const { sights, userLocation } = useSightsStore();
  const { userName } = useSettingsStore();
  const { 
    currentTour, 
    savedTours,
    isGenerating, 
    generateTour, 
    clearTour,
    saveTour,
    loadTour,
    deleteTour
  } = useTourStore();
  

  const [viewMode, setViewMode] = useState("plan"); // 'plan' or 'map'
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savedToursModalVisible, setSavedToursModalVisible] = useState(false);
  const [localSettings, setLocalSettings] = useState<TourWizardSettings>({
    numberOfDays: 1,
    dailyDurationHours: 2,
    maxLengthKm: 5,
    transportMode: "walk",
    interestLevel: [1, 2],
    tourType: "round-trip",
    detailLevelPerSight: "medium",
  });
  const [tourName, setTourName] = useState("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [tourDistanceInput, setTourDistanceInput] = useState("5");

  const handleGenerateTour = async () => {
    if (!userLocation) {
      Alert.alert("Location Required", "Please enable location services to plan a tour.");
      return;
    }

    if (sights.length === 0) {
      Alert.alert("No Sights Available", "Please go to the Nearby Sights tab first to load sights around your location.");
      return;
    }

    const distance = parseFloat(tourDistanceInput) || 5;
    
    if (isNaN(distance) || distance <= 0) {
      Alert.alert("Invalid Distance", "Please enter a valid distance for your tour.");
      return;
    }

    const settings = {
      ...localSettings,
      maxLengthKm: distance,
    };

    try {
      await generateTour(userLocation, distance, sights, settings);
    } catch (error) {
      Alert.alert(
        "Tour Generation Failed", 
        error instanceof Error ? error.message : "Could not generate tour. Please try with a different distance or check if there are sights available nearby."
      );
    }
  };
  
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

  const resetToDefaults = () => {
    setLocalSettings({
      numberOfDays: 1,
      dailyDurationHours: 2,
      maxLengthKm: 5,
      transportMode: "walk",
      interestLevel: [1, 2],
      tourType: "round-trip",
      detailLevelPerSight: "medium",
    });
    setTourDistanceInput("5");
  };

  const handleSightPress = (sightId: number) => {
    router.push(`/sight/${sightId}`);
  };

  const handleSaveTour = () => {
    if (!currentTour) return;
    
    const name = tourName.trim() || `Tour ${new Date().toLocaleDateString()}`;
    saveTour(name);
    setSaveModalVisible(false);
    setTourName("");
    Alert.alert("Success", "Tour saved successfully!");
  };

  const handleLoadTour = (tourId: string) => {
    loadTour(tourId);
    setSavedToursModalVisible(false);
  };

  const handleDeleteTour = (tourId: string) => {
    Alert.alert(
      "Delete Tour",
      "Are you sure you want to delete this tour?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTour(tourId),
        },
      ]
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const greeting = userName ? `Hello ${userName}!` : "Hello!";

  return (
    <View style={styles.container}>
      {!currentTour ? (
        <ScrollView style={styles.planningContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>Plan Your Tour</Text>
            <Text style={styles.subtitle}>
              Create a personalized walking tour of nearby sights
            </Text>
          </View>

          {savedTours.length > 0 && (
            <TouchableOpacity
              style={styles.savedToursButton}
              onPress={() => setSavedToursModalVisible(true)}
            >
              <Folder size={20} color={Colors.light.primary} />
              <Text style={styles.savedToursButtonText}>
                Saved Tours ({savedTours.length})
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.statusSection}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: userLocation ? Colors.light.success : Colors.light.error }]} />
              <Text style={styles.statusText}>
                Location: {userLocation ? "Available" : "Required"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: sights.length > 0 ? Colors.light.success : Colors.light.error }]} />
              <Text style={styles.statusText}>
                Sights: {sights.length} available
              </Text>
            </View>
          </View>

          {/* Always Visible Tour Distance */}
          <View style={styles.distanceSection}>
            <Text style={styles.sectionTitle}>Tour Distance</Text>
            <Text style={styles.sectionDescription}>
              How far would you like to walk in total?
            </Text>
            
            <View style={styles.distanceInputContainer}>
              <TextInput
                style={styles.distanceInput}
                value={tourDistanceInput}
                onChangeText={setTourDistanceInput}
                placeholder="5"
                placeholderTextColor={Colors.light.inactive}
                keyboardType="decimal-pad"
              />
              <Text style={styles.distanceUnit}>km</Text>
            </View>
          </View>

          {/* Advanced Settings Toggle */}
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            <Text style={styles.advancedToggleText}>Advanced Settings</Text>
            {showAdvancedSettings ? (
              <ChevronUp size={20} color={Colors.light.text} />
            ) : (
              <ChevronDown size={20} color={Colors.light.text} />
            )}
          </TouchableOpacity>

          {/* Advanced Settings (Collapsible) */}
          {showAdvancedSettings && (
            <View style={styles.advancedSettings}>
              {/* Duration Settings */}
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Duration</Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Days:</Text>
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

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Daily hours:</Text>
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
              </View>

              {/* Transport Mode */}
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Transport</Text>
                <View style={styles.transportGrid}>
                  {[{value: "walk", label: "Walk", icon: "🚶"}, {value: "taxi", label: "Taxi", icon: "🚕"}, {value: "public", label: "Public", icon: "🚌"}, {value: "mix", label: "Mix", icon: "🚶🚕"}].map((mode) => (
                    <TouchableOpacity
                      key={mode.value}
                      style={[
                        styles.transportOption,
                        localSettings.transportMode === mode.value && styles.selectedTransport
                      ]}
                      onPress={() => updateSetting('transportMode', mode.value as TransportMode)}
                    >
                      <Text style={styles.transportIcon}>{mode.icon}</Text>
                      <Text style={[
                        styles.transportText,
                        localSettings.transportMode === mode.value && styles.selectedTransportText
                      ]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Interest Level */}
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Interest Level</Text>
                <View style={styles.tierGrid}>
                  {[1, 2, 3].map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[
                        styles.tierOption,
                        localSettings.interestLevel.includes(tier as SightTier) && styles.selectedTier
                      ]}
                      onPress={() => toggleTier(tier as SightTier)}
                    >
                      <Text style={styles.tierIcon}>
                        {tier === 1 ? '👑' : tier === 2 ? '⭐' : '👁️'}
                      </Text>
                      <Text style={[
                        styles.tierText,
                        localSettings.interestLevel.includes(tier as SightTier) && styles.selectedTierText
                      ]}>
                        Tier {tier}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tour Type */}
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Tour Type</Text>
                <View style={styles.tourTypeGrid}>
                  <TouchableOpacity
                    style={[
                      styles.tourTypeOption,
                      localSettings.tourType === "round-trip" && styles.selectedTourType
                    ]}
                    onPress={() => updateSetting('tourType', "round-trip")}
                  >
                    <Text style={[
                      styles.tourTypeText,
                      localSettings.tourType === "round-trip" && styles.selectedTourTypeText
                    ]}>
                      Round Trip
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tourTypeOption,
                      localSettings.tourType === "point-to-point" && styles.selectedTourType
                    ]}
                    onPress={() => updateSetting('tourType', "point-to-point")}
                  >
                    <Text style={[
                      styles.tourTypeText,
                      localSettings.tourType === "point-to-point" && styles.selectedTourTypeText
                    ]}>
                      Point to Point
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Detail Level */}
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Detail Level</Text>
                <View style={styles.detailGrid}>
                  {[{value: "brief", label: "Brief", desc: "1min"}, {value: "medium", label: "Medium", desc: "2min"}, {value: "expert", label: "Expert", desc: "5min"}].map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.detailOption,
                        localSettings.detailLevelPerSight === level.value && styles.selectedDetail
                      ]}
                      onPress={() => updateSetting('detailLevelPerSight', level.value as AudioLength)}
                    >
                      <Text style={[
                        styles.detailLabel,
                        localSettings.detailLevelPerSight === level.value && styles.selectedDetailText
                      ]}>
                        {level.label}
                      </Text>
                      <Text style={[
                        styles.detailDesc,
                        localSettings.detailLevelPerSight === level.value && styles.selectedDetailText
                      ]}>
                        {level.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reset Button */}
              <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
                <RotateCcw size={16} color={Colors.light.text} />
                <Text style={styles.resetButtonText}>Reset to Default</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MapPin size={20} color={Colors.light.primary} />
              <Text style={styles.infoText}>
                {sights.length} sights available nearby
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Navigation size={20} color={Colors.light.secondary} />
              <Text style={styles.infoText}>
                AI-optimized route planning
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateTour}
            disabled={isGenerating}
          >
            <View style={styles.generateButtonContent}>
              {isGenerating ? (
                <ActivityIndicator size={20} color="#FFFFFF" />
              ) : (
                <Shuffle size={20} color="#FFFFFF" />
              )}
              <Text style={styles.generateButtonText}>
                {isGenerating ? "Planning Tour..." : "Generate Tour"}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.tourContainer}>
          <View style={styles.tourHeader}>
            <View style={styles.tourTitleRow}>
              <Text style={styles.tourTitle}>{currentTour.name}</Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setSaveModalVisible(true)}
              >
                <Save size={16} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.tourStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTour.sights.length}</Text>
                <Text style={styles.statLabel}>Stops</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTour.totalDistance.toFixed(1)}km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(currentTour.estimatedDuration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>

            <View style={styles.tourControls}>
              <View style={styles.viewToggle}>
                <TouchableOpacity 
                  style={[styles.toggleButton, viewMode === "plan" && styles.activeToggle]}
                  onPress={() => setViewMode("plan")}
                >
                  <Text style={[styles.toggleText, viewMode === "plan" && styles.activeToggleText]}>Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleButton, viewMode === "map" && styles.activeToggle]}
                  onPress={() => setViewMode("map")}
                >
                  <Text style={[styles.toggleText, viewMode === "map" && styles.activeToggleText]}>Map</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.newTourButton}
                onPress={clearTour}
              >
                <Text style={styles.newTourButtonText}>New Tour</Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === "plan" ? (
            <ScrollView style={styles.tourList} showsVerticalScrollIndicator={false}>
              {currentTour.sights.map((sight, index) => (
                <TourSightCard
                  key={sight.id}
                  sight={sight}
                  index={index}
                  isLast={index === currentTour.sights.length - 1}
                  onPress={() => handleSightPress(sight.id as number)}
                />
              ))}
            </ScrollView>
          ) : (
            userLocation && (
              <TourMapView
                tour={currentTour}
                userLocation={userLocation}
                onSightPress={handleSightPress}
              />
            )
          )}
        </View>
      )}

      {/* Save Tour Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Tour</Text>
            
            <TextInput
              style={styles.tourNameInput}
              value={tourName}
              onChangeText={setTourName}
              placeholder={`Tour ${new Date().toLocaleDateString()}`}
              placeholderTextColor={Colors.light.inactive}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setSaveModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleSaveTour}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Tours Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={savedToursModalVisible}
        onRequestClose={() => setSavedToursModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.savedToursModal}>
            <Text style={styles.modalTitle}>Saved Tours</Text>
            
            <FlatList
              data={savedTours}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.savedTourItem}>
                  <TouchableOpacity
                    style={styles.savedTourInfo}
                    onPress={() => handleLoadTour(item.id)}
                  >
                    <Text style={styles.savedTourName}>{item.name}</Text>
                    <Text style={styles.savedTourDetails}>
                      {item.sights.length} stops • {item.totalDistance.toFixed(1)}km • {formatDuration(item.estimatedDuration)}
                    </Text>
                    <Text style={styles.savedTourDate}>
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteTourButton}
                    onPress={() => handleDeleteTour(item.id)}
                  >
                    <Trash2 size={16} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.savedToursList}
            />
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSavedToursModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  planningContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.inactive,
    lineHeight: 22,
  },
  savedToursButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    justifyContent: "center",
    marginBottom: 24,
  },


  savedToursButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  statusSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
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
  distanceSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.inactive,
    marginBottom: 16,
  },
  distanceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 20,
  },
  distanceInput: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.text,
    width: 100,
    textAlign: "center",
    backgroundColor: Colors.light.background,
  },
  distanceUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  advancedSettings: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  settingSection: {
    marginBottom: 20,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  numberInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  numberButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  numberButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  numberValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    minWidth: 32,
    textAlign: "center",
  },
  transportGrid: {
    flexDirection: "row",
    gap: 6,
  },
  transportOption: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
  selectedTransport: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  transportIcon: {
    fontSize: 16,
  },
  transportText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
  },
  selectedTransportText: {
    color: "#FFFFFF",
  },
  tierGrid: {
    flexDirection: "row",
    gap: 6,
  },
  tierOption: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
  selectedTier: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tierIcon: {
    fontSize: 16,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
  },
  selectedTierText: {
    color: "#FFFFFF",
  },
  tourTypeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  tourTypeOption: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  selectedTourType: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tourTypeText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
  },
  selectedTourTypeText: {
    color: "#FFFFFF",
  },
  detailGrid: {
    flexDirection: "row",
    gap: 6,
  },
  detailOption: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
  selectedDetail: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
  },
  detailDesc: {
    fontSize: 10,
    color: Colors.light.inactive,
    textAlign: "center",
  },
  selectedDetailText: {
    color: "#FFFFFF",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  infoSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tourContainer: {
    flex: 1,
  },
  tourHeader: {
    backgroundColor: Colors.light.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tourTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    flex: 1,
  },
  saveButton: {
    padding: 8,
  },
  tourStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.inactive,
    marginTop: 2,
  },
  tourControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeToggle: {
    backgroundColor: Colors.light.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  activeToggleText: {
    color: "#FFFFFF",
  },
  newTourButton: {
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  newTourButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  tourList: {
    flex: 1,
    padding: 16,
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
    paddingBottom: 40,
  },
  savedToursModal: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: "center",
  },
  tourNameInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
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
  savedToursList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  savedTourItem: {
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  savedTourInfo: {
    flex: 1,
  },
  savedTourName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  savedTourDetails: {
    fontSize: 14,
    color: Colors.light.inactive,
    marginBottom: 2,
  },
  savedTourDate: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  deleteTourButton: {
    padding: 8,
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