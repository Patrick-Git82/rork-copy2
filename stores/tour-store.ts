import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sight } from "@/types/sight";
import { useSettingsStore } from "./settings-store";

export interface TourStop extends Sight {
  order: number;
  distanceToNext?: number;
  walkingTimeToNext?: number;
}

export interface Tour {
  id: string;
  name: string;
  sights: TourStop[];
  totalDistance: number;
  estimatedDuration: number; // in minutes
  createdAt: Date;
}

interface TourState {
  currentTour: Tour | null;
  savedTours: Tour[];
  isGenerating: boolean;
  tourDistance: number;
  setTourDistance: (distance: number) => void;
  generateTour: (userLocation: { latitude: number; longitude: number }, maxDistance: number, availableSights: Sight[], wizardSettings?: import('./settings-store').TourWizardSettings) => Promise<void>;
  clearTour: () => void;
  saveTour: (name: string) => void;
  loadTour: (tourId: string) => void;
  deleteTour: (tourId: string) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      currentTour: null,
      savedTours: [],
      isGenerating: false,
      tourDistance: 5, // Default 5km tour
      
      setTourDistance: (distance) => {
        set({ tourDistance: distance });
      },
      
      generateTour: async (userLocation, maxDistance, availableSights, wizardSettings) => {
        set({ isGenerating: true });
        
        try {
          console.log(`Generating tour with max distance: ${maxDistance}km`);
          console.log(`Available sights: ${availableSights.length}`);
          
          // Filter sights by wizard settings if provided
          let filteredSights = availableSights;
          
          if (wizardSettings) {
            // Filter by interest level (tiers)
            filteredSights = filteredSights.filter(sight => 
              wizardSettings.interestLevel.includes(sight.tier)
            );
            console.log(`Sights after tier filtering: ${filteredSights.length}`);
          }
          
          // Filter sights within a reasonable radius (use full maxDistance as search radius)
          const nearSights = filteredSights.filter(sight => 
            sight.distance !== undefined && sight.distance <= maxDistance
          );
          
          console.log(`Sights within ${maxDistance}km: ${nearSights.length}`);
          
          if (nearSights.length === 0) {
            // If no sights within maxDistance, try with a larger radius
            const expandedSights = filteredSights.filter(sight => 
              sight.distance !== undefined && sight.distance <= maxDistance * 1.5
            );
            
            if (expandedSights.length === 0) {
              throw new Error(`No sights found within ${maxDistance * 1.5}km matching your criteria. Try increasing your search radius in the main screen or adjusting your tour settings.`);
            }
            
            // Use the closest sights if we had to expand the search
            const sortedSights = expandedSights.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            nearSights.push(...sortedSights.slice(0, Math.min(8, sortedSights.length)));
          }
          
          // Use AI to optimize the tour if OpenAI key is available
          const { openAiApiKey } = useSettingsStore.getState();
          let optimizedRoute: Sight[];
          
          if (openAiApiKey && nearSights.length > 3) {
            optimizedRoute = await optimizeTourWithAI(userLocation, nearSights, maxDistance, wizardSettings);
          } else {
            // Fallback to simple nearest neighbor algorithm
            optimizedRoute = optimizeTourSimple(userLocation, nearSights, maxDistance, wizardSettings);
          }
          
          if (optimizedRoute.length === 0) {
            throw new Error("Could not create a tour with the available sights. Try increasing the tour distance or search radius.");
          }
          
          // Calculate distances and walking times between stops
          const tourStops: TourStop[] = optimizedRoute.map((sight, index) => {
            const nextSight = optimizedRoute[index + 1];
            let distanceToNext = 0;
            let walkingTimeToNext = 0;
            
            if (nextSight) {
              distanceToNext = calculateDistance(
                sight.latitude,
                sight.longitude,
                nextSight.latitude,
                nextSight.longitude
              );
              
              // Calculate time based on transport mode
              const transportMultiplier = wizardSettings ? getTransportTimeMultiplier(wizardSettings.transportMode) : 12;
              walkingTimeToNext = Math.ceil(distanceToNext * transportMultiplier);
            }
            
            return {
              ...sight,
              order: index + 1,
              distanceToNext,
              walkingTimeToNext,
            };
          });
          
          // Calculate total tour statistics
          const totalWalkingDistance = tourStops.reduce((sum, stop) => sum + (stop.distanceToNext || 0), 0);
          const totalWalkingTime = tourStops.reduce((sum, stop) => sum + (stop.walkingTimeToNext || 0), 0);
          
          // Calculate sight time based on detail level
          const sightTimePerStop = wizardSettings ? getDetailLevelTime(wizardSettings.detailLevelPerSight) : 15;
          const totalSightTime = tourStops.length * sightTimePerStop;
          
          const tour: Tour = {
            id: Date.now().toString(),
            name: wizardSettings ? 
              `${wizardSettings.numberOfDays}-Day ${wizardSettings.transportMode.charAt(0).toUpperCase() + wizardSettings.transportMode.slice(1)} Tour` :
              `${tourStops.length}-Stop Tour`,
            sights: tourStops,
            totalDistance: totalWalkingDistance,
            estimatedDuration: totalWalkingTime + totalSightTime,
            createdAt: new Date(),
          };
          
          console.log(`Generated tour: ${tour.sights.length} stops, ${tour.totalDistance.toFixed(1)}km total`);
          set({ currentTour: tour });
          
        } catch (error) {
          console.error("Error generating tour:", error);
          throw error; // Re-throw so the UI can handle it
        } finally {
          set({ isGenerating: false });
        }
      },
      
