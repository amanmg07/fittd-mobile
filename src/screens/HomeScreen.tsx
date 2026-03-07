import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { storage } from "../services/storage";
import { BodyProfile } from "../types";

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<BodyProfile | null>(null);

  const [checkedFirstLaunch, setCheckedFirstLaunch] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      storage.loadProfile().then((p) => {
        setProfile(p);
        if (!checkedFirstLaunch) {
          setCheckedFirstLaunch(true);
          if (!p) {
            navigation.navigate("Scan");
          }
        }
      });
    });
    return unsubscribe;
  }, [navigation, checkedFirstLaunch]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>fittd</Text>
          <Text style={styles.subtitle}>Virtual try-on with precision fit</Text>
        </View>

        {!profile ? (
          <TouchableOpacity
            style={styles.heroBanner}
            onPress={() => navigation.navigate("Scan")}
            activeOpacity={0.85}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroEmoji}>◎</Text>
              <Text style={styles.heroTitle}>Get Started</Text>
              <Text style={styles.heroSubtitle}>
                Set up your body profile to unlock virtual try-on
              </Text>
            </View>
            <View style={styles.heroArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.profileSummary}>
            <Text style={styles.sectionLabel}>Your Body</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{profile.measurements.chest}</Text>
                <Text style={styles.statUnit}>cm</Text>
                <Text style={styles.statLabel}>Chest</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{profile.measurements.waist}</Text>
                <Text style={styles.statUnit}>cm</Text>
                <Text style={styles.statLabel}>Waist</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{profile.measurements.shoulder_width}</Text>
                <Text style={styles.statUnit}>cm</Text>
                <Text style={styles.statLabel}>Shoulders</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Browse")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>⊞</Text>
              <Text style={styles.actionTitle}>Browse</Text>
              <Text style={styles.actionSub}>Find clothes to try on</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Scan")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>◎</Text>
              <Text style={styles.actionTitle}>{profile ? "Rescan" : "Scan"}</Text>
              <Text style={styles.actionSub}>
                {profile ? "Update your body model" : "Create your 3D model"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.howItWorks}>
          <Text style={styles.sectionLabel}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              { num: "1", text: "Set up your body profile with two photos" },
              { num: "2", text: "Paste a Nike product link" },
              { num: "3", text: "See how it fits with AI try-on" },
            ].map((step) => (
              <View key={step.num} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#f5f5dc",
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 8,
  },

  // Hero banner for new users
  heroBanner: {
    marginHorizontal: 24,
    backgroundColor: "#f5f5dc",
    borderRadius: 20,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  heroContent: {
    flex: 1,
  },
  heroEmoji: {
    fontSize: 28,
    color: "#0a0a0a",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0a0a0a",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  heroArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 20,
    color: "#f5f5dc",
    fontWeight: "700",
  },

  // Profile summary for returning users
  profileSummary: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
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
    fontSize: 20,
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
    marginTop: 6,
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Quick actions
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  actionIcon: {
    fontSize: 24,
    color: "#f5f5dc",
    marginBottom: 14,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  actionSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
  },

  // How it works
  howItWorks: {
    paddingHorizontal: 24,
  },
  stepsContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    gap: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
});
