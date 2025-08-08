import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { MapPin, Star, Crown, Eye } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Sight, SightTier } from "@/types/sight";

interface SightCardProps {
  sight: Sight;
  onPress: () => void;
}

export function SightCard({ sight, onPress }: SightCardProps) {
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: sight.imageUrl }} 
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{sight.name}</Text>
        <Text style={styles.category}>{sight.category}</Text>
        
        <View style={styles.footer}>
          <View style={styles.distanceContainer}>
            <MapPin size={14} color={Colors.light.primary} />
            <Text style={styles.distance}>{sight.distance} km</Text>
          </View>
          
          <View style={styles.tierContainer}>
            {getTierIcon(sight.tier)}
            <Text style={[styles.tierText, getTierTextStyle(sight.tier)]}>
              {getTierLabel(sight.tier)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 150,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: Colors.light.inactive,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: 14,
    color: Colors.light.primary,
    marginLeft: 4,
  },
  tierContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

function getTierIcon(tier: SightTier) {
  const iconSize = 12;
  switch (tier) {
    case 1:
      return <Crown size={iconSize} color="#FFD700" />;
    case 2:
      return <Star size={iconSize} color="#4A90E2" />;
    case 3:
      return <Eye size={iconSize} color="#8E8E93" />;
    default:
      return <Star size={iconSize} color="#4A90E2" />;
  }
}

function getTierLabel(tier: SightTier): string {
  switch (tier) {
    case 1:
      return "Top";
    case 2:
      return "Popular";
    case 3:
      return "Niche";
    default:
      return "Popular";
  }
}

function getTierTextStyle(tier: SightTier) {
  switch (tier) {
    case 1:
      return { color: "#FFD700" };
    case 2:
      return { color: "#4A90E2" };
    case 3:
      return { color: "#8E8E93" };
    default:
      return { color: "#4A90E2" };
  }
}