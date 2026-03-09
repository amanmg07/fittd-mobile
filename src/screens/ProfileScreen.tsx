import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { storage, ScanHistoryItem } from "../services/storage";
import { BodyProfile } from "../types";
import { UnitSystem, formatLength, formatHeight, formatWeightValue, weightUnit, kgToLb } from "../utils/units";

interface Props {
  navigation: any;
}

interface MeasurementItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ScanDetailModal({
  scan,
  unit,
  onClose,
  onCompare,
}: {
  scan: ScanHistoryItem;
  unit: UnitSystem;
  onClose: () => void;
  onCompare: () => void;
}) {
  const m = scan.profile.measurements;
  const rows = [
    { label: "Chest", value: formatLength(m.chest, unit) },
    { label: "Waist", value: formatLength(m.waist, unit) },
    { label: "Hips", value: formatLength(m.hips, unit) },
    { label: "Shoulders", value: formatLength(m.shoulder_width, unit) },
    { label: "Neck", value: formatLength(m.neck, unit) },
    { label: "Arm Length", value: formatLength(m.arm_length, unit) },
    { label: "Torso", value: formatLength(m.torso_length, unit) },
  ];

  return (
    <Modal visible transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Scan — {formatDate(scan.timestamp)}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#f5f5dc" />
            </TouchableOpacity>
          </View>

          {scan.thumbnail_b64 && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${scan.thumbnail_b64}` }}
              style={modalStyles.detailThumb}
              resizeMode="contain"
            />
          )}

          <View style={modalStyles.statsRow}>
            <View style={modalStyles.statPill}>
              <Text style={modalStyles.statPillLabel}>Height</Text>
              <Text style={modalStyles.statPillValue}>{formatHeight(m.height, unit)}</Text>
            </View>
            <View style={modalStyles.statPill}>
              <Text style={modalStyles.statPillLabel}>Weight</Text>
              <Text style={modalStyles.statPillValue}>
                {formatWeightValue(m.weight, unit)} {weightUnit(unit)}
              </Text>
            </View>
          </View>

          {rows.map((r) => (
            <View key={r.label} style={modalStyles.row}>
              <Text style={modalStyles.rowLabel}>{r.label}</Text>
              <Text style={modalStyles.rowValue}>{r.value}</Text>
            </View>
          ))}

          <TouchableOpacity style={modalStyles.compareBtn} onPress={onCompare}>
            <Ionicons name="git-compare-outline" size={18} color="#0a0a0a" />
            <Text style={modalStyles.compareBtnText}>Compare with another scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ComparePickerBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <View style={modalStyles.pickerBanner}>
      <Ionicons name="git-compare-outline" size={18} color="#f5f5dc" />
      <Text style={modalStyles.pickerText}>Tap a scan to compare</Text>
      <TouchableOpacity onPress={onCancel}>
        <Text style={modalStyles.pickerCancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function DiffValue({ label, valA, valB, unit: u }: { label: string; valA: number; valB: number; unit: UnitSystem }) {
  const diff = valB - valA;
  const diffStr = formatLength(Math.abs(diff), u);
  const color = diff > 0.3 ? "#FF5252" : diff < -0.3 ? "#4CAF50" : "#888";
  const arrow = diff > 0.3 ? "arrow-up" : diff < -0.3 ? "arrow-down" : "remove";

  return (
    <View style={modalStyles.compareRow}>
      <Text style={modalStyles.compareLabel}>{label}</Text>
      <Text style={modalStyles.compareVal}>{formatLength(valA, u)}</Text>
      <View style={modalStyles.compareDiff}>
        <Ionicons name={arrow as any} size={12} color={color} />
        <Text style={[modalStyles.compareDiffText, { color }]}>{diffStr}</Text>
      </View>
      <Text style={modalStyles.compareVal}>{formatLength(valB, u)}</Text>
    </View>
  );
}

function CompareModal({
  scanA,
  scanB,
  unit,
  onClose,
}: {
  scanA: ScanHistoryItem;
  scanB: ScanHistoryItem;
  unit: UnitSystem;
  onClose: () => void;
}) {
  const mA = scanA.profile.measurements;
  const mB = scanB.profile.measurements;

  const fields: { label: string; keyA: number; keyB: number }[] = [
    { label: "Chest", keyA: mA.chest, keyB: mB.chest },
    { label: "Waist", keyA: mA.waist, keyB: mB.waist },
    { label: "Hips", keyA: mA.hips, keyB: mB.hips },
    { label: "Shoulders", keyA: mA.shoulder_width, keyB: mB.shoulder_width },
    { label: "Neck", keyA: mA.neck, keyB: mB.neck },
    { label: "Arm Length", keyA: mA.arm_length, keyB: mB.arm_length },
    { label: "Torso", keyA: mA.torso_length, keyB: mB.torso_length },
  ];

  return (
    <Modal visible transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Compare Scans</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#f5f5dc" />
            </TouchableOpacity>
          </View>

          {/* Thumbnails side by side */}
          <View style={modalStyles.compareThumbs}>
            <View style={modalStyles.compareThumbCol}>
              {scanA.thumbnail_b64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${scanA.thumbnail_b64}` }}
                  style={modalStyles.compareThumbImg}
                  resizeMode="contain"
                />
              ) : (
                <View style={[modalStyles.compareThumbImg, modalStyles.compareThumbEmpty]}>
                  <Ionicons name="person-outline" size={20} color="#555" />
                </View>
              )}
              <Text style={modalStyles.compareDate}>{formatDate(scanA.timestamp)}</Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color="#555" style={{ marginTop: 20 }} />
            <View style={modalStyles.compareThumbCol}>
              {scanB.thumbnail_b64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${scanB.thumbnail_b64}` }}
                  style={modalStyles.compareThumbImg}
                  resizeMode="contain"
                />
              ) : (
                <View style={[modalStyles.compareThumbImg, modalStyles.compareThumbEmpty]}>
                  <Ionicons name="person-outline" size={20} color="#555" />
                </View>
              )}
              <Text style={modalStyles.compareDate}>{formatDate(scanB.timestamp)}</Text>
            </View>
          </View>

          {/* Header row */}
          <View style={modalStyles.compareHeaderRow}>
            <Text style={[modalStyles.compareLabel, { color: "#555" }]}>Measurement</Text>
            <Text style={[modalStyles.compareVal, { color: "#555" }]}>Before</Text>
            <Text style={[modalStyles.compareDiffText, { color: "#555", width: 60, textAlign: "center" }]}>Diff</Text>
            <Text style={[modalStyles.compareVal, { color: "#555" }]}>After</Text>
          </View>

          {fields.map((f) => (
            <DiffValue key={f.label} label={f.label} valA={f.keyA} valB={f.keyB} unit={unit} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [recentCount, setRecentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<UnitSystem>("metric");
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [compareScan, setCompareScan] = useState<ScanHistoryItem | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfile();
      storage.loadRecentTryOns().then((r) => setRecentCount(r.length));
      storage.loadUnitSystem().then(setUnit);
      storage.loadScanHistory().then(setScanHistory);
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

  const toggleUnit = (system: UnitSystem) => {
    setUnit(system);
    storage.saveUnitSystem(system);
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
    { icon: "resize-outline", label: "Chest", value: formatLength(m.chest, unit) },
    { icon: "resize-outline", label: "Shoulders", value: formatLength(m.shoulder_width, unit) },
    { icon: "resize-outline", label: "Neck", value: formatLength(m.neck, unit) },
    { icon: "resize-outline", label: "Arm Length", value: formatLength(m.arm_length, unit) },
  ];

  const lowerBody: MeasurementItem[] = [
    { icon: "resize-outline", label: "Waist", value: formatLength(m.waist, unit) },
    { icon: "resize-outline", label: "Hips", value: formatLength(m.hips, unit) },
    { icon: "resize-outline", label: "Torso", value: formatLength(m.torso_length, unit) },
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

      {/* Unit toggle */}
      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitButton, unit === "metric" && styles.unitButtonActive]}
          onPress={() => toggleUnit("metric")}
        >
          <Text style={[styles.unitText, unit === "metric" && styles.unitTextActive]}>
            Metric (cm, kg)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitButton, unit === "imperial" && styles.unitButtonActive]}
          onPress={() => toggleUnit("imperial")}
        >
          <Text style={[styles.unitText, unit === "imperial" && styles.unitTextActive]}>
            Imperial (in, lb)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats overview */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatHeight(m.height, unit)}</Text>
          <Text style={styles.statUnit}>{unit === "metric" ? "cm" : ""}</Text>
          <Text style={styles.statLabel}>Height</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatWeightValue(m.weight, unit)}</Text>
          <Text style={styles.statUnit}>{weightUnit(unit)}</Text>
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

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Scan History</Text>
          <View style={styles.historyCard}>
            {scanHistory.map((scan, i) => {
              const date = new Date(scan.timestamp);
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const sm = scan.profile.measurements;
              return (
                <TouchableOpacity
                  key={scan.id}
                  style={[
                    styles.historyRow,
                    i === scanHistory.length - 1 && styles.historyRowLast,
                  ]}
                  onPress={() => {
                    if (compareMode) {
                      setCompareScan(scan);
                    } else {
                      setSelectedScan(scan);
                    }
                  }}
                >
                  {scan.thumbnail_b64 ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${scan.thumbnail_b64}` }}
                      style={styles.historyThumb}
                    />
                  ) : (
                    <View style={[styles.historyThumb, styles.historyThumbEmpty]}>
                      <Ionicons name="person-outline" size={18} color="#555" />
                    </View>
                  )}
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{dateStr}</Text>
                    <Text style={styles.historyMeasures}>
                      Chest {formatLength(sm.chest, unit)} · Waist {formatLength(sm.waist, unit)} · Hips {formatLength(sm.hips, unit)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#555" />
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

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

      {/* Scan Detail / Compare Modal */}
      {selectedScan && !compareMode && !compareScan && (
        <ScanDetailModal
          scan={selectedScan}
          unit={unit}
          onClose={() => setSelectedScan(null)}
          onCompare={() => setCompareMode(true)}
        />
      )}

      {compareMode && !compareScan && (
        <ComparePickerBanner
          onCancel={() => {
            setCompareMode(false);
            setSelectedScan(null);
          }}
        />
      )}

      {compareScan && selectedScan && (
        <CompareModal
          scanA={selectedScan}
          scanB={compareScan}
          unit={unit}
          onClose={() => {
            setCompareScan(null);
            setCompareMode(false);
            setSelectedScan(null);
          }}
        />
      )}
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
    marginBottom: 20,
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

  // Unit toggle
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  unitButtonActive: {
    backgroundColor: "#f5f5dc",
  },
  unitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
  },
  unitTextActive: {
    color: "#0a0a0a",
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

  // Scan history
  historyCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyThumb: {
    width: 44,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  historyThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 2,
  },
  historyMeasures: {
    fontSize: 12,
    color: "#888",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f5f5dc",
  },
  detailThumb: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    alignSelf: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statPillLabel: {
    fontSize: 11,
    color: "#888",
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f5dc",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  rowLabel: {
    fontSize: 14,
    color: "#aaa",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f5f5dc",
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  compareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  pickerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#f5f5dc",
  },
  pickerCancel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5252",
  },
  // Compare modal
  compareThumbs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  compareThumbCol: {
    alignItems: "center",
  },
  compareThumbImg: {
    width: 80,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
  },
  compareThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  compareDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },
  compareHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 4,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  compareLabel: {
    flex: 1,
    fontSize: 13,
    color: "#aaa",
  },
  compareVal: {
    width: 60,
    fontSize: 13,
    fontWeight: "700",
    color: "#f5f5dc",
    textAlign: "right",
  },
  compareDiff: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  compareDiffText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
