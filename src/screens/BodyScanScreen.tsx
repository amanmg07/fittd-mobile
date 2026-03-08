import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../services/api";
import { storage } from "../services/storage";
import { Gender } from "../types";
import { UnitSystem, formatLength } from "../utils/units";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ScanStep = "info" | "front" | "side" | "processing" | "done";

interface Props {
  navigation: any;
}

export default function BodyScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScanStep>("info");
  const [gender, setGender] = useState<Gender>("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [unit, setUnit] = useState<UnitSystem>("metric");
  const cameraRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    storage.loadUnitSystem().then(setUnit);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [step]);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.8,
    });

    if (step === "front") {
      setFrontImage(photo.base64);
      setStep("side");
    } else if (step === "side") {
      setSideImage(photo.base64);
      setStep("processing");
      await processScan(photo.base64);
    }
  };

  const getHeightCm = (): number => {
    if (unit === "metric") return parseFloat(heightCm);
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    return (ft * 12 + inches) * 2.54;
  };

  const getWeightKg = (): number => {
    if (unit === "metric") return parseFloat(weightKg);
    return parseFloat(weightLb) * 0.453592;
  };

  const hasValidInput = (): boolean => {
    if (unit === "metric") return !!(heightCm && weightKg);
    return !!(heightFt && weightLb);
  };

  const processScan = async (sideB64: string) => {
    if (!frontImage) return;
    setLoading(true);

    try {
      const profile = await api.body.scan({
        user_id: "user_1", // TODO: proper auth
        gender,
        height_cm: getHeightCm(),
        weight_kg: getWeightKg(),
        front_image: frontImage,
        side_image: sideB64,
      });

      await storage.saveProfile(profile);
      await storage.saveFrontPhoto(frontImage);
      await storage.saveSidePhoto(sideB64);
      setStep("done");
      Alert.alert(
        "Scan Complete",
        `Measurements captured:\nChest: ${formatLength(profile.measurements.chest, unit)}\nWaist: ${formatLength(profile.measurements.waist, unit)}\nShoulders: ${formatLength(profile.measurements.shoulder_width, unit)}`,
        [
          {
            text: "Try On Clothes",
            onPress: () => {
              navigation.navigate("Browse");
            },
          },
          {
            text: "View Profile",
            onPress: () => {
              navigation.navigate("Profile");
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Scan Failed", error.message);
      setStep("info");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access is needed to scan your body</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "info") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formContainer}>
        <Text style={styles.heading}>Your Details</Text>
        <Text style={styles.subheading}>
          We need a few details to build your 3D body model
        </Text>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {(["male", "female"] as Gender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderButton, gender === g && styles.genderActive]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === g && styles.genderTextActive,
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          {unit === "metric" ? "Height (cm)" : "Height"}
        </Text>
        {unit === "metric" ? (
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="e.g. 178"
            placeholderTextColor="#555"
          />
        ) : (
          <View style={styles.imperialRow}>
            <View style={styles.imperialField}>
              <TextInput
                style={styles.input}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#555"
              />
              <Text style={styles.imperialUnit}>ft</Text>
            </View>
            <View style={styles.imperialField}>
              <TextInput
                style={styles.input}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#555"
              />
              <Text style={styles.imperialUnit}>in</Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>
          {unit === "metric" ? "Weight (kg)" : "Weight (lb)"}
        </Text>
        <TextInput
          style={styles.input}
          value={unit === "metric" ? weightKg : weightLb}
          onChangeText={unit === "metric" ? setWeightKg : setWeightLb}
          keyboardType="numeric"
          placeholder={unit === "metric" ? "e.g. 75" : "e.g. 165"}
          placeholderTextColor="#555"
        />

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>For best results</Text>
          <Text style={styles.tipText}>
            Wear tight-fitting clothes (e.g. compression shirt, leggings) so the scan can accurately capture your body measurements.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !hasValidInput() && styles.buttonDisabled,
          ]}
          onPress={() => setStep("front")}
          disabled={!hasValidInput()}
        >
          <Text style={styles.buttonText}>Start Scan</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === "front" || step === "side") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          <View style={styles.overlay}>
            {/* Guide frame */}
            <View style={styles.guideFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Body silhouette hint */}
              <View style={styles.silhouetteGuide}>
                <Ionicons
                  name={step === "front" ? "body-outline" : "body-outline"}
                  size={180}
                  color="rgba(245, 245, 220, 0.15)"
                />
              </View>
            </View>

            {/* Instructions */}
            {countdown !== null ? (
              <Text style={styles.countdownText}>{countdown}</Text>
            ) : (
              <View style={styles.instructionBox}>
                <Ionicons
                  name={step === "front" ? "person-outline" : "sync-outline"}
                  size={20}
                  color="#f5f5dc"
                />
                <Text style={styles.instructionText}>
                  {step === "front"
                    ? "Stand facing the camera\nArms slightly away from body"
                    : "Turn 90° to your right\nKeep arms slightly out"}
                </Text>
              </View>
            )}

            {/* Distance hint */}
            {countdown === null && (
              <View style={styles.distanceHint}>
                <Ionicons name="resize-outline" size={14} color="#888" />
                <Text style={styles.distanceText}>Stand 6–8 feet from camera</Text>
              </View>
            )}
          </View>
        </CameraView>

        <View style={styles.captureBar}>
          {/* Step indicator with progress */}
          <View style={styles.stepProgress}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepConnector, step === "side" && styles.stepConnectorActive]} />
            <View style={[styles.stepDot, step === "side" && styles.stepDotActive]} />
          </View>
          <Text style={styles.stepIndicator}>
            {step === "front" ? "Front View" : "Side View"}
          </Text>

          {countdown !== null ? (
            <View style={[styles.captureButton, styles.captureButtonCountdown]}>
              <Text style={styles.captureCountdownText}>{countdown}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={startCountdown}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}
          <Text style={styles.timerHint}>
            {countdown !== null ? "Get into position..." : "Tap to start 5s timer"}
          </Text>
        </View>
      </View>
    );
  }

  if (step === "processing" || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f5f5dc" />
        <Text style={styles.text}>Building your 3D body model...</Text>
      </View>
    );
  }

  // step === "done"
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.doneIcon}>✓</Text>
      <Text style={styles.doneTitle}>Scan Complete</Text>
      <Text style={styles.doneSubtitle}>Your body model has been saved</Text>
      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate("Browse")}
      >
        <Text style={styles.buttonText}>Try On Clothes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.doneButton, styles.doneButtonSecondary]}
        onPress={() => {
          setStep("info");
          setFrontImage(null);
          setSideImage(null);
        }}
      >
        <Text style={styles.doneButtonSecondaryText}>Scan Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
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
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: "#f5f5dc",
    borderWidth: 1,
    borderColor: "#333",
  },
  imperialRow: {
    flexDirection: "row",
    gap: 12,
  },
  imperialField: {
    flex: 1,
    position: "relative",
  },
  imperialUnit: {
    position: "absolute",
    right: 16,
    top: 16,
    fontSize: 16,
    color: "#555",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  genderActive: {
    backgroundColor: "#f5f5dc",
    borderColor: "#f5f5dc",
  },
  genderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
  },
  genderTextActive: {
    color: "#0a0a0a",
  },
  tipBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: "#888",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  text: {
    color: "#f5f5dc",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 1.3,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#f5f5dc",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  silhouetteGuide: {
    opacity: 0.8,
  },
  instructionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 20,
  },
  instructionText: {
    color: "#f5f5dc",
    fontSize: 14,
    lineHeight: 20,
  },
  distanceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  distanceText: {
    color: "#888",
    fontSize: 12,
  },
  captureBar: {
    backgroundColor: "#0a0a0a",
    paddingVertical: 24,
    alignItems: "center",
  },
  stepProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginBottom: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "#333",
  },
  stepDotActive: {
    backgroundColor: "#f5f5dc",
    borderColor: "#f5f5dc",
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: "#2a2a2a",
  },
  stepConnectorActive: {
    backgroundColor: "#f5f5dc",
  },
  stepIndicator: {
    color: "#f5f5dc",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#f5f5dc",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f5dc",
  },
  captureButtonCountdown: {
    borderColor: "#4CAF50",
  },
  captureCountdownText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4CAF50",
  },
  countdownText: {
    fontSize: 120,
    fontWeight: "800",
    color: "rgba(255,255,255,0.8)",
    marginTop: 24,
  },
  timerHint: {
    color: "#666",
    fontSize: 13,
    marginTop: 12,
  },
  doneIcon: {
    fontSize: 48,
    color: "#4CAF50",
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f5f5dc",
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 40,
  },
  doneButton: {
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    width: "80%",
    marginBottom: 12,
  },
  doneButtonSecondary: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  doneButtonSecondaryText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f5dc",
  },
});
