import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { storage, RecentTryOn } from "../services/storage";
import { BodyProfile } from "../types";

interface Props {
  navigation: any;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [recentTryOns, setRecentTryOns] = useState<RecentTryOn[]>([]);
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
      storage.loadRecentTryOns().then(setRecentTryOns);
    });
    return unsubscribe;
  }, [navigation, checkedFirstLaunch]);

  const scanAge = profile
    ? Math.floor((Date.now() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>fittd</Text>
        </View>

        {/* Hero for new users */}
        {!profile ? (
          <TouchableOpacity
            style={styles.heroBanner}
            onPress={() => navigation.navigate("Scan")}
            activeOpacity={0.85}
          >
            <View style={styles.heroContent}>
              <Ionicons name="body-outline" size={28} color="#0a0a0a" style={{ marginBottom: 12 }} />
              <Text style={styles.heroTitle}>Get Started</Text>
              <Text style={styles.heroSubtitle}>
                Set up your body profile to unlock virtual try-on
              </Text>
            </View>
            <View style={styles.heroArrow}>
              <Ionicons name="arrow-forward" size={20} color="#f5f5dc" />
            </View>
          </TouchableOpacity>
        ) : (
          /* Profile summary for returning users */
          <View style={styles.profileSummary}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Your Body</Text>
              <TouchableOpacity
                style={styles.scanStatus}
                onPress={() => navigation.navigate("Scan")}
              >
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.scanStatusText}>Scan complete</Text>
                <Ionicons name="refresh-outline" size={14} color="#666" />
              </TouchableOpacity>
            </View>
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

        {/* Recent Try-Ons */}
        {recentTryOns.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>Recent Try-Ons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
              {recentTryOns.map((item) => (
                <TouchableOpacity
                  key={item.product_id}
                  style={styles.recentCard}
                  onPress={() =>
                    navigation.getParent()?.navigate("TryOn", { productId: item.product_id }) ??
                    navigation.navigate("TryOn", { productId: item.product_id })
                  }
                  activeOpacity={0.8}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.recentImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.recentImage, styles.recentImagePlaceholder]}>
                      <Ionicons name="shirt-outline" size={24} color="#555" />
                    </View>
                  )}
                  <Text style={styles.recentBrand}>{item.brand}</Text>
                  <Text style={styles.recentName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.recentTime}>{timeSince(item.timestamp)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Browse")}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="search-outline" size={22} color="#f5f5dc" />
              </View>
              <Text style={styles.actionTitle}>Browse</Text>
              <Text style={styles.actionSub}>Find clothes to try on</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Scan")}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="body-outline" size={22} color="#f5f5dc" />
              </View>
              <Text style={styles.actionTitle}>{profile ? "Rescan" : "Scan"}</Text>
              <Text style={styles.actionSub}>
                {profile ? "Update your body model" : "Create your 3D model"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionLabel}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              { icon: "body-outline" as const, text: "Set up your body profile with two photos" },
              { icon: "link-outline" as const, text: "Paste a Nike product link" },
              { icon: "sparkles-outline" as const, text: "See how it fits with AI try-on" },
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Ionicons name={step.icon} size={16} color="#f5f5dc" />
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
  greeting: {
    fontSize: 16,
    color: "#888",
    marginBottom: 4,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#f5f5dc",
    letterSpacing: -2,
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

  // Profile summary
  profileSummary: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  scanStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanStatusText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
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

  // Recent try-ons
  recentSection: {
    marginBottom: 32,
    paddingLeft: 24,
  },
  recentScroll: {
    marginRight: -24,
  },
  recentCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  recentImage: {
    width: 140,
    height: 140,
    backgroundColor: "#222",
  },
  recentImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  recentBrand: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  recentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f5f5dc",
    paddingHorizontal: 10,
    marginTop: 2,
  },
  recentTime: {
    fontSize: 11,
    color: "#555",
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
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
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
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
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
});
