import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ActivityIndicator, FlatList, TouchableOpacity, Platform, Modal, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Settings, Filter } from "lucide-react-native";
import Slider from "@react-native-community/slider";

import { useSightsStore } from "@/stores/sights-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SightCard } from "@/components/SightCard";
import MapView from "@/components/MapView";
import Colors from "@/constants/colors";
import { SightTier } from "@/types/sight";



export default function NearbyScreen() {
  const router = useRouter();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [tierModalVisible, setTierModalVisible] = useState(false);
  const { sights, fetchNearbySights, userLocation, setUserLocation, radius, setRadius, filterSightsByTiers } = useSightsStore();
  const { googleMapsApiKey, selectedTiers, toggleTier } = useSettingsStore();
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'map'

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      
      if (status === "granted") {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          await fetchNearbySights(location.coords.latitude, location.coords.longitude);
        } catch (error) {
          console.error("Error getting location:", error);
          Alert.alert("Location Error", "Failed to get your current location. Please try again.");
        }
      }
      
      setLoading(false);
    })();
  }, []);

  const handleSightPress = (sightId: number | string) => {
    router.push(`/sight/${sightId}`);
  };

  const handleRadiusChange = async (newRadius: number) => {
    setRadius(newRadius);
    
    // Refetch sights with new radius if we have location
    if (userLocation) {
      await fetchNearbySights(userLocation.latitude, userLocation.longitude);
    }
  };
  
  const handleTierToggle = (tier: SightTier) => {
    toggleTier(tier);
    filterSightsByTiers();
  };

  const handleRetryLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === "granted");
    
    if (status === "granted") {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        await fetchNearbySights(location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert("Location Error", "Failed to get your current location. Please try again.");
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Finding sights around you...</Text>
      </View>
    );
  }

  if (!locationPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Location permission is required to find nearby sights.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleRetryLocation}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!googleMapsApiKey) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Google Maps API key is required to fetch real sights.</Text>
        <Text style={styles.errorSubtext}>Please add your API key in Settings to continue.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Text style={styles.buttonText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === "list" && styles.activeToggle]}
            onPress={() => setViewMode("list")}
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.activeToggleText]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === "map" && styles.activeToggle]}
            onPress={() => setViewMode("map")}
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.activeToggleText]}>Map</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.radiusContainer}>
          <Settings size={16} color={Colors.light.primary} />
          <Text style={styles.radiusButtonText}>{radius}km</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.tierButton}
          onPress={() => setTierModalVisible(true)}
        >
          <Filter size={16} color={Colors.light.primary} />
          <Text style={styles.tierButtonText}>{selectedTiers.length}/3</Text>
        </TouchableOpacity>
      </View>

      {viewMode === "list" && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Search Radius: {radius}km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={50}
            value={radius}
            onValueChange={setRadius}
            onSlidingComplete={handleRadiusChange}
            step={1}
            minimumTrackTintColor={Colors.light.primary}
            maximumTrackTintColor={Colors.light.border}
            thumbStyle={styles.sliderThumb}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>1km</Text>
            <Text style={styles.sliderLabelText}>50km</Text>
          </View>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {sights.length} sight{sights.length !== 1 ? 's' : ''} within {radius}km
        </Text>
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={sights}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SightCard 
              sight={item} 
              onPress={() => handleSightPress(item.id)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No sights found</Text>
              <Text style={styles.emptyText}>
                Try increasing your search radius or check your location settings.
              </Text>
            </View>
          }
        />
      ) : (
        userLocation && (
          <MapView 
            sights={sights} 
            userLocation={userLocation}
            onSightPress={handleSightPress}
          />
        )
      )}


      
      <Modal
        animationType="slide"
        transparent={true}
        visible={tierModalVisible}
        onRequestClose={() => setTierModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sight Tiers</Text>
            <Text style={styles.modalSubtitle}>Select which tiers to show:</Text>
            
            <View style={styles.tierOptions}>
              <TouchableOpacity
                style={[
                  styles.tierOption,
                  selectedTiers.includes(1) && styles.selectedTierOption
                ]}
                onPress={() => handleTierToggle(1)}
              >
                <View style={styles.tierOptionContent}>
                  <Text style={styles.tierIcon}>👑</Text>
                  <View style={styles.tierInfo}>
                    <Text style={[
                      styles.tierOptionTitle,
                      selectedTiers.includes(1) && styles.selectedTierOptionText
                    ]}>Tier 1 - Top Sights</Text>
                    <Text style={[
                      styles.tierOptionDescription,
                      selectedTiers.includes(1) && styles.selectedTierOptionText
                    ]}>Must-see attractions with high ratings</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tierOption,
                  selectedTiers.includes(2) && styles.selectedTierOption
                ]}
                onPress={() => handleTierToggle(2)}
              >
                <View style={styles.tierOptionContent}>
                  <Text style={styles.tierIcon}>⭐</Text>
                  <View style={styles.tierInfo}>
                    <Text style={[
                      styles.tierOptionTitle,
                      selectedTiers.includes(2) && styles.selectedTierOptionText
                    ]}>Tier 2 - Popular Sights</Text>
                    <Text style={[
                      styles.tierOptionDescription,
                      selectedTiers.includes(2) && styles.selectedTierOptionText
                    ]}>Well-known attractions worth visiting</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tierOption,
                  selectedTiers.includes(3) && styles.selectedTierOption
                ]}
                onPress={() => handleTierToggle(3)}
              >
                <View style={styles.tierOptionContent}>
                  <Text style={styles.tierIcon}>👁️</Text>
                  <View style={styles.tierInfo}>
                    <Text style={[
                      styles.tierOptionTitle,
                      selectedTiers.includes(3) && styles.selectedTierOptionText
                    ]}>Tier 3 - Niche Sights</Text>
                    <Text style={[
                      styles.tierOptionDescription,
                      selectedTiers.includes(3) && styles.selectedTierOptionText
                    ]}>Hidden gems and local favorites</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setTierModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.light.inactive,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  viewToggle: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
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
  radiusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.primary,
  },
  tierButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.primary,
  },
  sliderContainer: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderThumb: {
    backgroundColor: Colors.light.primary,
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: Colors.light.inactive,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.inactive,
    textAlign: "center",
    maxWidth: 280,
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
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.light.inactive,
    marginBottom: 20,
    textAlign: "center",
  },

  modalCloseButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: "500",
  },
  tierOptions: {
    gap: 12,
    marginBottom: 24,
  },
  tierOption: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.light.card,
  },
  selectedTierOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tierOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tierIcon: {
    fontSize: 24,
  },
  tierInfo: {
    flex: 1,
  },
  tierOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  tierOptionDescription: {
    fontSize: 14,
    color: Colors.light.inactive,
  },
  selectedTierOptionText: {
    color: "#FFFFFF",
  },
});