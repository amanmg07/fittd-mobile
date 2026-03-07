import AsyncStorage from "@react-native-async-storage/async-storage";
import { BodyProfile } from "../types";

const PROFILE_KEY = "fittd_body_profile";

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
};
