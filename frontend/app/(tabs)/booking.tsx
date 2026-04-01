import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router, type Href } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";

import AppScreen from "../../components/AppScreen";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];
type GradientPair = readonly [string, string];
type BookingCard = {
  title: string;
  icon: MaterialIconName;
  link: Href;
  colors: GradientPair;
};

export default function Booking() {
  const cards: BookingCard[] = [
    {
      title: "Court Booking",
      icon: "sports-tennis",
      link: "/(tabs)/court",
      colors: ["#007FFF", "#2A52BE"],
    },
    {
      title: "Event Booking",
      icon: "event",
      link: "/(tabs)/event",
      colors: ["#007FFF", "#2A52BE"],
    },
  ];

  return (
    <AppScreen bottomOffset={34} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {cards.map((card) => {
          return (
            <Pressable key={card.title} style={styles.gradientCardWrap} onPress={() => router.push(card.link)}>
              <LinearGradient colors={card.colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.gradientCard}>
                <View style={styles.cardInner}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons
                      name={card.icon}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {card.title}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={18}
                    color="rgba(255,255,255,0.88)"
                  />
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
  },
  grid: {
    gap: 14,
  },
  gradientCardWrap: {
    borderRadius: 24,
    overflow: "hidden",
  },
  gradientCard: {
    borderRadius: 24,
    minHeight: 104,
    padding: 18,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontFamily: "Poppins_700Bold",
  },
});
