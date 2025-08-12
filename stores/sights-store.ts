import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Region } from "react-native-maps";
import { Sight, SightTier, SavedContent } from "@/types/sight";
import { useSettingsStore } from "./settings-store";

interface SightsState {
  sights: Sight[];                                 // currently visible list (map region + tier filtered)
  allSights: Sight[];                              // cache of everything we’ve fetched
  favorites: string[];
  userLocation: { latitude: number; longitude: number } | null;
  radius: number;                                  // kept for backwards-compat; no longer used by UI
  loading: boolean;

  // keep last map region so we can re-apply filters on tier toggle
  lastRegion: Region | null;
  setLastRegion: (r: Region) => void;
  filterByMapRegion: (r: Region) => void;

  setUserLocation: (location: { latitude: number; longitude: number }) => void;
  setRadius: (radius: number) => void;
  fetchNearbySights: (latitude: number, longitude: number, radiusKm: number) => Promise<void>;
  filterSightsByRadius: () => void;
  filterSightsByTiers: () => void;
  toggleFavorite: (sightId: number | string) => void;
  generateSightContent: (sight: Sight, language: string, length: string) => Promise<string>;
  saveSightContent: (
    sightId: number | string,
    language: string,
    length: string,
    interests: string,
    content: string
  ) => void;
  deleteSavedContent: (sightId: number | string, contentId: string) => void;
  getSavedContent: (
    sightId: number | string,
    language: string,
    length: string,
    interests: string
  ) => SavedContent | undefined;
  determineSightTier: (rating?: number, userRatingsTotal?: number) => SightTier;
}

