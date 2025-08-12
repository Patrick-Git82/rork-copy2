import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Filter } from "lucide-react-native";

import { useSightsStore } from "@/stores/sights-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SightCard } from "@/components/SightCard";
import MapView from "@/components/MapView";
import Colors from "@/constants/colors";
import { Sight } from "@/types/sight";
import type { SightTier } from "@/types/sight"; 

/** estimate visible radius from a map region delta (km) */
function kmRadiusFromRegion(latDelta?: number) {
  if (!latDelta) return 5;
  return (latDelta * 111) / 2;
}

/** relevance scorer used only in List mode */
function relevanceScore(s: Sight, regionLatDelta?: number) {
  const rating = Math.max(0, Math.min(5, s.rating ?? 0));
  const rNorm = Math.max(0, Math.min(1, (rating - 3) / 2)); // 3..5 -> 0..1
  const reviews = (s as any).user_ratings_total || 0;
  const pop = 1 - Math.exp(-reviews / 200);
  const importance = 0.6 * rNorm + 0.4 * pop;

  const R = Math.max(0.2, kmRadiusFromRegion(regionLatDelta));
  const d = Math.max(0, s.distance ?? 999);
  const x = Math.min(1, d / R);
  const decay = Math.exp(-2.0 * Math.pow(x, 1.5));

  const openMult = (s as any).open_now === false ? 0.7 : 1.0;
  return importance * decay * openMult;
}

