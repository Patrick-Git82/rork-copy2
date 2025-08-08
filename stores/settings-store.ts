import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SightTier } from "@/types/sight";

export type AudioLength = "brief" | "medium" | "expert";
export type TransportMode = "walk" | "taxi" | "public" | "mix";
export type TourType = "round-trip" | "point-to-point";

export interface TourWizardSettings {
  numberOfDays: number;
  dailyDurationHours: number;
  maxLengthKm: number;
  transportMode: TransportMode;
  interestLevel: SightTier[];
  tourType: TourType;
  detailLevelPerSight: AudioLength;
}

interface SettingsState {
  googleMapsApiKey: string;
  openAiApiKey: string;
  userName: string;
  language: "EN" | "DE";
  specialInterests: string;
  selectedTiers: SightTier[];
  audioLength: AudioLength;
  tourWizardSettings: TourWizardSettings;
  setGoogleMapsApiKey: (key: string) => void;
  setOpenAiApiKey: (key: string) => void;
  setUserName: (name: string) => void;
  setLanguage: (language: "EN" | "DE") => void;
  setSpecialInterests: (interests: string) => void;
  setSelectedTiers: (tiers: SightTier[]) => void;
  toggleTier: (tier: SightTier) => void;
  setAudioLength: (length: AudioLength) => void;
  setTourWizardSettings: (settings: Partial<TourWizardSettings>) => void;
  resetTourWizardToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      googleMapsApiKey: "",
      openAiApiKey: "",
      userName: "",
      language: "EN",
      specialInterests: "",
      selectedTiers: [1, 2, 3], // Show all tiers by default
      audioLength: "medium", // Default to 2 min
      tourWizardSettings: {
        numberOfDays: 1,
        dailyDurationHours: 2,
        maxLengthKm: 5,
        transportMode: "walk",
        interestLevel: [1, 2],
        tourType: "round-trip",
        detailLevelPerSight: "medium",
      },
      
      setGoogleMapsApiKey: (key) => {
        set({ googleMapsApiKey: key });
      },
      
      setOpenAiApiKey: (key) => {
        set({ openAiApiKey: key });
      },
      
      setUserName: (name) => {
        set({ userName: name });
      },
      
      setLanguage: (language) => {
        set({ language });
      },
      
      setSpecialInterests: (interests) => {
        set({ specialInterests: interests });
      },
      
      setSelectedTiers: (tiers) => {
        set({ selectedTiers: tiers });
      },
      
      toggleTier: (tier) => {
        set((state) => {
          const currentTiers = state.selectedTiers;
          if (currentTiers.includes(tier)) {
            return { selectedTiers: currentTiers.filter(t => t !== tier) };
          } else {
            return { selectedTiers: [...currentTiers, tier].sort() };
          }
        });
      },
      
      setAudioLength: (length) => {
        set({ audioLength: length });
      },
      
      setTourWizardSettings: (settings) => {
        set((state) => ({
          tourWizardSettings: { ...state.tourWizardSettings, ...settings }
        }));
      },
      
      resetTourWizardToDefaults: () => {
        set({
          tourWizardSettings: {
            numberOfDays: 1,
            dailyDurationHours: 2,
            maxLengthKm: 5,
            transportMode: "walk",
            interestLevel: [1, 2],
            tourType: "round-trip",
            detailLevelPerSight: "medium",
          }
        });
      },
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);