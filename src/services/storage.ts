import AsyncStorage from "@react-native-async-storage/async-storage";
import { BodyProfile } from "../types";

const PROFILE_KEY = "fittd_body_profile";
const PHOTO_KEY = "fittd_front_photo";
const SIDE_PHOTO_KEY = "fittd_side_photo";
const RECENT_TRYONS_KEY = "fittd_recent_tryons";
const UNIT_SYSTEM_KEY = "fittd_unit_system";
const LAST_TRYON_KEY = "fittd_last_tryon";
const SCAN_HISTORY_KEY = "fittd_scan_history";

export interface LastTryOn {
  product_id: string;
  name: string;
  brand: string;
  image_b64: string;
  timestamp: number;
}

export interface RecentTryOn {
  product_id: string;
  name: string;
  brand: string;
  image_url: string;
  timestamp: number;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  type: "scan" | "tryon";
  profile: BodyProfile | null;
  thumbnail_b64: string | null;
  // Try-on specific fields
  product_name?: string;
  product_brand?: string;
  selected_size?: string;
  tryon_image_b64?: string;
}

export const storage = {
  async saveProfile(profile: BodyProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  async loadProfile(): Promise<BodyProfile | null> {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  },

  async clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(PROFILE_KEY);
  },

  async saveFrontPhoto(base64: string): Promise<void> {
    await AsyncStorage.setItem(PHOTO_KEY, base64);
  },

  async loadFrontPhoto(): Promise<string | null> {
    return await AsyncStorage.getItem(PHOTO_KEY);
  },

  async saveSidePhoto(base64: string): Promise<void> {
    await AsyncStorage.setItem(SIDE_PHOTO_KEY, base64);
  },

  async loadSidePhoto(): Promise<string | null> {
    return await AsyncStorage.getItem(SIDE_PHOTO_KEY);
  },

  async saveUnitSystem(system: "metric" | "imperial"): Promise<void> {
    await AsyncStorage.setItem(UNIT_SYSTEM_KEY, system);
  },

  async loadUnitSystem(): Promise<"metric" | "imperial"> {
    const val = await AsyncStorage.getItem(UNIT_SYSTEM_KEY);
    return val === "imperial" ? "imperial" : "metric";
  },

  async saveLastTryOn(item: LastTryOn): Promise<void> {
    await AsyncStorage.setItem(LAST_TRYON_KEY, JSON.stringify(item));
  },

  async loadLastTryOn(): Promise<LastTryOn | null> {
    const data = await AsyncStorage.getItem(LAST_TRYON_KEY);
    return data ? JSON.parse(data) : null;
  },

  async addRecentTryOn(item: RecentTryOn): Promise<void> {
    const existing = await this.loadRecentTryOns();
    const filtered = existing.filter((t) => t.product_id !== item.product_id);
    const updated = [item, ...filtered].slice(0, 10);
    await AsyncStorage.setItem(RECENT_TRYONS_KEY, JSON.stringify(updated));
  },

  async loadRecentTryOns(): Promise<RecentTryOn[]> {
    const data = await AsyncStorage.getItem(RECENT_TRYONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addScanToHistory(profile: BodyProfile, thumbnail_b64: string | null): Promise<void> {
    const existing = await this.loadScanHistory();
    const item: ScanHistoryItem = {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      type: "scan",
      profile,
      thumbnail_b64,
    };
    const updated = [item, ...existing].slice(0, 30);
    await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
  },

  async addTryOnToHistory(params: {
    tryon_image_b64: string;
    product_name: string;
    product_brand: string;
    selected_size: string;
  }): Promise<void> {
    const existing = await this.loadScanHistory();
    const item: ScanHistoryItem = {
      id: `tryon_${Date.now()}`,
      timestamp: Date.now(),
      type: "tryon",
      profile: null,
      thumbnail_b64: null,
      tryon_image_b64: params.tryon_image_b64,
      product_name: params.product_name,
      product_brand: params.product_brand,
      selected_size: params.selected_size,
    };
    const updated = [item, ...existing].slice(0, 30);
    await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
  },

  async loadScanHistory(): Promise<ScanHistoryItem[]> {
    const data = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  },
};
