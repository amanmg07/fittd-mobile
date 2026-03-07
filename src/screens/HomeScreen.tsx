import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>fittd</Text>
        <Text style={styles.subtitle}>Virtual try-on with precision fit</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("BodyScan")}
        >
          <Text style={styles.primaryButtonText}>Scan Your Body</Text>
          <Text style={styles.buttonSubtext}>
            Take front + side photos to create your 3D model
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Browse")}
        >
          <Text style={styles.secondaryButtonText}>Browse Clothes</Text>
          <Text style={styles.secondarySubtext}>
            Paste a Nike product link to try it on
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={styles.secondaryButtonText}>My Profile</Text>
          <Text style={styles.secondarySubtext}>
            View your measurements and saved looks
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 8,
  },
  actions: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  buttonSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  secondaryButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondarySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 6,
  },
});
