import React, { useMemo } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region/*, Polyline*/ } from "react-native-maps";
import { Navigation } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Tour } from "@/stores/tour-store";

interface TourMapViewProps {
  tour: Tour;
  userLocation: { latitude: number; longitude: number };
  onSightPress: (sightId: number | string) => void;
}

export function TourMapView({ tour, userLocation, onSightPress }: TourMapViewProps) {
  const region: Region = useMemo(
    () => ({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [userLocation]
  );

  const coords = tour.sights.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

  return (
    <View style={styles.container}>
      <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={region} showsUserLocation>
        {/* {coords.length > 1 ? <Polyline coordinates={coords} strokeWidth={3} /> : null} */}
        {tour.sights.map((s, idx) => (
          <Marker
            key={String(s.id)}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            onPress={() => onSightPress(s.id)}
            title={`${idx + 1}. ${s.name}`}
            description={s.vicinity}
          >
            <View style={styles.stepPin}>
              <Text style={styles.stepText}>{idx + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View pointerEvents="box-none" style={styles.overlay}>
        <TouchableOpacity style={styles.legendButton}>
          <Navigation size={16} color="#fff" />
          <Text style={styles.legendText}>Your tour</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  overlay: { position: "absolute", left: 12, right: 12, bottom: 12, alignItems: "center" },
  legendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  legendText: { color: "#fff", fontWeight: "600" },
  stepPin: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  stepText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
