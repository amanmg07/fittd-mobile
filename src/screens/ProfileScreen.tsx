import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { api } from "../services/api";
import { storage } from "../services/storage";
import { BodyProfile } from "../types";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try local storage first
      const saved = await storage.loadProfile();
      if (saved) {
        setProfile(saved);
        setLoading(false);
        return;
      }
      // Fall back to API
      const p = await api.body.getProfile("user_1");
      setProfile(p);
      await storage.saveProfile(p);
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No body scan yet.</Text>
        <Text style={styles.emptySubtext}>
          Go to the home screen and scan your body first.
        </Text>
      </View>
    );
  }

  const m = profile.measurements;
  const rows: [string, string][] = [
    ["Height", `${m.height} cm`],
    ["Weight", `${m.weight} kg`],
    ["Chest", `${m.chest} cm`],
    ["Waist", `${m.waist} cm`],
    ["Hips", `${m.hips} cm`],
    ["Shoulders", `${m.shoulder_width} cm`],
    ["Arm Length", `${m.arm_length} cm`],
    ["Neck", `${m.neck} cm`],
    ["Torso Length", `${m.torso_length} cm`],
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your Body Profile</Text>
      <Text style={styles.subheading}>
        {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
      </Text>

      <View style={styles.measurementsCard}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.measurementRow}>
            <Text style={styles.measureLabel}>{label}</Text>
            <Text style={styles.measureValue}>{value}</Text>
          </View>
        ))}
      </View>
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
    paddingTop: 60,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: "#888",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  measurementsCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
  },
  measurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  measureLabel: {
    fontSize: 16,
    color: "#aaa",
  },
  measureValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
