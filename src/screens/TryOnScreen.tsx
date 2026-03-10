import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { api } from "../services/api";
import { storage } from "../services/storage";
import { TryOnResult, GarmentInfo, SizeRecommendation, BodyProfile, GarmentSize } from "../types";
import { UnitSystem, formatLength, cmToIn, lengthUnit } from "../utils/units";

const viewerHtml = require("./TryOnViewer.html");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ViewMode = "ai" | "3d";

interface Props {
  route: { params: { productId: string } };
  navigation: any;
}

const LOADING_TIPS = [
  { icon: "sparkles-outline" as const, text: "Our AI is fitting the garment to your body shape" },
  { icon: "body-outline" as const, text: "We use your exact measurements for a realistic fit" },
  { icon: "resize-outline" as const, text: "Swipe through multiple angles when ready" },
  { icon: "shirt-outline" as const, text: "Try different sizes to compare the fit" },
  { icon: "color-palette-outline" as const, text: "Colors may vary slightly from the actual product" },
];

function LoadingScreen({ viewMode }: { viewMode: ViewMode }) {
  const [tipIndex, setTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for the icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Rotate tips every 4 seconds
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4000);

    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, []);

  const tip = LOADING_TIPS[tipIndex];

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingIconCircle, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons name="shirt-outline" size={40} color="#f5f5dc" />
      </Animated.View>
      <Text style={styles.loadingTitle}>
        {viewMode === "ai" ? "Generating AI Try-On" : "Building 3D Model"}
      </Text>
      <Text style={styles.loadingSubtitle}>This usually takes 30–60 seconds</Text>

      {/* Progress dots */}
      <View style={styles.loadingDots}>
        {LOADING_TIPS.map((_, i) => (
          <View key={i} style={[styles.loadingDot, i === tipIndex && styles.loadingDotActive]} />
        ))}
      </View>

      {/* Rotating tips */}
      <Animated.View style={[styles.tipContainer, { opacity: fadeAnim }]}>
        <Ionicons name={tip.icon} size={20} color="#888" />
        <Text style={styles.tipText}>{tip.text}</Text>
      </Animated.View>
    </View>
  );
}

// --- Fit analysis helpers ---

type FitZone = "tight" | "snug" | "good" | "roomy" | "loose";

interface FitDetail {
  area: string;
  icon: keyof typeof Ionicons.glyphMap;
  ease: number; // cm of room (garment - body)
  zone: FitZone;
}

function getZone(ease: number, area: string): FitZone {
  // Different thresholds per area
  if (area === "Shoulders") {
    if (ease < -1) return "tight";
    if (ease < 1) return "snug";
    if (ease < 4) return "good";
    if (ease < 8) return "roomy";
    return "loose";
  }
  // Chest/Waist
  if (ease < 0) return "tight";
  if (ease < 3) return "snug";
  if (ease < 8) return "good";
  if (ease < 14) return "roomy";
  return "loose";
}

const ZONE_COLORS: Record<FitZone, string> = {
  tight: "#FF5252",
  snug: "#FFA726",
  good: "#4CAF50",
  roomy: "#42A5F5",
  loose: "#AB47BC",
};

const ZONE_LABELS: Record<FitZone, string> = {
  tight: "Tight",
  snug: "Snug",
  good: "Good fit",
  roomy: "Roomy",
  loose: "Loose",
};

function computeFitDetails(body: BodyProfile, size: GarmentSize): FitDetail[] {
  const details: FitDetail[] = [];
  const m = body.measurements;

  if (size.chest_cm != null) {
    const ease = size.chest_cm - m.chest;
    details.push({ area: "Chest", icon: "fitness-outline", ease, zone: getZone(ease, "Chest") });
  }
  if (size.waist_cm != null) {
    const ease = size.waist_cm - m.waist;
    details.push({ area: "Waist", icon: "resize-outline", ease, zone: getZone(ease, "Waist") });
  }
  if (size.shoulder_cm != null) {
    const ease = size.shoulder_cm - m.shoulder_width;
    details.push({ area: "Shoulders", icon: "body-outline", ease, zone: getZone(ease, "Shoulders") });
  }

  return details;
}

