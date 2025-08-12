import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Sight, SightTier, SavedContent } from "@/types/sight";
import { useSettingsStore } from "./settings-store";


interface SightsState {
  sights: Sight[];
  allSights: Sight[];
  favorites: string[]; // Changed to string[] to handle both string and number IDs
  userLocation: { latitude: number; longitude: number } | null;
  radius: number;
  loading: boolean;
  setUserLocation: (location: { latitude: number; longitude: number }) => void;
  setRadius: (radius: number) => void;
  fetchNearbySights: (latitude: number, longitude: number) => Promise<void>;
  filterSightsByRadius: () => void;
  filterSightsByTiers: () => void;
  toggleFavorite: (sightId: number | string) => void;
  generateSightContent: (sight: Sight, language: string, length: string) => Promise<string>;
  saveSightContent: (sightId: number | string, language: string, length: string, interests: string, content: string) => void;
  deleteSavedContent: (sightId: number | string, contentId: string) => void;
  getSavedContent: (sightId: number | string, language: string, length: string, interests: string) => SavedContent | undefined;
  determineSightTier: (rating?: number, userRatingsTotal?: number) => SightTier;
}

export const useSightsStore = create<SightsState>()(
  persist(
    (set, get) => ({
      sights: [],
      allSights: [],
      favorites: [],
      userLocation: null,
      radius: 10, // Default 10km radius
      loading: false,
      
      setUserLocation: (location) => {
        set({ userLocation: location });
      },
      
      setRadius: (radius) => {
        set({ radius });
        get().filterSightsByRadius();
      },
      
fetchNearbySights: async (latitude: number, longitude: number) => {
  set({ loading: true });

  try {
    const { googleMapsApiKey, language } = useSettingsStore.getState();

    if (!googleMapsApiKey) {
      console.error("Google Maps API key is required. Please add it in Settings.");
      set({ allSights: [], sights: [] });
      return;
    }

    // Clamp radius to a sensible range (Google max is 50km for nearbysearch)
    const radiusMeters = Math.max(100, Math.min(50000, Math.round(get().radius * 1000)));

    const baseUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${latitude},${longitude}` +
      `&radius=${radiusMeters}` +
      `&type=tourist_attraction` +
      `&language=${language === "DE" ? "de" : "en"}` +
      `&key=${googleMapsApiKey}`;

    // On web, go through a CORS proxy. On device, call Google directly.
    const url =
      Platform.OS === "web"
        ? `https://api.allorigins.win/get?url=${encodeURIComponent(baseUrl)}`
        : baseUrl;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const raw = await res.json();
    const data = Platform.OS === "web" ? JSON.parse(raw.contents) : raw;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || "Unknown error"}`);
    }

    const results: any[] = data?.results ?? [];

    const sightsWithDistance = results.map((place: any, index: number) => {
      // Distance via your helper
      const distance = calculateDistance(
        latitude,
        longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      const tier = get().determineSightTier(place.rating, place.user_ratings_total);

      return {
        id: place.place_id || `place_${index}`,
        name: place.name,
        category: formatCategory(place.types?.[0]) || "Attraction",
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        distance: parseFloat(distance.toFixed(1)),
        imageUrl: place.photos?.[0]
          ? // ✅ correct param name is photo_reference (not "photoreference")
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${googleMapsApiKey}`
          : "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2070&auto=format&fit=crop",
        briefDescription: place.vicinity || "A notable attraction in the area",
        fullDescription: place.vicinity || "A notable attraction in the area",
        briefDescriptionDE: place.vicinity || "Eine bemerkenswerte Attraktion in der Gegend",
        fullDescriptionDE: place.vicinity || "Eine bemerkenswerte Attraktion in der Gegend",
        rating: place.rating,
        placeId: place.place_id,
        tier,
      };
    });

    // Sort by distance and update state
    const sortedSights = sightsWithDistance.sort(
      (a: Sight, b: Sight) => (a.distance || 0) - (b.distance || 0)
    );

    set({ allSights: sortedSights });
    get().filterSightsByRadius();
  } catch (error) {
    console.error("Error fetching sights:", error);
    set({ allSights: [], sights: [] });
  } finally {
    set({ loading: false });
  }
},

      
      filterSightsByRadius: () => {
        get().filterSightsByTiers();
      },
      
      filterSightsByTiers: () => {
        const { allSights, radius } = get();
        const { selectedTiers } = useSettingsStore.getState();
        
        // First filter by radius, then by tiers
        const radiusFilteredSights = allSights.filter(sight => 
          sight.distance !== undefined && sight.distance <= radius
        );
        
        const tierFilteredSights = radiusFilteredSights.filter(sight => 
          selectedTiers.includes(sight.tier)
        );
        
        set({ sights: tierFilteredSights });
      },
      
      toggleFavorite: (sightId) => {
        const { favorites } = get();
        const idString = sightId.toString(); // Convert to string for consistent handling
        
        if (favorites.includes(idString)) {
          set({ favorites: favorites.filter(id => id !== idString) });
        } else {
          set({ favorites: [...favorites, idString] });
        }
      },
      
