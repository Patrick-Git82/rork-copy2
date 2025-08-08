import { StyleSheet, View, Text, TouchableOpacity, Platform, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MapPin, Crown, Star, Eye } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Sight, SightTier } from "@/types/sight";

interface MapViewProps {
  sights: Sight[];
  userLocation: { latitude: number; longitude: number };
  onSightPress: (sightId: number | string) => void;
}

export function MapView({ sights, userLocation, onSightPress }: MapViewProps) {
  // Create a scrollable map view that works on mobile
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.mapContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
        bouncesZoom={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Mock map background */}
        <Image
          source="https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?q=80&w=2000&auto=format&fit=crop"
          style={styles.mapBackground}
          contentFit="cover"
        />
        
        {/* User location marker */}
        <View style={styles.userMarker}>
          <View style={styles.userDot} />
        </View>
        
        {/* Sight markers */}
        {sights.map((sight, index) => {
          const markerColor = getTierColor(sight.tier);
          const TierIcon = getTierIcon(sight.tier);
          
          return (
            <TouchableOpacity
              key={sight.id}
              style={[
                styles.markerContainer,
                {
                  // Position markers based on relative distance and direction
                  left: `${45 + (index % 3) * 15 + Math.sin(index) * 10}%`,
                  top: `${35 + Math.floor(index / 3) * 15 + Math.cos(index) * 10}%`,
                }
              ]}
              onPress={() => onSightPress(sight.id)}
            >
              <View style={[styles.marker, { backgroundColor: markerColor }]}>
                <TierIcon size={18} color="#FFFFFF" />
              </View>
              <View style={styles.markerLabel}>
                <Text style={styles.markerText} numberOfLines={1}>
                  {sight.name}
                </Text>
                <View style={styles.markerInfo}>
                  <Text style={styles.markerDistance}>
                    {sight.distance}km
                  </Text>
                  <Text style={[styles.tierBadge, { backgroundColor: markerColor }]}>
                    T{sight.tier}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Map controls */}
      <View style={styles.mapControls}>
        <Text style={styles.mapText}>
          📍 {sights.length} sights nearby • Pinch to zoom
        </Text>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: getTierColor(1) }]}>
            <Crown size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>Tier 1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: getTierColor(2) }]}>
            <Star size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>Tier 2</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: getTierColor(3) }]}>
            <Eye size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>Tier 3</Text>
        </View>
      </View>
      
      {Platform.OS === "web" && (
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This is a simulated map view. In a real app, this would use react-native-maps.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  scrollContainer: {
    flex: 1,
  },
  mapContainer: {
    width: 800,
    height: 800,
    position: "relative",
  },
  mapBackground: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  userMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -12,
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(74, 144, 226, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  markerContainer: {
    position: "absolute",
    alignItems: "center",
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignItems: "center",
  },
  markerText: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: "500",
    textAlign: "center",
  },
  markerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  markerDistance: {
    fontSize: 9,
    color: Colors.light.inactive,
  },
  tierBadge: {
    fontSize: 8,
    color: "#FFFFFF",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    fontWeight: "600",
    overflow: "hidden",
  },
  mapControls: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  mapText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
    textAlign: "center",
  },
  disclaimer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.light.inactive,
    textAlign: "center",
  },
  legend: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: "500",
  },
});

// Helper functions
function getTierColor(tier: SightTier): string {
  switch (tier) {
    case 1: return "#FFD700"; // Gold for top sights
    case 2: return "#4A90E2"; // Blue for popular sights  
    case 3: return "#8E44AD"; // Purple for niche sights
    default: return Colors.light.primary;
  }
}

function getTierIcon(tier: SightTier) {
  switch (tier) {
    case 1: return Crown;
    case 2: return Star;
    case 3: return Eye;
    default: return MapPin;
  }
}