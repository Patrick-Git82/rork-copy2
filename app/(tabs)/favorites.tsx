import { useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { useSightsStore } from "@/stores/sights-store";
import { useTourStore } from "@/stores/tour-store";
import { SightCard } from "@/components/SightCard";
import Colors from "@/constants/colors";
import { MapPin, Route } from "lucide-react-native";

export default function FavoritesScreen() {
  const router = useRouter();
  const { sights, favorites } = useSightsStore();
  const { savedTours, loadTour } = useTourStore();
  const [activeTab, setActiveTab] = useState<"sights" | "tours">("sights");
  
  // Filter sights that are in favorites (handle both string and number IDs)
  const favoriteSights = sights.filter(sight => 
    favorites.includes(sight.id.toString())
  );

  const handleSightPress = (sightId: number | string) => {
    router.push(`/sight/${sightId}`);
  };
  
  const handleTourPress = (tourId: string) => {
    loadTour(tourId);
    router.push("/(tabs)/tour");
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderEmptyState = () => {
    if (activeTab === "sights") {
      return (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color={Colors.light.inactive} />
          <Text style={styles.emptyTitle}>No favorite sights yet</Text>
          <Text style={styles.emptyText}>
            Save your favorite sights to access them quickly later
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Route size={48} color={Colors.light.inactive} />
          <Text style={styles.emptyTitle}>No saved tours yet</Text>
          <Text style={styles.emptyText}>
            Create and save tours to access them quickly later
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "sights" && styles.activeTab]}
          onPress={() => setActiveTab("sights")}
        >
          <MapPin size={20} color={activeTab === "sights" ? "#FFFFFF" : Colors.light.text} />
          <Text style={[styles.tabText, activeTab === "sights" && styles.activeTabText]}>
            Sights ({favoriteSights.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "tours" && styles.activeTab]}
          onPress={() => setActiveTab("tours")}
        >
          <Route size={20} color={activeTab === "tours" ? "#FFFFFF" : Colors.light.text} />
          <Text style={[styles.tabText, activeTab === "tours" && styles.activeTabText]}>
            Tours ({savedTours.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "sights" ? (
        favoriteSights.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={favoriteSights}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <SightCard 
                sight={item} 
                onPress={() => handleSightPress(item.id)} 
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        savedTours.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={savedTours}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.tourCard}
                onPress={() => handleTourPress(item.id)}
              >
                <View style={styles.tourHeader}>
                  <Text style={styles.tourName}>{item.name}</Text>
                  <Text style={styles.tourDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.tourStats}>
                  <View style={styles.tourStat}>
                    <Text style={styles.tourStatValue}>{item.sights.length}</Text>
                    <Text style={styles.tourStatLabel}>stops</Text>
                  </View>
                  <View style={styles.tourStat}>
                    <Text style={styles.tourStatValue}>{item.totalDistance.toFixed(1)}km</Text>
                    <Text style={styles.tourStatLabel}>distance</Text>
                  </View>
                  <View style={styles.tourStat}>
                    <Text style={styles.tourStatValue}>{formatDuration(item.estimatedDuration)}</Text>
                    <Text style={styles.tourStatLabel}>duration</Text>
                  </View>
                </View>
                
                <Text style={styles.tourDescription}>
                  {item.sights.slice(0, 3).map(sight => sight.name).join(" • ")}
                  {item.sights.length > 3 && ` • +${item.sights.length - 3} more`}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.inactive,
    textAlign: "center",
    maxWidth: 300,
  },
  tourCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tourHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tourName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    flex: 1,
    marginRight: 12,
  },
  tourDate: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  tourStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
  },
  tourStat: {
    alignItems: "center",
  },
  tourStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  tourStatLabel: {
    fontSize: 11,
    color: Colors.light.inactive,
    marginTop: 2,
  },
  tourDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
});