      clearTour: () => {
        set({ currentTour: null });
      },
      
      saveTour: (name: string) => {
        const { currentTour, savedTours } = get();
        if (!currentTour) return;
        
        const tourToSave = {
          ...currentTour,
          name: name || currentTour.name,
        };
        
        // Check if tour with same ID already exists
        const existingIndex = savedTours.findIndex(tour => tour.id === tourToSave.id);
        
        if (existingIndex >= 0) {
          // Update existing tour
          const updatedTours = [...savedTours];
          updatedTours[existingIndex] = tourToSave;
          set({ savedTours: updatedTours });
        } else {
          // Add new tour
          set({ savedTours: [...savedTours, tourToSave] });
        }
      },
      
      loadTour: (tourId: string) => {
        const { savedTours } = get();
        const tour = savedTours.find(t => t.id === tourId);
        if (tour) {
          set({ currentTour: tour });
        }
      },
      
      deleteTour: (tourId: string) => {
        const { savedTours } = get();
        const updatedTours = savedTours.filter(tour => tour.id !== tourId);
        set({ savedTours: updatedTours });
      },
    }),
    {
      name: "tour-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ savedTours: state.savedTours, tourDistance: state.tourDistance }),
    }
  )
);

// Simple nearest neighbor tour optimization
function optimizeTourSimple(
  userLocation: { latitude: number; longitude: number },
  sights: Sight[],
  maxDistance: number,
  wizardSettings?: import('./settings-store').TourWizardSettings
): Sight[] {
  if (sights.length <= 1) return sights;
  
  const visited = new Set<number | string>();
  const route: Sight[] = [];
  let currentLocation = userLocation;
  let totalDistance = 0;
  
  // Start with the closest sight to user
  let closestSight = sights.reduce((closest, sight) => {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      sight.latitude,
      sight.longitude
    );
    const closestDistance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      closest.latitude,
      closest.longitude
    );
    return distance < closestDistance ? sight : closest;
  });
  
  route.push(closestSight);
  visited.add(closestSight.id);
  currentLocation = { latitude: closestSight.latitude, longitude: closestSight.longitude };
  
  // Add remaining sights using nearest neighbor, but respect distance limit
  while (visited.size < sights.length && visited.size < 8) { // Limit to max 8 stops
    const unvisited = sights.filter(sight => !visited.has(sight.id));
    if (unvisited.length === 0) break;
    
    const nextSight = unvisited.reduce((closest, sight) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        sight.latitude,
        sight.longitude
      );
      const closestDistance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        closest.latitude,
        closest.longitude
      );
      return distance < closestDistance ? sight : closest;
    });
    
    const distanceToNext = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      nextSight.latitude,
      nextSight.longitude
    );
    
    // Check if adding this sight would exceed our distance limit (with some buffer for return)
    const estimatedReturnDistance = calculateDistance(
      nextSight.latitude,
      nextSight.longitude,
      userLocation.latitude,
      userLocation.longitude
    ) * 0.5; // Rough estimate for return path
    
    if (totalDistance + distanceToNext + estimatedReturnDistance > maxDistance * 0.9) {
      break;
    }
    
    route.push(nextSight);
    visited.add(nextSight.id);
    currentLocation = { latitude: nextSight.latitude, longitude: nextSight.longitude };
    totalDistance += distanceToNext;
  }
  
  return route;
}