generateSightContent: async (sight: Sight, language: string, length: string) => {
  const { openAiApiKey, specialInterests, userName } = useSettingsStore.getState();
  const interests = specialInterests || "general";

  // Reuse saved content if available
  const saved = get().getSavedContent(sight.id, language, length, interests);
  if (saved) return saved.content;

  // No API key → fallback to built-in text
  if (!openAiApiKey) {
    return language === "EN"
      ? (length === "brief" ? sight.briefDescription : sight.fullDescription)
      : (length === "brief" ? sight.briefDescriptionDE : sight.fullDescriptionDE);
  }

  try {
    const lengthText =
      length === "brief" ? "1-minute" :
      length === "medium" ? "2-minute" : "5-minute";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a knowledgeable, engaging tour guide." },
          {
            role: "user",
            content:
              `Write a ${lengthText} spoken narration about "${sight.name}". ` +
              `Language: ${language === "DE" ? "German" : "English"}. ` +
              (specialInterests ? `Focus on: ${specialInterests}. ` : "") +
              (userName ? `Address the listener as ${userName}. ` : "") +
              `No fluff; make it vivid, accurate, and easy to listen to.`
          }
        ],
      }),
    });

    const json = await resp.json();
    const generatedContent: string =
      json?.choices?.[0]?.message?.content?.trim() ||
      (language === "EN"
        ? (length === "brief" ? sight.briefDescription : sight.fullDescription)
        : (length === "brief" ? sight.briefDescriptionDE : sight.fullDescriptionDE));

    // Save and return
    get().saveSightContent(sight.id, language, length, interests, generatedContent);
    return generatedContent;

  } catch (err) {
    console.error("Error generating content:", err);
    return language === "EN"
      ? (length === "brief" ? sight.briefDescription : sight.fullDescription)
      : (length === "brief" ? sight.briefDescriptionDE : sight.fullDescriptionDE);
  }
},

      
      saveSightContent: (sightId, language, length, interests, content) => {
        const { sights, allSights } = get();
        
        const newSavedContent: SavedContent = {
          id: Date.now().toString(),
          language,
          length,
          interests,
          content,
          createdAt: new Date(),
        };
        
        const updateSight = (sight: Sight) => {
          if (sight.id.toString() === sightId.toString()) {
            return {
              ...sight,
              savedContent: [...(sight.savedContent || []), newSavedContent],
            };
          }
          return sight;
        };
        
        set({
          sights: sights.map(updateSight),
          allSights: allSights.map(updateSight),
        });
      },
      
      deleteSavedContent: (sightId, contentId) => {
        const { sights, allSights } = get();
        
        const updateSight = (sight: Sight) => {
          if (sight.id.toString() === sightId.toString()) {
            return {
              ...sight,
              savedContent: sight.savedContent?.filter(content => content.id !== contentId) || [],
            };
          }
          return sight;
        };
        
        set({
          sights: sights.map(updateSight),
          allSights: allSights.map(updateSight),
        });
      },
      
      getSavedContent: (sightId, language, length, interests) => {
        const { allSights } = get();
        const sight = allSights.find(s => s.id.toString() === sightId.toString());
        
        if (!sight?.savedContent) return undefined;
        
        return sight.savedContent.find(content => 
          content.language === language &&
          content.length === length &&
          content.interests === interests
        );
      },
      
      determineSightTier: (rating?: number, userRatingsTotal?: number): SightTier => {
        // If no rating data, default to tier 2
        if (!rating || !userRatingsTotal) {
          return 2;
        }
        
        // Tier 1 (Top sights): High rating (4.3+) with many reviews (500+)
        if (rating >= 4.3 && userRatingsTotal >= 500) {
          return 1;
        }
        
        // Tier 3 (Niche sights): Lower rating (<4.0) or very few reviews (<50)
        if (rating < 4.0 || userRatingsTotal < 50) {
          return 3;
        }
        
        // Tier 2 (Regular sights): Everything else
        return 2;
      },
    }),
    {
      name: "sights-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        favorites: state.favorites, 
        radius: state.radius,
        allSights: state.allSights.map(sight => ({
          ...sight,
          savedContent: sight.savedContent || []
        }))
      }),
    }
  )
);

// Helper function to format Google Places API categories
function formatCategory(type: string): string {
  if (!type) return "Attraction";
  
  const categoryMap: { [key: string]: string } = {
    tourist_attraction: "Tourist Attraction",
    museum: "Museum",
    church: "Religious Site",
    park: "Park",
    monument: "Monument",
    castle: "Castle",
    art_gallery: "Art Gallery",
    zoo: "Zoo",
    amusement_park: "Amusement Park",
    aquarium: "Aquarium",
    library: "Library",
    university: "University",
    stadium: "Stadium",
    shopping_mall: "Shopping",
    restaurant: "Restaurant",
    cafe: "Cafe",
    bar: "Bar",
    night_club: "Nightlife",
    movie_theater: "Entertainment",
    bowling_alley: "Entertainment",
    gym: "Sports & Fitness",
    spa: "Wellness",
    hospital: "Healthcare",
    pharmacy: "Healthcare",
    bank: "Services",
    atm: "Services",
    gas_station: "Services",
    car_rental: "Transportation",
    subway_station: "Transportation",
    bus_station: "Transportation",
    train_station: "Transportation",
    airport: "Transportation",
    lodging: "Accommodation",
    campground: "Accommodation",
    rv_park: "Accommodation",
  };
  
  return categoryMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}