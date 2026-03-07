import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { api } from "../services/api";
import { TryOnResult, GarmentInfo } from "../types";

const viewerHtml = require("./TryOnViewer.html");

interface Props {
  route: { params: { productId: string } };
  navigation: any;
}

export default function TryOnScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [garment, setGarment] = useState<GarmentInfo | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    loadTryOn();
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

  const loadTryOn = async (size?: string) => {
    setLoading(true);
    try {
      const tryOnResult = await api.tryon.create({
        user_id: "user_1",
        product_id: productId,
        size,
      });
      setResult(tryOnResult);
      setSelectedSize(tryOnResult.selected_size);

      if (!garment) {
        const garmentInfo = await api.garments.get(tryOnResult.product_id);
        setGarment(garmentInfo);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    loadTryOn(size);
  };

  const onWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") setViewerReady(true);
      if (msg.type === "error") console.error("3D viewer error:", msg.message);
    } catch {}
  };

  if (loading && !result) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Generating your virtual try-on...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.viewer}>
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
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>

      <ScrollView style={styles.controls}>
        {garment && (
          <Text style={styles.productName}>{garment.name}</Text>
        )}

        {result && (
          <View style={styles.recommendation}>
            <Text style={styles.recLabel}>Recommended Size</Text>
            <Text style={styles.recSize}>
              {result.recommendation.recommended_size}
            </Text>
            <Text style={styles.recConfidence}>
              {(result.recommendation.confidence * 100).toFixed(0)}% confidence
            </Text>
          </View>
        )}

        {garment?.sizes && (
          <View style={styles.sizeRow}>
            {garment.sizes.map((s) => {
              const score = result?.recommendation.size_scores[s.size_label];
              const isSelected = selectedSize === s.size_label;
              const isRecommended =
                s.size_label === result?.recommendation.recommended_size;

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

        {result && (
          <View style={styles.fitNotes}>
            <Text style={styles.notesTitle}>Fit Analysis</Text>
            {(result.recommendation.fit_notes || []).map((note, i) => (
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
  },
  viewer: {
    height: "50%",
    backgroundColor: "#111",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    flex: 1,
    padding: 24,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
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
    color: "#fff",
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
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  sizeRecommended: {
    borderColor: "#4CAF50",
  },
  sizeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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