// AI-powered tour optimization
async function optimizeTourWithAI(
  userLocation: { latitude: number; longitude: number },
  sights: Sight[],
  maxDistance: number,
  wizardSettings?: import('./settings-store').TourWizardSettings
): Promise<Sight[]> {
  try {
    const { specialInterests, userName } = useSettingsStore.getState();
    
    const sightDescriptions = sights.map(sight => 
      `${sight.name} (${sight.category}) - ${sight.distance}km away`
    ).join(", ");
    
    let prompt = `You are a tour planner. Given these sights: ${sightDescriptions}, and a maximum total distance of ${maxDistance}km, create an optimized tour route starting and ending near location (${userLocation.latitude}, ${userLocation.longitude}).`;
    
    // Add wizard settings context
    if (wizardSettings) {
      prompt += ` Tour requirements: ${wizardSettings.numberOfDays} day(s), ${wizardSettings.dailyDurationHours} hours per day, transport mode: ${wizardSettings.transportMode}, tour type: ${wizardSettings.tourType}.`;
    }
    
    if (specialInterests) {
      prompt += ` The user is particularly interested in: ${specialInterests}. Prioritize sights that match these interests.`;
    }
    
    if (userName) {
      prompt += ` The user's name is ${userName}.`;
    }
    
    const transportMode = wizardSettings?.transportMode || 'walk';
    const tourType = wizardSettings?.tourType || 'round-trip';
    
    prompt += `

Consider:
- Total distance should not exceed ${maxDistance}km
- Transport mode: ${transportMode}
- Tour type: ${tourType}
- Minimize backtracking and create an efficient route
- Group nearby attractions together
- Create a logical flow between different types of sights
- Prioritize user interests when available
- Limit to maximum 8 stops for a good experience

Return only the sight names in the optimal visiting order, separated by commas. Do not include explanations or additional text.`;
    
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are an expert tour guide and route optimizer. Provide concise, practical tour routes that consider user preferences and distance constraints."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });
    
    if (!response.ok) {
      throw new Error("AI optimization failed");
    }
    
    const data = await response.json();
    const sightNames = data.completion.split(",").map((name: string) => name.trim());
    
    // Map AI response back to sight objects
    const optimizedRoute: Sight[] = [];
    sightNames.forEach((name: string) => {
      const sight = sights.find(s => 
        s.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(s.name.toLowerCase())
      );
      if (sight && !optimizedRoute.find(r => r.id === sight.id)) {
        optimizedRoute.push(sight);
      }
    });
    
    // If AI didn't return enough sights, add some nearby ones
    if (optimizedRoute.length < 3) {
      const remainingSights = sights
        .filter(sight => !optimizedRoute.find(r => r.id === sight.id))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      optimizedRoute.push(...remainingSights.slice(0, Math.min(5, remainingSights.length)));
    }
    
    return optimizedRoute.length > 0 ? optimizedRoute : optimizeTourSimple(userLocation, sights, maxDistance);
    
  } catch (error) {
    console.error("AI tour optimization failed, falling back to simple algorithm:", error);
    return optimizeTourSimple(userLocation, sights, maxDistance, wizardSettings);
  }
}

// Helper function to get transport time multiplier (minutes per km)
function getTransportTimeMultiplier(transportMode: import('./settings-store').TransportMode): number {
  switch (transportMode) {
    case 'walk': return 12; // 12 minutes per km walking
    case 'taxi': return 3; // 3 minutes per km by taxi
    case 'public': return 6; // 6 minutes per km by public transport
    case 'mix': return 8; // 8 minutes per km mixed transport
    default: return 12;
  }
}

// Helper function to get time per sight based on detail level
function getDetailLevelTime(detailLevel: import('./settings-store').AudioLength): number {
  switch (detailLevel) {
    case 'brief': return 5; // 5 minutes per sight for brief
    case 'medium': return 15; // 15 minutes per sight for medium
    case 'expert': return 25; // 25 minutes per sight for expert
    default: return 15;
  }
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