function getReturnRisk(details: FitDetail[]): { level: "Low" | "Medium" | "High"; color: string } {
  if (details.length === 0) return { level: "Low", color: "#4CAF50" };
  const hasTight = details.some((d) => d.zone === "tight");
  const hasLoose = details.some((d) => d.zone === "loose");
  const hasSnugOrRoomy = details.some((d) => d.zone === "snug" || d.zone === "roomy");

  if (hasTight) return { level: "High", color: "#FF5252" };
  if (hasLoose || hasSnugOrRoomy) return { level: "Medium", color: "#FFA726" };
  return { level: "Low", color: "#4CAF50" };
}

function getLengthDescription(body: BodyProfile, size: GarmentSize): string | null {
  if (size.length_cm == null) return null;
  const torso = body.measurements.torso_length;
  if (!torso) return null;

  const ratio = size.length_cm / torso;
  if (ratio < 0.85) return "Hits above the waist — cropped fit";
  if (ratio < 0.95) return "Hits at the waist — regular length";
  if (ratio < 1.05) return "Hits at the hip — standard length";
  if (ratio < 1.15) return "Hits below the hip — longer fit";
  return "Hits at mid-thigh — extended length";
}

// --- Fit Analysis Component ---

function FitAnalysis({
  body,
  garment,
  selectedSize,
  recommendation,
  unit,
}: {
  body: BodyProfile;
  garment: GarmentInfo;
  selectedSize: string | null;
  recommendation: SizeRecommendation | null;
  unit: UnitSystem;
}) {
  const size = garment.sizes?.find((s) => s.size_label === selectedSize);
  if (!size) return null;

  const details = computeFitDetails(body, size);
  const risk = getReturnRisk(details);
  const lengthDesc = getLengthDescription(body, size);

  if (details.length === 0 && !lengthDesc) return null;

  return (
    <View style={styles.fitAnalysis}>
      {/* Return risk badge */}
      <View style={styles.riskBadge}>
        <Ionicons
          name={risk.level === "Low" ? "shield-checkmark" : risk.level === "Medium" ? "alert-circle" : "warning"}
          size={18}
          color={risk.color}
        />
        <Text style={[styles.riskText, { color: risk.color }]}>
          {risk.level} return risk
        </Text>
      </View>

      {/* Fit map */}
      {details.length > 0 && (
        <>
          <Text style={styles.fitSectionTitle}>Fit Breakdown</Text>
          {details.map((d) => (
            <View key={d.area} style={styles.fitRow}>
              <View style={styles.fitRowLeft}>
                <Ionicons name={d.icon} size={18} color="#888" />
                <Text style={styles.fitArea}>{d.area}</Text>
              </View>
              <View style={styles.fitRowRight}>
                <View style={styles.fitBarBg}>
                  <View
                    style={[
                      styles.fitBarFill,
                      {
                        backgroundColor: ZONE_COLORS[d.zone],
                        width: `${Math.min(Math.max((d.ease + 5) / 20 * 100, 10), 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.fitLabels}>
                  <Text style={[styles.fitZone, { color: ZONE_COLORS[d.zone] }]}>
                    {ZONE_LABELS[d.zone]}
                  </Text>
                  <Text style={styles.fitEase}>
                    {d.ease > 0 ? "+" : ""}
                    {unit === "metric" ? d.ease.toFixed(1) : cmToIn(d.ease)}
                    {lengthUnit(unit)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Length preview */}
      {lengthDesc && (
        <View style={styles.lengthRow}>
          <Ionicons name="arrow-down-outline" size={18} color="#888" />
          <View>
            <Text style={styles.lengthLabel}>Length</Text>
            <Text style={styles.lengthDesc}>{lengthDesc}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function TryOnScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("ai");

  // AI try-on image
  const [aiImageB64, setAiImageB64] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Unit preference
  const [unit, setUnit] = useState<UnitSystem>("metric");

  // 3D try-on state
  const [result, setResult] = useState<TryOnResult | null>(null);

  // Shared state
  const [garment, setGarment] = useState<GarmentInfo | null>(null);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);

  useEffect(() => {
    loadAiTryOn();
    storage.loadUnitSystem().then(setUnit);
  }, []);

  useEffect(() => {
    if (viewerReady && result) {
      sendModelUrl(result.scene_url);
    }
  }, [viewerReady, result]);

  const sendModelUrl = (sceneUrl: string) => {
    const url = sceneUrl.startsWith("http")
      ? sceneUrl
      : api.tryon.getSceneUrl(sceneUrl.replace("/api/tryon/scene/", "").replace(".glb", ""));
    webviewRef.current?.postMessage(JSON.stringify({ type: "loadModel", url }));
  };

  const loadAiTryOn = async () => {
    setAiLoading(true);
    setLoading(true);
    try {
      const profile = await api.body.ensureProfile("user_1");
      if (!profile) {
        Alert.alert("No Body Scan", "Please scan your body first.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setBodyProfile(profile);

      const storedPhoto = await storage.loadFrontPhoto();

      const aiResult = await api.tryon.aiTryOn({
        user_id: "user_1",
        product_id: productId,
        photo: storedPhoto || undefined,
      });

      setAiImageB64(aiResult.image_b64);
      setSelectedSize(aiResult.selected_size);
      if (aiResult.recommendation) {
        setRecommendation(aiResult.recommendation as SizeRecommendation);
      }

      // Load garment info & save last try-on
      try {
        const garmentInfo = await api.garments.get(productId);
        setGarment(garmentInfo);
        storage.addRecentTryOn({
          product_id: garmentInfo.product_id,
          name: garmentInfo.name,
          brand: garmentInfo.brand,
          image_url: garmentInfo.image_urls[0] || "",
          timestamp: Date.now(),
        });
        storage.saveLastTryOn({
          product_id: garmentInfo.product_id,
          name: garmentInfo.name,
          brand: garmentInfo.brand,
          image_b64: aiResult.image_b64,
          timestamp: Date.now(),
        });
        storage.addTryOnToHistory({
          tryon_image_b64: aiResult.image_b64,
          product_name: garmentInfo.name,
          product_brand: garmentInfo.brand,
          selected_size: aiResult.selected_size,
        });
      } catch {}
    } catch (error: any) {
      Alert.alert("AI Try-On Failed", error.message + "\nFalling back to 3D view.");
      setViewMode("3d");
      load3dTryOn();
    } finally {
      setAiLoading(false);
      setLoading(false);
    }
  };

  const load3dTryOn = async (size?: string) => {
    setLoading(true);
    try {
      const profile = await api.body.ensureProfile("user_1");
      if (!profile) {
        Alert.alert("No Body Scan", "Please scan your body first.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        setLoading(false);
        return;
      }

      const storedPhoto = await storage.loadFrontPhoto();
      const tryOnResult = await api.tryon.create({
        user_id: "user_1",
        product_id: productId,
        size,
        photo: storedPhoto || undefined,
      });
      setResult(tryOnResult);
      setSelectedSize(tryOnResult.selected_size);
      setRecommendation(tryOnResult.recommendation);

      if (!garment) {
        try {
          const garmentInfo = await api.garments.get(tryOnResult.product_id);
          setGarment(garmentInfo);
        } catch {}
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    if (viewMode === "3d") {
      load3dTryOn(size);
    }
  };

  const switchMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "3d" && !result) {
      load3dTryOn();
    }
  };

  const onWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") setViewerReady(true);
      if (msg.type === "error") console.error("3D viewer error:", msg.message);
    } catch {}
  };

  const viewerWidth = SCREEN_WIDTH - 32;

  if (loading && !aiImageB64 && !result) {
    return <LoadingScreen viewMode={viewMode} />;
  }

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === "ai" && styles.modeButtonActive]}
          onPress={() => switchMode("ai")}
        >
          <Text style={[styles.modeText, viewMode === "ai" && styles.modeTextActive]}>
            AI Photo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === "3d" && styles.modeButtonActive]}
          onPress={() => switchMode("3d")}
        >
          <Text style={[styles.modeText, viewMode === "3d" && styles.modeTextActive]}>
            3D Model
          </Text>
        </TouchableOpacity>
      </View>

      {/* Viewer area */}
      <View style={styles.viewer}>
        {viewMode === "ai" ? (
          aiImageB64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${aiImageB64}` }}
              style={[styles.aiImage, { width: viewerWidth }]}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.viewerPlaceholder}>
              {aiLoading ? (
                <>
                  <ActivityIndicator color="#f5f5dc" />
                  <Text style={styles.placeholderText}>Generating AI try-on...</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>AI try-on not available</Text>
              )}
            </View>
          )
        ) : (
          <>
            <WebView
              ref={webviewRef}
              source={viewerHtml}
              style={{ flex: 1, backgroundColor: "#111" }}
              onMessage={onWebViewMessage}
              javaScriptEnabled
              originWhitelist={["*"]}
              allowFileAccess
            />
            {loading && (
              <View style={styles.viewerOverlay}>
                <ActivityIndicator color="#f5f5dc" />
              </View>
            )}
          </>
        )}
      </View>

      <ScrollView style={styles.controls}>
        {garment && (
          <Text style={styles.productName}>{garment.name}</Text>
        )}

        {recommendation && (
          <View style={styles.recommendation}>
            <Text style={styles.recLabel}>Recommended Size</Text>
            <Text style={styles.recSize}>
              {recommendation.recommended_size}
            </Text>
            <Text style={styles.recConfidence}>
              {(recommendation.confidence * 100).toFixed(0)}% confidence
            </Text>
          </View>
        )}

        {garment?.sizes?.length > 0 && (
          <View style={styles.sizeRow}>
            {garment.sizes.map((s) => {
              const score = recommendation?.size_scores?.[s.size_label];
              const isSelected = selectedSize === s.size_label;
              const isRecommended =
                s.size_label === recommendation?.recommended_size;

              return (
                <TouchableOpacity
                  key={s.size_label}
                  style={[
                    styles.sizeButton,
                    isSelected && styles.sizeSelected,
                    isRecommended && !isSelected && styles.sizeRecommended,
                  ]}
                  onPress={() => handleSizeChange(s.size_label)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      isSelected && styles.sizeTextSelected,
                    ]}
                  >
                    {s.size_label}
                  </Text>
                  {score !== undefined && (
                    <Text style={styles.scoreText}>
                      {(score * 100).toFixed(0)}%
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {bodyProfile && garment && selectedSize && (
          <FitAnalysis
            body={bodyProfile}
            garment={garment}
            selectedSize={selectedSize}
            recommendation={recommendation}
            unit={unit}
          />
        )}

        {recommendation && (recommendation.fit_notes || []).length > 0 && (
          <View style={styles.fitNotes}>
            <Text style={styles.notesTitle}>Notes</Text>
            {recommendation.fit_notes.map((note, i) => (
              <Text key={i} style={styles.noteText}>
                {note}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 32,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a2a2a",
  },
  loadingDotActive: {
    backgroundColor: "#f5f5dc",
    width: 20,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 20,
  },
  tipText: {
    fontSize: 14,
    color: "#aaa",
    flex: 1,
    lineHeight: 20,
  },
  modeToggle: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: "#f5f5dc",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
  },
  modeTextActive: {
    color: "#0a0a0a",
  },
  viewer: {
    height: "45%",
    backgroundColor: "#111",
    borderRadius: 16,
    margin: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  aiImage: {
    flex: 1,
    backgroundColor: "#111",
  },
  viewerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#888",
    marginTop: 12,
    fontSize: 14,
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    flex: 1,
    paddingHorizontal: 24,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 16,
  },
  recommendation: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  recLabel: {
    fontSize: 12,
    color: "#888",
  },
  recSize: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f5f5dc",
    marginTop: 4,
  },
  recConfidence: {
    fontSize: 14,
    color: "#4CAF50",
    marginTop: 4,
  },
  sizeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  sizeButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    minWidth: 60,
  },
  sizeSelected: {
    backgroundColor: "#f5f5dc",
    borderColor: "#f5f5dc",
  },
  sizeRecommended: {
    borderColor: "#4CAF50",
  },
  sizeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  sizeTextSelected: {
    color: "#0a0a0a",
  },
  scoreText: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  // Fit analysis
  fitAnalysis: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  riskText: {
    fontSize: 14,
    fontWeight: "700",
  },
  fitSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fitRow: {
    marginBottom: 14,
  },
  fitRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  fitArea: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ccc",
  },
  fitRowRight: {},
  fitBarBg: {
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  fitBarFill: {
    height: 6,
    borderRadius: 3,
  },
  fitLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  fitZone: {
    fontSize: 12,
    fontWeight: "700",
  },
  fitEase: {
    fontSize: 12,
    color: "#666",
  },
  lengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  lengthLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  lengthDesc: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
  fitNotes: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 6,
    lineHeight: 20,
  },
});
