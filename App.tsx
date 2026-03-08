import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./src/screens/HomeScreen";
import BrowseScreen from "./src/screens/BrowseScreen";
import BodyScanScreen from "./src/screens/BodyScanScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Home: { focused: "home", unfocused: "home-outline" },
  Browse: { focused: "search", unfocused: "search-outline" },
  Scan: { focused: "body", unfocused: "body-outline" },
  Profile: { focused: "person", unfocused: "person-outline" },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#f5f5dc",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#1a1a1a",
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#f5f5dc",
        tabBarInactiveTintColor: "#555",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Browse"
        component={BrowseScreen}
        options={{ title: "Browse" }}
      />
      <Tab.Screen
        name="Scan"
        component={BodyScanScreen}
        options={{ title: "Body Scan" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#f5f5dc",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TryOn"
          getComponent={() => require("./src/screens/TryOnScreen").default}
          options={{ title: "Virtual Try-On" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
