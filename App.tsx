import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BodyScan"
          getComponent={() => require("./src/screens/BodyScanScreen").default}
          options={{ title: "Body Scan" }}
        />
        <Stack.Screen
          name="Browse"
          getComponent={() => require("./src/screens/BrowseScreen").default}
          options={{ title: "Browse" }}
        />
        <Stack.Screen
          name="TryOn"
          getComponent={() => require("./src/screens/TryOnScreen").default}
          options={{ title: "Virtual Try-On" }}
        />
        <Stack.Screen
          name="Profile"
          getComponent={() => require("./src/screens/ProfileScreen").default}
          options={{ title: "My Profile" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
