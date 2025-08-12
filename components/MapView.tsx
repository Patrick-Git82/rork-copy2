import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import ClusterMapView from "react-native-map-clustering";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps"; // keep Marker & types
import { MapPin, Crown, Star, Eye } from "lucide-react-native";
import Colors from "@/constants/colors";
import { Sight, SightTier } from "@/types/sight";
import { useSightsStore } from "@/stores/sights-store";

interface MapViewProps {
  sights: Sight[];
  userLocation: { latitude: number; longitude: number };
  onSightPress: (sightId: number | string) => void;
}

function kmRadiusFromRegion(latDelta?: number) {
  if (!latDelta) return 5;
  return (latDelta * 111) / 2;
}

function isValidCoord(lat?: number, lng?: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export default function SightsMap({ sights, userLocation, onSightPress }: MapViewProps) {
  const { lastRegion, setLastRegion, filterByMapRegion, fetchNearbySights } = useSightsStore();

  // Use lastRegion if we have it, otherwise derive a sensible default.
  const initialRegion: Region = useMemo(
    () =>
      lastRegion ?? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
    [lastRegion, userLocation]
  );

  const [region, setRegion] = useState<Region>(initialRegion);
  useEffect(() => {
    // When the component mounts (e.g. coming back from List), ensure sights reflect stored region
    setRegion(initialRegion);
    filterByMapRegion(initialRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapRef = useRef<MapView | null>(null); // the MapView type from 'react-native-maps'
  const lastCommittedRegion = useRef<Region>(initialRegion);
  const [showRefresh, setShowRefresh] = useState(false);
  const [fetching, setFetching] = useState(false)

  function deg2rad(d: number) { return (d * Math.PI) / 180; }
function haversineKm(a: {lat:number,lng:number}, b:{lat:number,lng:number}) {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(deg2rad(a.lat))*Math.cos(deg2rad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function movedSignificantly(prev: Region, next: Region) {
  const centerKm = haversineKm(
    { lat: prev.latitude, lng: prev.longitude },
    { lat: next.latitude, lng: next.longitude },
  );
  const prevR = kmRadiusFromRegion(prev.latitudeDelta);
  const thresholdKm = Math.max(0.5, prevR * 0.15); // 15% of view radius or 0.5km
  const zoomChanged = Math.abs(Math.log(next.latitudeDelta / prev.latitudeDelta)) > 0.15;
  return centerKm > thresholdKm || zoomChanged;
}

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    setLastRegion(r);
    filterByMapRegion(r);
    setShowRefresh(movedSignificantly(lastCommittedRegion.current, r));
  };

const refreshArea = async () => {
  if (fetching) return;
  try {
    setFetching(true);
    const R = Math.min(50, Math.max(1, kmRadiusFromRegion(region.latitudeDelta)));
    await fetchNearbySights(region.latitude, region.longitude, R);
    // Only filter after we have fresh data
    filterByMapRegion(region);
    lastCommittedRegion.current = region;
    setShowRefresh(false);
  } catch (e) {
    console.warn("refreshArea failed", e);
  } finally {
    setFetching(false);
  }
};

  return (
    <View style={styles.container}>
      <ClusterMapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      radius={50}
      spiralEnabled
      extent={512}
      renderCluster={(cluster) => {
        // cluster uses GeoJSON-ish shape
        const { geometry, properties, onPress, id } = cluster || {};
        const coords = geometry?.coordinates; // [lng, lat]
        if (!Array.isArray(coords) || coords.length < 2) return null;

        const coordinate = { latitude: coords[1], longitude: coords[0] };
        const count =
          properties?.point_count ??
          (cluster as any).pointCount ??
          0;

        return (
          <Marker key={`cluster-${id ?? `${coordinate.latitude},${coordinate.longitude}`}`}
                  coordinate={coordinate}
                  onPress={onPress}>
            <View style={styles.clusterBubble}>
              <Text style={styles.clusterText}>{count}</Text>
            </View>
          </Marker>
        );
      }}
    >
      {/* markers go here  — keep the guarded loop from step #1 */}
      {(sights || [])
        .filter(s => isValidCoord(s.latitude, s.longitude))
        .map((s) => {
          const TierIcon = getTierIcon(s.tier);
          return (
            <Marker
              key={String(s.id)}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              onPress={() => onSightPress(s.id)}
              title={s.name}
              description={s.briefDescription ?? undefined}
              tracksViewChanges={false}
            >
              <View style={[styles.pin, { backgroundColor: getTierColor(s.tier) }]}>
                <TierIcon size={14} color="#fff" />
              </View>
            </Marker>
          );
        })}
    </ClusterMapView>

      {/* small legend chip, optional */}
      <View pointerEvents="box-none" style={styles.overlay}>
        {showRefresh ? (
          <TouchableOpacity style={styles.refreshBtn} onPress={refreshArea} disabled={fetching}>
            <Text style={styles.refreshText}>{fetching ? "Loading…" : "Search this area"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.legendButton}>
            <MapPin size={16} color="#fff" />
            <Text style={styles.legendText}>{sights.length} sights in view</Text>
          </View>
        )}
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
  refreshBtn: {
  backgroundColor: Colors.light.primary,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  },
  refreshText: { color: "#fff", fontWeight: "700" },
  clusterBubble: {
    backgroundColor: Colors.light.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  clusterText: {
    color: "#fff",
    fontWeight: "700",
  },
});

function getTierColor(tier: SightTier) {
  switch (tier) {
    case 1:
      return "#FFD700";
    case 2:
      return "#4A90E2";
    case 3:
      return "#8E44AD";
    default:
      return Colors.light.primary;
  }
}
function getTierIcon(tier: SightTier) {
  switch (tier) {
    case 1:
      return Crown;
    case 2:
      return Star;
    case 3:
      return Eye;
    default:
      return MapPin;
  }
}
