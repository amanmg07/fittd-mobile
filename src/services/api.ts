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
  },
};
