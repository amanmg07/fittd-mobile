import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { GarmentInfo } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - 48;

interface Props {
  navigation: any;
}

export default function BrowseScreen({ navigation }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [garment, setGarment] = useState<GarmentInfo | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text);
  };

  const handleScrape = async () => {
    if (!url.includes("nike.com")) {
      Alert.alert("Unsupported", "Only Nike product URLs are supported right now.");
      return;
    }

    setLoading(true);
    setGarment(null);
    try {
      const result = await api.garments.scrape(url);
      setGarment(result);
      setActiveImageIndex(0);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = (productId: string) => {
    navigation.getParent()?.navigate("TryOn", { productId }) ??
      navigation.navigate("TryOn", { productId });
  };

  const onImageScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / IMAGE_WIDTH);
    setActiveImageIndex(index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="link-outline" size={20} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={url}
          onChangeText={setUrl}
          placeholder="Paste a Nike product URL"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleScrape}
        />
        {!url ? (
          <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
            <Ionicons name="clipboard-outline" size={18} color="#f5f5dc" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.clearButton} onPress={() => { setUrl(""); setGarment(null); }}>
            <Ionicons name="close-circle" size={20} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.searchButton, (!url || loading) && styles.searchButtonDisabled]}
        onPress={handleScrape}
        disabled={!url || loading}
      >
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <>
            <Ionicons name="search" size={18} color="#0a0a0a" />
            <Text style={styles.searchButtonText}>Find Product</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Empty state */}
      {!garment && !loading && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="shirt-outline" size={40} color="#333" />
          </View>
          <Text style={styles.emptyTitle}>Try on any Nike product</Text>
          <Text style={styles.emptyDesc}>
            Copy a product URL from Nike.com and paste it above to see how it looks on you
          </Text>
          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Find a product on nike.com</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Copy the product URL</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Paste it here and tap Find</Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#f5f5dc" />
          <Text style={styles.loadingText}>Fetching product details...</Text>
        </View>
      )}

      {/* Product card */}
      {garment && (
        <View style={styles.productCard}>
          {/* Image carousel */}
          {garment.image_urls.length > 0 && (
            <View>
              <FlatList
                data={garment.image_urls.slice(0, 5)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onImageScroll}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={[styles.productImage, { width: IMAGE_WIDTH }]}
                    resizeMode="cover"
                  />
                )}
              />
              {garment.image_urls.length > 1 && (
                <View style={styles.imageDots}>
                  {garment.image_urls.slice(0, 5).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.imageDot, i === activeImageIndex && styles.imageDotActive]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.cardBody}>
            <Text style={styles.productBrand}>{garment.brand}</Text>
            <Text style={styles.productName}>{garment.name}</Text>

            {/* Tags */}
            <View style={styles.tags}>
              {garment.color ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{garment.color}</Text>
                </View>
              ) : null}
              <View style={styles.tag}>
                <Text style={styles.tagText}>{garment.fit_type} fit</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{garment.category}</Text>
              </View>
            </View>

            {/* Sizes */}
            <Text style={styles.sectionLabel}>Available Sizes</Text>
            <View style={styles.sizeChips}>
              {garment.sizes.map((s) => (
                <View key={s.size_label} style={styles.sizeChip}>
                  <Text style={styles.sizeChipText}>{s.size_label}</Text>
                </View>
              ))}
            </View>

            {/* Size chart */}
            {garment.sizes.length > 0 && (
              <View style={styles.sizeChartSection}>
                <Text style={styles.sectionLabel}>Size Chart (cm)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.chartRow}>
                      <Text style={[styles.chartCell, styles.chartHeader, styles.chartLabelCell]}>Size</Text>
                      {garment.sizes.map((s) => (
                        <Text key={s.size_label} style={[styles.chartCell, styles.chartHeader]}>
                          {s.size_label}
                        </Text>
                      ))}
                    </View>
                    {[
                      { label: "Chest", key: "chest_cm" },
                      { label: "Waist", key: "waist_cm" },
                      { label: "Length", key: "length_cm" },
                      { label: "Shoulder", key: "shoulder_cm" },
                      { label: "Sleeve", key: "sleeve_cm" },
                    ]
                      .filter((row) => garment.sizes.some((s) => (s as any)[row.key] != null))
                      .map((row) => (
                        <View key={row.key} style={styles.chartRow}>
                          <Text style={[styles.chartCell, styles.chartLabelCell, styles.chartLabel]}>
                            {row.label}
                          </Text>
                          {garment.sizes.map((s) => (
                            <Text key={s.size_label} style={styles.chartCell}>
                              {(s as any)[row.key] != null ? (s as any)[row.key] : "—"}
                            </Text>
                          ))}
                        </View>
                      ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Materials */}
            <Text style={styles.sectionLabel}>Materials</Text>
            <View style={styles.materialsRow}>
              {Object.entries(garment.material_composition).map(([mat, pct]) => (
                <View key={mat} style={styles.materialChip}>
                  <Text style={styles.materialPct}>{(pct * 100).toFixed(0)}%</Text>
                  <Text style={styles.materialName}>{mat}</Text>
                </View>
              ))}
            </View>

            {/* Try On button */}
            <TouchableOpacity
              style={styles.tryOnButton}
              onPress={() => handleTryOn(garment.product_id)}
            >
              <Ionicons name="body-outline" size={20} color="#0a0a0a" />
              <Text style={styles.tryOnText}>Try It On</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: "#f5f5dc",
  },
  pasteButton: {
    padding: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  clearButton: {
    padding: 8,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f5f5dc",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  searchButtonDisabled: {
    opacity: 0.3,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  steps: {
    width: "100%",
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#f5f5dc",
    fontSize: 14,
    fontWeight: "700",
  },
  stepText: {
    color: "#888",
    fontSize: 15,
  },
  // Loading
  loadingCard: {
    alignItems: "center",
    marginTop: 48,
    gap: 16,
  },
  loadingText: {
    color: "#888",
    fontSize: 15,
  },
  // Product card
  productCard: {
    marginTop: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    overflow: "hidden",
  },
  productImage: {
    height: 320,
    backgroundColor: "#222",
  },
  imageDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  imageDotActive: {
    backgroundColor: "#fff",
    width: 20,
  },
  cardBody: {
    padding: 20,
  },
  productBrand: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f5f5dc",
    marginTop: 4,
    marginBottom: 14,
  },
  // Tags
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 13,
    color: "#aaa",
    textTransform: "capitalize",
  },
  // Sizes
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sizeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  sizeChip: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 48,
    alignItems: "center",
  },
  sizeChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f5f5dc",
  },
  // Size chart
  sizeChartSection: {
    marginBottom: 20,
  },
  chartRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  chartCell: {
    width: 64,
    paddingVertical: 12,
    fontSize: 13,
    color: "#ccc",
    textAlign: "center",
  },
  chartLabelCell: {
    width: 80,
    textAlign: "left",
  },
  chartHeader: {
    fontWeight: "700",
    color: "#f5f5dc",
  },
  chartLabel: {
    color: "#888",
    fontWeight: "600",
  },
  // Materials
  materialsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  materialChip: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  materialPct: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  materialName: {
    fontSize: 11,
    color: "#888",
    textTransform: "capitalize",
    marginTop: 2,
  },
  // Try on
  tryOnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f5f5dc",
    borderRadius: 14,
    padding: 18,
  },
  tryOnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },
});
