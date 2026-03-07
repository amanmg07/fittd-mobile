export type Gender = "male" | "female";

export type FitType = "slim" | "regular" | "relaxed" | "oversized";

export interface BodyMeasurements {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
  shoulder_width: number;
  arm_length: number;
  neck: number;
  torso_length: number;
}

export interface BodyProfile {
  user_id: string;
  gender: Gender;
  measurements: BodyMeasurements;
  mesh_url: string;
  smplx_params: Record<string, unknown>;
}

export interface GarmentSize {
  size_label: string;
  chest_cm: number;
  waist_cm?: number;
  length_cm: number;
  shoulder_cm?: number;
  sleeve_cm?: number;
}

export interface GarmentInfo {
  product_id: string;
  name: string;
  brand: string;
  url: string;
  image_urls: string[];
  fit_type: FitType;
  material_composition: Record<string, number>;
  sizes: GarmentSize[];
  category: string;
  color: string;
}

export interface SizeRecommendation {
  recommended_size: string;
  confidence: number;
  fit_notes: string[];
  size_scores: Record<string, number>;
}

export interface TryOnResult {
  user_id: string;
  product_id: string;
  selected_size: string;
  recommendation: SizeRecommendation;
  scene_url: string;
  fit_map_url: string;
}