export const useSightsStore = create<SightsState>()(
  persist(
    (set, get) => ({
      sights: [],
      allSights: [],
      favorites: [],
      userLocation: null,
      radius: 10,             // not shown in UI anymore; safe to keep
      loading: false,
      lastRegion: null,
      setLastRegion: (r) => set({ lastRegion: r }),

      setUserLocation: (location) => set({ userLocation: location }),

      setRadius: (radius) => {
        set({ radius });
        get().filterSightsByRadius();
      },

      /* ---------------------------------- FETCH ---------------------------------- */
      fetchNearbySights: async (latitude: number, longitude: number, radiusKm: number) => {
        set({ loading: true });
        try {
          const { googleMapsApiKey, language } = useSettingsStore.getState();
          if (!googleMapsApiKey) {
            console.error("Google Maps API key is required. Please add it in Settings.");
            set({ allSights: [], sights: [] });
            return;
          }

          const radiusMeters = Math.max(100, Math.min(50000, Math.round(radiusKm * 1000)));

          const baseUrl =
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${latitude},${longitude}` +
            `&radius=${radiusMeters}` +
            `&type=tourist_attraction` +
            `&language=${language === "DE" ? "de" : "en"}` +
            `&key=${googleMapsApiKey}`;

          const call = async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          };

          // page up to 3 times (Google pagetoken warm-up needs delay)
          const pages: any[] = [];
          let url = baseUrl;
          for (let i = 0; i < 3; i++) {
            const data = await call(url);
            if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
              throw new Error(`Google Places API error: ${data.status} - ${data.error_message || "Unknown"}`);
            }
            pages.push(...(data.results ?? []));
            const next = data.next_page_token;
            if (!next) break;
            await new Promise((r) => setTimeout(r, 2000));
            url = `${baseUrl}&pagetoken=${next}`;
          }

          // de-duplicate by place_id
          const unique = new Map<string, any>();
          for (const p of pages) {
            const id = p.place_id ?? `${p.name}_${p.geometry?.location?.lat}_${p.geometry?.location?.lng}`;
            if (!unique.has(id)) unique.set(id, p);
          }
          const results = Array.from(unique.values());

          // map -> Sight
          const sightsWithDistance: Sight[] = results.map((place: any, index: number) => {
            const distance = calculateDistance(
              latitude,
              longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );
            const tier = get().determineSightTier(place.rating, place.user_ratings_total);

            const o: any = {
              id: place.place_id || `place_${index}`,
              name: place.name,
              category: formatCategory(place.types?.[0]) || "Attraction",
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              distance: parseFloat(distance.toFixed(1)),
              imageUrl: place.photos?.[0]
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${googleMapsApiKey}`
                : "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2070&auto=format&fit=crop",
              briefDescription: place.vicinity || "A notable attraction in the area",
              fullDescription: place.vicinity || "A notable attraction in the area",
              briefDescriptionDE: place.vicinity || "Eine bemerkenswerte Attraktion in der Gegend",
              fullDescriptionDE: place.vicinity || "Eine bemerkenswerte Attraktion in der Gegend",
              rating: place.rating,
              placeId: place.place_id,
              tier,
              // extra fields used by relevance scoring (kept at runtime; TS reads via `as any`)
              user_ratings_total: place.user_ratings_total,
              open_now: place.opening_hours?.open_now ?? undefined,
            };
            return o as Sight;
          });

          sightsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

          const capped = sightsWithDistance.slice(0, 200);
          set({ allSights: capped, sights: capped });

          // update cache; don’t filter by radius here – map region will do it
          set({ allSights: capped });

          // if we already have a region, apply it; else show everything we have
          const { lastRegion } = get();
          if (lastRegion) {
            get().filterByMapRegion(lastRegion);
          } else {
            // still respect tier selections even before map reports its first region
            const { selectedTiers } = useSettingsStore.getState();
            set({
              sights: capped.filter((s) => selectedTiers.includes(s.tier)),
            });
          }
        } catch (error) {
          console.error("Error fetching sights:", error);
          set({ allSights: [], sights: [] });
        } finally {
          set({ loading: false });
        }
      },

      /* ------------------------------ MAP REGION FILTER ----------------------------- */
      filterByMapRegion: (region: Region) => {
        set({ lastRegion: region });

        const { allSights } = get();
        const { selectedTiers } = useSettingsStore.getState();

        const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
        const latMin = latitude - latitudeDelta / 2;
        const latMax = latitude + latitudeDelta / 2;
        const lonMin = longitude - longitudeDelta / 2;
        const lonMax = longitude + longitudeDelta / 2;

        const box = allSights.filter(
          (s) =>
            s.latitude >= latMin &&
            s.latitude <= latMax &&
            s.longitude >= lonMin &&
            s.longitude <= lonMax
        );

        const filtered = box.filter((s) => selectedTiers.includes(s.tier));
        set({ sights: filtered });
      },

      // legacy no-op wrapper – keep to avoid breaking callers
      filterSightsByRadius: () => {
        get().filterSightsByTiers();
      },

      // re-apply tier filter to the *current map region*
      filterSightsByTiers: () => {
        const { lastRegion, allSights } = get();
        const { selectedTiers } = useSettingsStore.getState();

        if (!lastRegion) {
          set({ sights: allSights.filter((s) => selectedTiers.includes(s.tier)) });
          return;
        }
        get().filterByMapRegion(lastRegion);
      },

      /* --------------------------------- FAVORITES --------------------------------- */
      toggleFavorite: (sightId) => {
        const { favorites } = get();
        const id = String(sightId);
        set({
          favorites: favorites.includes(id)
            ? favorites.filter((x) => x !== id)
            : [...favorites, id],
        });
      },

      /* ------------------------------ AI CONTENT (LLM) ------------------------------ */
      generateSightContent: async (sight: Sight, language: string, length: string) => {
        const { openAiApiKey, specialInterests, userName } = useSettingsStore.getState();
        const interests = specialInterests || "general";

        const saved = get().getSavedContent(sight.id, language, length, interests);
        if (saved) return saved.content;

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

        const updateSight = (s: Sight) =>
          s.id.toString() === sightId.toString()
            ? { ...s, savedContent: [...(s.savedContent || []), newSavedContent] }
            : s;

        set({
          sights: sights.map(updateSight),
          allSights: allSights.map(updateSight),
        });
      },

      deleteSavedContent: (sightId, contentId) => {
        const { sights, allSights } = get();

        const updateSight = (s: Sight) =>
          s.id.toString() === sightId.toString()
            ? { ...s, savedContent: (s.savedContent || []).filter((c) => c.id !== contentId) }
            : s;

        set({
          sights: sights.map(updateSight),
          allSights: allSights.map(updateSight),
        });
      },

      getSavedContent: (sightId, language, length, interests) => {
        const { allSights } = get();
        const s = allSights.find((x) => x.id.toString() === sightId.toString());
        if (!s?.savedContent) return undefined;
        return s.savedContent.find(
          (c) => c.language === language && c.length === length && c.interests === interests
        );
      },

      /* ---------------------------------- TIERS ---------------------------------- */
      determineSightTier: (rating?: number, userRatingsTotal?: number): SightTier => {
        if (!rating || !userRatingsTotal) return 2;
        if (rating >= 4.3 && userRatingsTotal >= 500) return 1;
        if (rating < 4.0 || userRatingsTotal < 50) return 3;
        return 2;
      },
    }),
    {
      name: "sights-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        radius: state.radius,
        allSights: state.allSights.map((s) => ({
          ...s,
          savedContent: s.savedContent || [],
        })),
      }),
    }
  )
);

/* ------------------------------- Helpers ------------------------------- */

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
  return categoryMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
