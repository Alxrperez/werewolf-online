import { Howl, Howler } from "howler";

// ─── Sound definitions ─────────────────────────────────────────────────────────
// All sounds are generated via Web Audio API (no external files needed for dev).
// In production, replace src paths with actual audio files.

type SoundName =
  | "night_ambience"
  | "dawn_chime"
  | "vote_drum"
  | "death_sting"
  | "role_reveal"
  | "wolf_howl"
  | "button_click"
  | "accusation"
  | "game_over_win"
  | "game_over_lose";

// Web Audio API tone generator (fallback for dev — no file deps)
function createToneDataUrl(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  fadeOut = true
): string {
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = fadeOut ? Math.max(0, 1 - t / duration) : 1;
    let sample = 0;
    if (type === "sine") sample = Math.sin(2 * Math.PI * freq * t);
    else if (type === "triangle") sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
    else if (type === "sawtooth") sample = 2 * (t * freq - Math.floor(t * freq + 0.5));
    buffer[i] = sample * envelope * 0.3;
  }

  // Encode as WAV
  const wavBuffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, buffer[i]! * 32767)), true);
  }

  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

// ─── Sound manager ─────────────────────────────────────────────────────────────

class SoundManager {
  private sounds = new Map<SoundName, Howl>();
  private muted = false;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // Build simple synthesized sounds (no file deps)
    const defs: [SoundName, number, number, OscillatorType][] = [
      ["button_click",    800, 0.08,  "sine"],
      ["accusation",      400, 0.25,  "sawtooth"],
      ["vote_drum",       120, 0.3,   "triangle"],
      ["dawn_chime",      660, 0.6,   "sine"],
      ["death_sting",     220, 0.8,   "sawtooth"],
      ["role_reveal",     528, 0.5,   "sine"],
      ["wolf_howl",       180, 1.2,   "sawtooth"],
      ["night_ambience",  80,  2.0,   "sine"],
      ["game_over_win",   523, 1.0,   "sine"],
      ["game_over_lose",  196, 1.0,   "triangle"],
    ];

    for (const [name, freq, dur, type] of defs) {
      try {
        const url = createToneDataUrl(freq, dur, type);
        this.sounds.set(name, new Howl({ src: [url], format: ["wav"], volume: 0.5 }));
      } catch {
        // Silently skip if Web Audio is unavailable
      }
    }
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.sounds.get(name)?.play();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    Howler.mute(muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Load real audio files for production */
  loadFile(name: SoundName, src: string[]): void {
    this.sounds.set(name, new Howl({ src, volume: 0.5 }));
  }
}

export const soundManager = new SoundManager();
