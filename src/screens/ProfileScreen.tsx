import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { storage, RecentTryOn } from "../services/storage";
import { BodyProfile } from "../types";

interface Props {
  navigation: any;
}

interface MeasurementItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [recentCount, setRecentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfile();
      storage.loadRecentTryOns().then((r) => setRecentCount(r.length));
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const saved = await storage.loadProfile();
      if (saved) {
        setProfile(saved);
        setLoading(false);
        return;
      }
      const p = await api.body.getProfile("user_1");
      setProfile(p);
      await storage.saveProfile(p);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f5f5dc" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="person-outline" size={40} color="#333" />
        </View>
        <Text style={styles.emptyText}>No body scan yet</Text>
        <Text style={styles.emptySubtext}>
          Set up your body profile to get personalized fit recommendations
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate("Scan")}
        >
          <Ionicons name="body-outline" size={20} color="#0a0a0a" />
          <Text style={styles.scanButtonText}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const m = profile.measurements;

  const upperBody: MeasurementItem[] = [
    { icon: "resize-outline", label: "Chest", value: `${m.chest} cm` },
    { icon: "resize-outline", label: "Shoulders", value: `${m.shoulder_width} cm` },
    { icon: "resize-outline", label: "Neck", value: `${m.neck} cm` },
    { icon: "resize-outline", label: "Arm Length", value: `${m.arm_length} cm` },
  ];

  const lowerBody: MeasurementItem[] = [
    { icon: "resize-outline", label: "Waist", value: `${m.waist} cm` },
    { icon: "resize-outline", label: "Hips", value: `${m.hips} cm` },
    { icon: "resize-outline", label: "Torso", value: `${m.torso_length} cm` },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color="#f5f5dc" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Your Profile</Text>
          <View style={styles.genderBadge}>
            <Ionicons
              name={profile.gender === "male" ? "male" : "female"}
              size={14}
              color="#f5f5dc"
            />
            <Text style={styles.genderText}>
              {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats overview */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{m.height}</Text>
          <Text style={styles.statUnit}>cm</Text>
          <Text style={styles.statLabel}>Height</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{m.weight}</Text>
          <Text style={styles.statUnit}>kg</Text>
          <Text style={styles.statLabel}>Weight</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{recentCount}</Text>
          <Text style={styles.statUnit}> </Text>
          <Text style={styles.statLabel}>Try-Ons</Text>
        </View>
      </View>

      {/* Upper body measurements */}
      <Text style={styles.sectionLabel}>Upper Body</Text>
      <View style={styles.measurementsCard}>
        {upperBody.map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.measurementRow,
              i === upperBody.length - 1 && styles.measurementRowLast,
            ]}
          >
            <View style={styles.measureLeft}>
              <View style={styles.measureIcon}>
                <Ionicons name={item.icon} size={16} color="#888" />
              </View>
              <Text style={styles.measureLabel}>{item.label}</Text>
            </View>
            <Text style={styles.measureValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Lower body measurements */}
      <Text style={styles.sectionLabel}>Lower Body</Text>
      <View style={styles.measurementsCard}>
        {lowerBody.map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.measurementRow,
              i === lowerBody.length - 1 && styles.measurementRowLast,
            ]}
          >
            <View style={styles.measureLeft}>
              <View style={styles.measureIcon}>
                <Ionicons name={item.icon} size={16} color="#888" />
              </View>
              <Text style={styles.measureLabel}>{item.label}</Text>
            </View>
            <Text style={styles.measureValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => navigation.navigate("Scan")}
      >
        <Ionicons name="refresh-outline" size={18} color="#f5f5dc" />
        <Text style={styles.updateButtonText}>Rescan Body</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate("Browse")}
      >
        <Ionicons name="search-outline" size={18} color="#0a0a0a" />
        <Text style={styles.browseButtonText}>Browse Clothes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },

  // Empty state
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f5dc",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f5dc",
    borderRadius: 14,
    padding: 18,
    marginTop: 32,
    width: "80%",
    justifyContent: "center",
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },

  // Profile header
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f5f5dc",
  },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  genderText: {
    fontSize: 13,
    color: "#f5f5dc",
    fontWeight: "600",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f5f5dc",
  },
  statUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },

  // Section
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Measurements
  measurementsCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 4,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  measurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  measurementRowLast: {
    borderBottomWidth: 0,
  },
  measureLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  measureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  measureLabel: {
    fontSize: 15,
    color: "#ccc",
  },
  measureValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f5f5dc",
  },

  // Buttons
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 12,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f5f5dc",
    borderRadius: 14,
    padding: 18,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
  },
});
