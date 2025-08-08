import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { MapPin, ArrowDown, Star, Crown, Eye } from "lucide-react-native";

import Colors from "@/constants/colors";
import { TourStop } from "@/stores/tour-store";
import { SightTier } from "@/types/sight";

interface TourSightCardProps {
  sight: TourStop;
  index: number;
  isLast: boolean;
  onPress: () => void;
}

export function TourSightCard({ sight, index, isLast, onPress }: TourSightCardProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{sight.order}</Text>
        </View>
        
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
              <Text style={styles.distance}>{sight.distance} km from you</Text>
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
      
      {!isLast && sight.distanceToNext && (
        <View style={styles.walkingInfo}>
          <View style={styles.walkingLine} />
          <View style={styles.walkingDetails}>
            <ArrowDown size={16} color={Colors.light.inactive} />
            <Text style={styles.walkingText}>
              {sight.distanceToNext.toFixed(1)}km • {sight.walkingTimeToNext}min walk
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  orderBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  orderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  image: {
    width: "100%",
    height: 120,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 16,
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
    fontSize: 12,
    color: Colors.light.primary,
    marginLeft: 4,
  },
  walkingInfo: {
    alignItems: "center",
    paddingVertical: 8,
  },
  walkingLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.light.border,
    marginBottom: 4,
  },
  walkingDetails: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  walkingText: {
    fontSize: 12,
    color: Colors.light.inactive,
    fontWeight: "500",
  },
  tierContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tierText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

function getTierIcon(tier: SightTier) {
  const iconSize = 11;
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