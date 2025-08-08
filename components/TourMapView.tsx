import { StyleSheet, View, Text, TouchableOpacity, Platform, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MapPin, Navigation } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Tour } from "@/stores/tour-store";

interface TourMapViewProps {
  tour: Tour;
  userLocation: { latitude: number; longitude: number };
  onSightPress: (sightId: number) => void;
}

export function TourMapView({ tour, userLocation, onSightPress }: TourMapViewProps) {
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
          <Text style={styles.userLabel}>Start</Text>
        </View>
        
        {/* Tour route line (simplified visualization) */}
        <View style={styles.routeLine} />
        
        {/* Tour sight markers */}
        {tour.sights.map((sight, index) => (
          <TouchableOpacity
            key={sight.id}
            style={[
              styles.markerContainer,
              {
                // Position markers in a rough route pattern
                left: `${30 + (index * 12) % 45}%`,
                top: `${25 + (index * 8) % 50}%`,
              }
            ]}
            onPress={() => onSightPress(sight.id as number)}
          >
            <View style={styles.marker}>
              <Text style={styles.markerNumber}>{sight.order}</Text>
            </View>
            <View style={styles.markerLabel}>
              <Text style={styles.markerText} numberOfLines={1}>
                {sight.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Map controls */}
      <View style={styles.mapControls}>
        <View style={styles.routeInfo}>
          <Navigation size={16} color={Colors.light.primary} />
          <Text style={styles.routeText}>
            {tour.sights.length} stops • {tour.totalDistance.toFixed(1)}km route • Pinch to zoom
          </Text>
        </View>
      </View>
      
      {Platform.OS === "web" && (
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This is a simulated tour map view. In a real app, this would show the actual route with turn-by-turn directions.
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
    left: "20%",
    top: "70%",
    alignItems: "center",
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.success,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userLabel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: Colors.light.text,
    fontWeight: "600",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  routeLine: {
    position: "absolute",
    left: "25%",
    top: "30%",
    width: "50%",
    height: 3,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
    opacity: 0.7,
    transform: [{ rotate: "45deg" }],
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
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerNumber: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  markerLabel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: 120,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerText: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: "500",
    textAlign: "center",
  },
  mapControls: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  routeInfo: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  routeText: {
    fontSize: 12,
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
});