export default function NearbyScreen() {
  const router = useRouter();

  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierModalVisible, setTierModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [sortMode, setSortMode] = useState<"relevance" | "distance">("relevance");

  const { googleMapsApiKey, selectedTiers, toggleTier } = useSettingsStore();

  const { sights, fetchNearbySights, userLocation, setUserLocation, lastRegion, filterByMapRegion } =
    useSightsStore();


  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          const base = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(base);
          // seed with ~5km; afterwards the map region drives filtering
          await fetchNearbySights(base.latitude, base.longitude, 5);
        } catch (e) {
          console.error("Error getting location:", e);
          Alert.alert("Location Error", "Failed to get your current location. Please try again.");
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSightPress = (sightId: number | string) => {
    router.push(`/sight/${sightId}`);
  };

  const handleTierToggle = (tier: SightTier) => {
    toggleTier(tier);
    // instantly re-filter for the current map view (no refetch)
    if (lastRegion) {
      filterByMapRegion(lastRegion);
    } else if (userLocation) {
      filterByMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      });
    }
  };

  const listData = useMemo(() => {
    const arr = [...sights];
    if (sortMode === "distance") {
      return arr.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    const latDelta = lastRegion?.latitudeDelta;
    return arr.sort((a, b) => relevanceScore(b, latDelta) - relevanceScore(a, latDelta));
  }, [sights, sortMode, lastRegion]);

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
          onPress={async () => {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === "granted");
            setLoading(false);
          }}
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
        <TouchableOpacity style={styles.button} onPress={() => router.push("/(tabs)/settings")}>
          <Text style={styles.buttonText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top controls: Map/List toggle + Tier filter button */}
      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "map" && styles.activeToggle]}
            onPress={() => setViewMode("map")}
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.activeToggleText]}>
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "list" && styles.activeToggle]}
            onPress={() => setViewMode("list")}
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.activeToggleText]}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={() => setTierModalVisible(true)}>
          <Filter size={16} color={Colors.light.primary} />
          <Text style={styles.filterText}>{selectedTiers.length}/3</Text>
        </TouchableOpacity>
      </View>

      {/* Sorting chips — only in List view */}
      {viewMode === "list" && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <TouchableOpacity
            style={[styles.sortChip, sortMode === "relevance" && styles.sortChipActive]}
            onPress={() => setSortMode("relevance")}
          >
            <Text
              style={[styles.sortChipText, sortMode === "relevance" && styles.sortChipTextActive]}
            >
              Relevance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortMode === "distance" && styles.sortChipActive]}
            onPress={() => setSortMode("distance")}
          >
            <Text
              style={[styles.sortChipText, sortMode === "distance" && styles.sortChipTextActive]}
            >
              Distance
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map or List */}
      {viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView
            sights={sights}
            userLocation={
              userLocation || { latitude: 52.52, longitude: 13.405 } // safe fallback
            }
            onSightPress={handleSightPress}
          />
          {/* sights-in-view counter chip */}
          <View pointerEvents="none" style={styles.countWrap}>
            <View style={styles.countChip}>
              <Text style={styles.countText}>
                {sights.length} sight{sights.length === 1 ? "" : "s"} in view
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SightCard sight={item} onPress={() => handleSightPress(item.id)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No sights in view</Text>
              <Text style={styles.emptyText}>
                Pan or zoom the map to another area, then come back to the list.
              </Text>
            </View>
          }
        />
      )}

      {/* Tier Filter Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={tierModalVisible}
        onRequestClose={() => setTierModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sight Tiers</Text>
            <Text style={styles.modalSubtitle}>Select which tiers to show:</Text>

            <View style={styles.tierOptions}>
              <TierRow
              label="Tier 1 – Top Sights"
              desc="Must-see attractions with high ratings"
              active={selectedTiers.includes(1)}
              onPress={() => handleTierToggle(1)}
              emoji="👑"
            />
            <TierRow
              label="Tier 2 – Popular Sights"
              desc="Well-known attractions worth visiting"
              active={selectedTiers.includes(2)}
              onPress={() => handleTierToggle(2)}
              emoji="⭐"
            />
            <TierRow
              label="Tier 3 – Niche Sights"
              desc="Hidden gems and local favorites"
              active={selectedTiers.includes(3)}
              onPress={() => handleTierToggle(3)}
              emoji="👁️"
            />
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

/** small presentational row used in the modal */
function TierRow({
  label,
  desc,
  active,
  onPress,
  emoji,
}: {
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
  emoji: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.tierOption, active && styles.selectedTierOption]}
      onPress={onPress}
    >
      <View style={styles.tierOptionContent}>
        <Text style={styles.tierIcon}>{emoji}</Text>
        <View style={styles.tierInfo}>
          <Text style={[styles.tierOptionTitle, active && styles.selectedTierOptionText]}>
            {label}
          </Text>
          <Text style={[styles.tierOptionDescription, active && styles.selectedTierOptionText]}>
            {desc}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: Colors.light.text },
  errorText: { fontSize: 16, color: Colors.light.error, textAlign: "center", marginBottom: 8 },
  errorSubtext: { fontSize: 14, color: Colors.light.inactive, textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: Colors.light.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

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
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  activeToggle: { backgroundColor: Colors.light.primary },
  toggleText: { fontSize: 14, fontWeight: "500", color: Colors.light.text },
  activeToggleText: { color: "#fff" },

  filterButton: {
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
  filterText: { fontSize: 14, fontWeight: "500", color: Colors.light.primary },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sortLabel: { color: Colors.light.inactive, fontSize: 13 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  sortChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  sortChipText: { fontSize: 13, color: Colors.light.text, fontWeight: "500" },
  sortChipTextActive: { color: "#fff" },

  listContent: { padding: 16, paddingTop: 0, paddingBottom: 24 },

  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.inactive, textAlign: "center", maxWidth: 280 },

  // sights-in-view chip on the map
  countWrap: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  countChip: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  countText: { color: "#fff", fontWeight: "600" },

  // modal + tier styles
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: Colors.light.text, marginBottom: 8, textAlign: "center" },
  modalSubtitle: { fontSize: 16, color: Colors.light.inactive, marginBottom: 20, textAlign: "center" },

  modalCloseButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseButtonText: { fontSize: 16, color: Colors.light.text, fontWeight: "500" },

  tierOptions: { gap: 12, marginBottom: 24 },
  tierOption: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.light.card,
  },
  selectedTierOption: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  tierOptionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierIcon: { fontSize: 24 },
  tierInfo: { flex: 1 },
  tierOptionTitle: { fontSize: 16, fontWeight: "600", color: Colors.light.text, marginBottom: 4 },
  tierOptionDescription: { fontSize: 14, color: Colors.light.inactive },
  selectedTierOptionText: { color: "#fff" },
});
