// utils/tts.ts
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { encode } from "base64-arraybuffer";
import { useSettingsStore } from "@/stores/settings-store";

let currentSound: Audio.Sound | null = null;

type VoiceStyle = "male" | "female" | "energetic" | "calm";

function pickOpenAIVoice(voiceStyle?: VoiceStyle) {
  switch (voiceStyle) {
    case "male": return "alloy";
    case "female": return "verse";
    case "energetic": return "breeze";
    case "calm": return "soothing";
    default: return "verse";
  }
}

export async function speakNatural(
  text: string,
  opts?: { onStart?: () => void; onEnd?: () => void }
) {
  const { openAiApiKey, voiceStyle, language } = useSettingsStore.getState();
  if (!text?.trim()) return;

  // Ensure iOS plays in silent mode
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {}

  // Stop previous sound, if any
  if (currentSound) {
    try { await currentSound.stopAsync(); await currentSound.unloadAsync(); } catch {}
    currentSound = null;
  }

  // Fallback path: no OpenAI key → use system TTS
  if (!openAiApiKey) {
    const Speech = await import("expo-speech");
    opts?.onStart?.();
    Speech.speak(text, {
      language: language === "DE" ? "de-DE" : "en-US",
      pitch: voiceStyle === "female" ? 1.1 : voiceStyle === "male" ? 0.95 : 1.0,
      rate: 0.98,
      onDone: () => opts?.onEnd?.(),
      onStopped: () => opts?.onEnd?.(),
    });
    return;
  }

  try {
    // Fetch MP3 from OpenAI TTS
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: pickOpenAIVoice(voiceStyle as VoiceStyle),
        input: text,
        format: "mp3",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}`);

    const buf = await res.arrayBuffer();
    const b64 = encode(buf);
    const uri = FileSystem.cacheDirectory! + `narration_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });

    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
    currentSound = sound;
    opts?.onStart?.();

    sound.setOnPlaybackStatusUpdate(async (status: any) => {
      if (status?.didJustFinish) {
        try { await sound.unloadAsync(); } catch {}
        if (currentSound === sound) currentSound = null;
        opts?.onEnd?.();
      }
    });
  } catch (e) {
    console.warn("OpenAI TTS failed, falling back to expo-speech", e);
    const Speech = await import("expo-speech");
    opts?.onStart?.();
    Speech.speak(text, {
      language: language === "DE" ? "de-DE" : "en-US",
      rate: 0.98,
      onDone: () => opts?.onEnd?.(),
      onStopped: () => opts?.onEnd?.(),
    });
  }
}

export async function stopNatural() {
  if (currentSound) {
    try { await currentSound.stopAsync(); await currentSound.unloadAsync(); } catch {}
    currentSound = null;
  } else {
    const Speech = await import("expo-speech");
    try { Speech.stop(); } catch {}
  }
}
