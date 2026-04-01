import { View, Text, StyleSheet, Pressable, Alert, Animated } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import AppScreen from "../../components/AppScreen";
import { validateStoredSession } from "../../src/utils/auth";

const palette = {
  bg: "#F4F8FF",
  ink: "#112A5C",
  muted: "#5B6F9E",
  navy: "#2A52BE",
  line: "#D9E4FF",
  card: "#FFFFFF",
};

const adminSections = [
  {
    heading: "Courts",
    items: [
      { title: "Manage Courts", link: "/(tabs)/manage-court", icon: "grid-view" },
      { title: "Dashboard", link: "/(tabs)/court-dashboard", icon: "insights" },
    ],
  },
  {
    heading: "Events",
    items: [
      { title: "Manage Venue", link: "/(tabs)/manage-event", icon: "event-note" },
      { title: "Dashboard", link: "/(tabs)/event-dashboard", icon: "analytics" },
    ],
  },
  {
    heading: "Slides",
    items: [{ title: "Manage Slides", link: "/(tabs)/manage-slides", icon: "view-carousel" }],
  },
  {
    heading: "Manage Users",
    items: [
      { title: "Manage Users", link: "/(tabs)/manage-users", icon: "supervisor-account" },
      { title: "Manage FAQs", link: "/(tabs)/manage-faqs", icon: "quiz" },
      { title: "Manage News", link: "/(tabs)/manage-news", icon: "newspaper" },
    ],
  },
];

export default function AdminPanel() {
  const tabBarHeight = useBottomTabBarHeight();
  const [allowed, setAllowed] = useState(false);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const quickAnim = useRef(new Animated.Value(0)).current;

  const runEntranceAnimation = useCallback(() => {
    heroAnim.stopAnimation();
    quickAnim.stopAnimation();

    heroAnim.setValue(0);
    quickAnim.setValue(0);

    const animation = Animated.stagger(100, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(quickAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
    ]);

    requestAnimationFrame(() => {
      animation.start();
    });
  }, [heroAnim, quickAnim]);

  useEffect(() => {
    const checkAccess = async () => {
      const parsedUser = await validateStoredSession();
      if (!parsedUser?.token) {
        router.replace("/login");
        return;
      }
      const isAdmin = parsedUser?.role === "admin" || parsedUser?.role === "superadmin";

      if (!isAdmin) {
        Alert.alert("Access Denied", "Only admin can access the admin panel.");
        router.replace("/(tabs)/home");
        return;
      }

      setAllowed(true);
      runEntranceAnimation();
    };

    checkAccess();
  }, [runEntranceAnimation]);

  if (!allowed) return null;

  return (
    <AppScreen
      bottomOffset={tabBarHeight + 34}
      contentContainerStyle={styles.content}
      maxWidth={9999}
      horizontalPadding={0}
    >
      <Animated.View
        style={[
          styles.heroWrap,
          {
            opacity: heroAnim,
            transform: [
              {
                translateY: heroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#000080", "#00BFFF"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.brandEyebrow}>NORTH NAZIMABAD GYMKHANA</Text>
          <Text style={styles.brandTitle}>Admin Panel</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[
          styles.quickSection,
          {
            opacity: quickAnim,
            transform: [
              {
                translateY: quickAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [26, 0],
                }),
              },
            ],
          },
        ]}
      >
        {adminSections.map((section) => (
          <View key={section.heading} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.heading}</Text>
            </View>

            <View style={styles.quickGrid}>
              {section.items.map((item) => (
                <Pressable
                  key={item.link}
                  style={styles.quickCard}
                  onPress={() => router.push(item.link)}
                >
                  <View style={styles.quickIconWrap}>
                    <MaterialIcons name={item.icon} size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.quickTextWrap}>
                    <Text style={styles.quickTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </Animated.View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
  heroWrap: {
    opacity: 1,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  brandEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1.6,
    paddingTop: 8,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontFamily: "Poppins_700Bold",
    marginTop: 8,
  },
  quickSection: {
    marginTop: 14,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  quickGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  sectionBlock: {
    marginTop: 10,
  },
  quickCard: {
    backgroundColor: palette.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    width: "48%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#A7B4D1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007FFF",
  },
  quickTextWrap: {
    flex: 1,
  },
  quickTitle: {
    color: palette.ink,
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
});
