import React, { useState, useEffect, useRef } from "react";
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
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import { api } from "../services/api";
import { storage } from "../services/storage";
import { TryOnResult, GarmentInfo, SizeRecommendation } from "../types";

const viewerHtml = require("./TryOnViewer.html");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ViewMode = "ai" | "3d";

interface AngleImage {
  angle: string;
  image_b64: string;
}

interface Props {
  route: { params: { productId: string } };
  navigation: any;
}

export default function TryOnScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const webviewRef = useRef<WebView>(null);
  const flatListRef = useRef<FlatList>(null);
  const [loading, setLoading] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("ai");

  // Multi-angle AI try-on state
  const [angleImages, setAngleImages] = useState<AngleImage[]>([]);
  const [activeAngle, setActiveAngle] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  // 3D try-on state
  const [result, setResult] = useState<TryOnResult | null>(null);

  // Shared state
  const [garment, setGarment] = useState<GarmentInfo | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);

  useEffect(() => {
    loadAiTryOn();
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

      const storedPhoto = await storage.loadFrontPhoto();

      // Try multi-angle first
      try {
        const multiResult = await api.tryon.aiMultiAngle({
          user_id: "user_1",
          product_id: productId,
          photo: storedPhoto || undefined,
        });

        setAngleImages(multiResult.images);
        setSelectedSize(multiResult.selected_size);
        if (multiResult.recommendation) {
          setRecommendation(multiResult.recommendation as SizeRecommendation);
        }
      } catch {
        // Fall back to single image
        const aiResult = await api.tryon.aiTryOn({
          user_id: "user_1",
          product_id: productId,
          photo: storedPhoto || undefined,
        });

        setAngleImages([{ angle: "Front", image_b64: aiResult.image_b64 }]);
        setSelectedSize(aiResult.selected_size);
        if (aiResult.recommendation) {
          setRecommendation(aiResult.recommendation as SizeRecommendation);
        }
      }

      // Load garment info
      try {
        const garmentInfo = await api.garments.get(productId);
        setGarment(garmentInfo);
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

      const tryOnResult = await api.tryon.create({
        user_id: "user_1",
        product_id: productId,
        size,
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

  const onAngleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
    setActiveAngle(index);
  };

  const viewerWidth = SCREEN_WIDTH - 32;

  if (loading && angleImages.length === 0 && !result) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f5f5dc" />
        <Text style={styles.loadingText}>
          {viewMode === "ai"
            ? "Generating AI try-on...\nThis may take 30-60 seconds"
            : "Generating your virtual try-on..."}
        </Text>
      </View>
    );
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
          angleImages.length > 0 ? (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={angleImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onAngleScroll}
                keyExtractor={(item) => item.angle}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: `data:image/png;base64,${item.image_b64}` }}
                    style={[styles.aiImage, { width: viewerWidth }]}
                    resizeMode="contain"
                  />
                )}
              />
              {/* Angle indicator dots + label */}
              {angleImages.length > 1 && (
                <View style={styles.angleIndicator}>
                  <Text style={styles.angleLabel}>
                    {angleImages[activeAngle]?.angle}
                  </Text>
                  <View style={styles.dots}>
                    {angleImages.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === activeAngle && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
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

        {garment?.sizes && (
          <View style={styles.sizeRow}>
            {garment.sizes.map((s) => {
              const score = recommendation?.size_scores[s.size_label];
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

        {recommendation && (
          <View style={styles.fitNotes}>
            <Text style={styles.notesTitle}>Fit Analysis</Text>
            {(recommendation.fit_notes || []).map((note, i) => (
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
  },
  loadingText: {
    color: "#888",
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
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
  angleIndicator: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  angleLabel: {
    color: "#f5f5dc",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#f5f5dc",
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
  fitNotes: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
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
