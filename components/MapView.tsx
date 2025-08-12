import React, { useMemo, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import RNMapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { MapPin, Crown, Star, Eye } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Sight, SightTier } from "@/types/sight";

interface MapViewProps {
  sights: Sight[];
  userLocation: { latitude: number; longitude: number };
  onSightPress: (sightId: number | string) => void;
  onRegionSettled?: (region: Region) => void; // NEW: report region
}

export default function SightsMap({ sights, userLocation, onSightPress, onRegionSettled }: MapViewProps) {
  const region: Region = useMemo(
    () => ({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [userLocation]
  );

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
    function handleRegionChangeComplete(r: Region) {
    if (!onRegionSettled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onRegionSettled(r), 500);
  }

  return (
    <View style={styles.container}>
      <RNMapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {sights.map((s) => {
          const TierIcon = getTierIcon(s.tier);
          return (
            <Marker
              key={String(s.id)}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              onPress={() => onSightPress(s.id)}
              title={s.name}
              description={s.vicinity}
            >
              <View style={[styles.pin, { backgroundColor: getTierColor(s.tier) }]}>
                <TierIcon size={14} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </RNMapView>

      {/* Your overlay control – keeps the original feel */}
      <View pointerEvents="box-none" style={styles.overlay}>
        <TouchableOpacity style={styles.legendButton}>
          <MapPin size={16} color="#fff" />
          <Text style={styles.legendText}>Sights near you</Text>
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
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

function getTierColor(tier: SightTier) {
  switch (tier) {
    case 1: return "#FFD700"; // gold
    case 2: return "#4A90E2"; // blue
    case 3: return "#8E44AD"; // purple
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
