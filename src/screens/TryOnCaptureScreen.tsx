import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

interface Props {
  route: { params: { productId: string } };
  navigation: any;
}

export default function TryOnCaptureScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captured, setCaptured] = useState(false);
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
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current || captured) return;
    setCaptured(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
      });

      // Navigate to TryOn screen with the captured photo
      navigation.replace("TryOn", {
        productId,
        tryOnPhoto: photo.base64,
      });
    } catch (error: any) {
      Alert.alert("Capture Failed", error.message);
      setCaptured(false);
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>Camera access is needed for virtual try-on</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          {/* Pose guide */}
          <View style={styles.guideContainer}>
            <View style={styles.headGuide} />
            <View style={styles.shoulderLine} />
            <View style={styles.torsoGuide} />
          </View>

          {countdown !== null ? (
            <Text style={styles.countdownText}>{countdown}</Text>
          ) : (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionTitle}>Position yourself</Text>
              <Text style={styles.instructionText}>
                Place phone on a surface or have someone hold it
              </Text>
              <Text style={styles.instructionText}>
                Stand 5-6 feet away, arms at your sides
              </Text>
              <Text style={styles.instructionText}>
                Align your body with the guide
              </Text>
              <Text style={styles.instructionText}>
                Wear fitted clothing for best results
              </Text>
            </View>
          )}
        </View>
      </CameraView>

      <View style={styles.captureBar}>
        <Text style={styles.stepLabel}>Try-On Photo</Text>
        {countdown !== null ? (
          <View style={[styles.captureButton, styles.captureButtonCountdown]}>
            <Text style={styles.captureCountdownText}>{countdown}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.captureButton}
            onPress={startCountdown}
            disabled={captured}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        )}
        <Text style={styles.timerHint}>
          {countdown !== null
            ? "Get into position..."
            : captured
            ? "Processing..."
            : "Tap to start 5s timer"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  text: {
    color: "#f5f5dc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permButton: {
    backgroundColor: "#f5f5dc",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  permButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideContainer: {
    alignItems: "center",
  },
  headGuide: {
    width: 60,
    height: 70,
    borderWidth: 2,
    borderColor: "rgba(245, 245, 220, 0.4)",
    borderRadius: 30,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  shoulderLine: {
    width: 180,
    height: 2,
    backgroundColor: "rgba(245, 245, 220, 0.3)",
    marginBottom: 4,
  },
  torsoGuide: {
    width: 140,
    height: 280,
    borderWidth: 2,
    borderColor: "rgba(245, 245, 220, 0.3)",
    borderRadius: 20,
    borderStyle: "dashed",
  },
  countdownText: {
    fontSize: 120,
    fontWeight: "800",
    color: "rgba(245, 245, 220, 0.8)",
    marginTop: 24,
    position: "absolute",
  },
  instructionsContainer: {
    position: "absolute",
    bottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f5dc",
    marginBottom: 12,
    textAlign: "center",
  },
  instructionText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 6,
    lineHeight: 20,
    textAlign: "center",
  },
  captureBar: {
    backgroundColor: "#0a0a0a",
    paddingVertical: 24,
    alignItems: "center",
  },
  stepLabel: {
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
  timerHint: {
    color: "#666",
    fontSize: 13,
    marginTop: 12,
  },
});
