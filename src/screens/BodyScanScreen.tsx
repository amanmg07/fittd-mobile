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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../services/api";
import { storage } from "../services/storage";
import { Gender } from "../types";

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
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const cameraRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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

  const processScan = async (sideB64: string) => {
    if (!frontImage) return;
    setLoading(true);

    try {
      const profile = await api.body.scan({
        user_id: "user_1", // TODO: proper auth
        gender,
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        front_image: frontImage,
        side_image: sideB64,
      });

      await storage.saveProfile(profile);
      await storage.saveFrontPhoto(frontImage);
      setStep("done");
      Alert.alert(
        "Scan Complete",
        `Measurements captured:\nChest: ${profile.measurements.chest}cm\nWaist: ${profile.measurements.waist}cm\nShoulders: ${profile.measurements.shoulder_width}cm`,
        [
          {
            text: "Try On Clothes",
            onPress: () => {
              navigation.navigate("Tabs", { screen: "Browse" });
            },
          },
          {
            text: "View Profile",
            onPress: () => {
              navigation.navigate("Tabs", { screen: "Profile" });
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

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
          placeholder="e.g. 178"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="numeric"
          placeholder="e.g. 75"
          placeholderTextColor="#555"
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!heightCm || !weightKg) && styles.buttonDisabled,
          ]}
          onPress={() => setStep("front")}
          disabled={!heightCm || !weightKg}
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
            <View style={styles.silhouetteGuide} />
            {countdown !== null ? (
              <Text style={styles.countdownText}>{countdown}</Text>
            ) : (
              <Text style={styles.instructionText}>
                {step === "front"
                  ? "Stand facing the camera\nArms slightly away from body"
                  : "Turn 90 degrees to your right\nKeep arms slightly out"}
              </Text>
            )}
          </View>
        </CameraView>

        <View style={styles.captureBar}>
          <Text style={styles.stepIndicator}>
            {step === "front" ? "1/2 — Front View" : "2/2 — Side View"}
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
        onPress={() => navigation.navigate("Tabs", { screen: "Browse" })}
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
  button: {
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 32,
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
  silhouetteGuide: {
    width: 200,
    height: 500,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 100,
    borderStyle: "dashed",
  },
  instructionText: {
    color: "#f5f5dc",
    fontSize: 16,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 24,
  },
  captureBar: {
    backgroundColor: "#0a0a0a",
    paddingVertical: 24,
    alignItems: "center",
  },
  stepIndicator: {
    color: "#888",
    fontSize: 14,
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
