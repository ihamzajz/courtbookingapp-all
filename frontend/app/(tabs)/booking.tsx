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
      <LinearGradient
        colors={["#007FFF", "#2A52BE"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <MaterialIcons name="sports-tennis" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Booking Center</Text>
        <Text style={styles.heroSubtitle}>Choose what you want to book.</Text>
      </LinearGradient>

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
    paddingTop: 10,
  },
  hero: {
    borderRadius: 28,
    padding: 22,
  },
  heroBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 300,
  },
  grid: {
    marginTop: 22,
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
