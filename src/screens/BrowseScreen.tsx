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
} from "react-native";
import { api } from "../services/api";
import { GarmentInfo } from "../types";

interface Props {
  navigation: any;
}

export default function BrowseScreen({ navigation }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [garment, setGarment] = useState<GarmentInfo | null>(null);

  const handleScrape = async () => {
    if (!url.includes("nike.com")) {
      Alert.alert("Unsupported", "Only Nike product URLs are supported right now.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.garments.scrape(url);
      setGarment(result);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = (productId: string) => {
    navigation.getParent()?.navigate("TryOnCapture", { productId }) ??
      navigation.navigate("TryOnCapture", { productId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Find a Product</Text>
      <Text style={styles.subheading}>
        Paste a Nike product URL to try it on virtually
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://www.nike.com/t/..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.goButton, !url && styles.goButtonDisabled]}
          onPress={handleScrape}
          disabled={!url || loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.goText}>Go</Text>
          )}
        </TouchableOpacity>
      </View>

      {garment && (
        <View style={styles.productCard}>
          {garment.image_urls.length > 0 && (
            <Image
              source={{ uri: garment.image_urls[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          )}

          <Text style={styles.productName}>{garment.name}</Text>
          <Text style={styles.productBrand}>{garment.brand}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailChip}>
              <Text style={styles.chipLabel}>Fit</Text>
              <Text style={styles.chipValue}>{garment.fit_type}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.chipLabel}>Sizes</Text>
              <Text style={styles.chipValue}>
                {garment.sizes.map((s) => s.size_label).join(", ")}
              </Text>
            </View>
          </View>

          {garment.sizes.length > 0 && (
            <View style={styles.sizeChartSection}>
              <Text style={styles.sectionTitle}>Size Chart (cm)</Text>
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

          <View style={styles.materialsSection}>
            <Text style={styles.sectionTitle}>Materials</Text>
            {Object.entries(garment.material_composition).map(([mat, pct]) => (
              <Text key={mat} style={styles.materialText}>
                {mat}: {(pct * 100).toFixed(0)}%
              </Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.tryOnButton}
            onPress={() => handleTryOn(garment.product_id)}
          >
            <Text style={styles.tryOnText}>Try It On</Text>
          </TouchableOpacity>
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
    paddingTop: 60,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f5f5dc",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: "#888",
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#f5f5dc",
    borderWidth: 1,
    borderColor: "#333",
  },
  goButton: {
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  goButtonDisabled: {
    opacity: 0.3,
  },
  goText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  productCard: {
    marginTop: 24,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#222",
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f5f5dc",
    padding: 20,
    paddingBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: "#888",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  detailChip: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 12,
    flex: 1,
  },
  chipLabel: {
    fontSize: 12,
    color: "#888",
  },
  chipValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f5f5dc",
    marginTop: 4,
  },
  sizeChartSection: {
    padding: 20,
    paddingBottom: 0,
  },
  chartRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
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
  materialsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 8,
  },
  materialText: {
    fontSize: 14,
    color: "#ccc",
    textTransform: "capitalize",
  },
  tryOnButton: {
    backgroundColor: "#f5f5dc",
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  tryOnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },
});
