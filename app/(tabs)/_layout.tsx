import { Tabs } from "expo-router";
import { Map, Bookmark, Settings, Route } from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Nearby Sights",
          tabBarIcon: ({ color }) => <Map size={22} color={color} />,
          headerTitleStyle: { color: Colors.light.text },
        }}
      />
      <Tabs.Screen
        name="tour"
        options={{
          title: "Tour Planner",
          tabBarIcon: ({ color }) => <Route size={22} color={color} />,
          headerTitleStyle: { color: Colors.light.text },
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color }) => <Bookmark size={22} color={color} />,
          headerTitleStyle: { color: Colors.light.text },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
          headerTitleStyle: { color: Colors.light.text },
        }}
      />
    </Tabs>
  );
}