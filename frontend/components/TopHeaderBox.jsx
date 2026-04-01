import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function TopHeaderBox({ title, onBack, style = null, titleStyle = null }) {
  return (
    <LinearGradient
      colors={["#000080", "#00BFFF"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.hero, style]}
    >
      <View style={styles.heroTop}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.heroTitleRow}>
          <Text style={[styles.heroTitle, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleRow: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },
});
