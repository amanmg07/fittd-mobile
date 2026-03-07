import { BodyProfile, GarmentInfo, TryOnResult, Gender } from "../types";

const API_BASE = __DEV__
  ? "https://fittd-production.up.railway.app"
  : "https://fittd-production.up.railway.app";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  body: {
    scan(params: {
      user_id: string;
      gender: Gender;
      height_cm: number;
      weight_kg: number;
      front_image: string;
      side_image: string;
    }): Promise<BodyProfile> {
      return request("/api/body/scan", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    getProfile(userId: string): Promise<BodyProfile> {
      return request(`/api/body/${userId}`);
    },

    getMeshUrl(userId: string): string {
      return `${API_BASE}/api/body/${userId}/mesh.glb`;
    },

    restore(profile: BodyProfile, frontPhoto?: string | null): Promise<BodyProfile> {
      return request("/api/body/restore", {
        method: "PUT",
        body: JSON.stringify({
          profile,
          front_photo: frontPhoto || null,
        }),
      });
    },

    async ensureProfile(userId: string): Promise<BodyProfile | null> {
      try {
        return await this.getProfile(userId);
      } catch {
        // Profile missing on server — try restoring from local storage
        const { storage } = require("../services/storage");
        const local = await storage.loadProfile();
        if (local && local.user_id === userId) {
          const photo = await storage.loadFrontPhoto();
          return await this.restore(local, photo);
        }
        return null;
      }
    },
  },

  garments: {
    scrape(url: string, gender: Gender = "male"): Promise<GarmentInfo> {
      return request(`/api/garments/scrape?url=${encodeURIComponent(url)}&gender=${gender}`, {
        method: "POST",
      });
    },

    get(productId: string): Promise<GarmentInfo> {
      return request(`/api/garments/${productId}`);
    },

    list(): Promise<GarmentInfo[]> {
      return request("/api/garments/");
    },
  },

  tryon: {
    create(params: {
      user_id: string;
      product_id: string;
      size?: string;
    }): Promise<TryOnResult> {
      return request("/api/tryon/", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    getSceneUrl(sceneKey: string): string {
      return `${API_BASE}/api/tryon/scene/${sceneKey}.glb`;
    },

    aiTryOn(params: {
      user_id: string;
      product_id: string;
      size?: string;
      photo?: string;
    }): Promise<{
      image_b64: string;
      selected_size: string;
      recommendation: {
        recommended_size: string;
        confidence: number;
        fit_notes: string[];
        size_scores: Record<string, number>;
      } | null;
    }> {
      return request("/api/tryon/ai", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  },
};
