import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import AppScreen, { appPalette } from "./AppScreen";

export default function EmptyStateScreen({
  eyebrow,
  title,
  description,
  icon = "dashboard-customize",
  primaryLabel,
  primaryRoute,
  secondaryLabel,
  secondaryRoute,
}) {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <AppScreen bottomOffset={tabBarHeight + 36}>
      <LinearGradient
        colors={["#007FFF", "#2A52BE"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.badge}>
          <MaterialIcons name={icon} size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mobile-safe layout ready</Text>
        <Text style={styles.cardText}>
          This page now uses the same responsive screen shell as the rest of the app, which helps
          keep spacing stable after the app is minimized and opened again.
        </Text>

        {primaryLabel && primaryRoute ? (
          <Pressable style={styles.primaryButton} onPress={() => router.push(primaryRoute)}>
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </Pressable>
        ) : null}

        {secondaryLabel && secondaryRoute ? (
          <Pressable style={styles.secondaryButton} onPress={() => router.push(secondaryRoute)}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: 24,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    marginTop: 10,
  },
  description: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    marginTop: 18,
    backgroundColor: appPalette.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: appPalette.line,
  },
  cardTitle: {
    color: appPalette.ink,
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  cardText: {
    color: appPalette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 54,
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#2B2D42",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  secondaryButton: {
    minHeight: 54,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#2B2D42",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
});
