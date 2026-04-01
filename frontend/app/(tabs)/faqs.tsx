import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from "react-native";
import { useCallback, useRef, useState } from "react";
import { FontAwesome5 } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";

import AppScreen, { appPalette } from "../../components/AppScreen";
import TopHeaderBox from "../../components/TopHeaderBox";
import { FAQS_API } from "../../src/config/api";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";

export default function Faqs() {
  const tabBarHeight = useBottomTabBarHeight();
  const [activeIndex, setActiveIndex] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(FAQS_API);
      const data = await res.json().catch(() => []);
      setFaqs(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(loadFaqs, { intervalMs: 60000 });
  useRealtimeSubscription("faqs:updated", loadFaqs);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  useFocusEffect(
    useCallback(() => {
      titleAnim.stopAnimation();
      cardsAnim.stopAnimation();

      titleAnim.setValue(0);
      cardsAnim.setValue(0);

      const animation = Animated.stagger(100, [
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]);

      requestAnimationFrame(() => {
        animation.start();
      });

      return () => {
        animation.stop();
      };
    }, [cardsAnim, titleAnim])
  );

  const titleAnimatedStyle = {
    opacity: titleAnim,
    transform: [
      {
        translateX: titleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };

  const cardsAnimatedStyle = {
    opacity: cardsAnim,
    transform: [
      {
        translateY: cardsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };

  return (
    <AppScreen bottomOffset={tabBarHeight + 34} contentContainerStyle={styles.container}>
      <Animated.View style={titleAnimatedStyle}>
        <TopHeaderBox title="FAQs" onBack={() => router.replace("/(tabs)/home")} />
      </Animated.View>

      <Animated.View style={cardsAnimatedStyle}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={appPalette.royal} />
          </View>
        ) : faqs.length ? (
          faqs.map((item, index) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <FontAwesome5
                  name={activeIndex === index ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={appPalette.royal}
                />
              </TouchableOpacity>

              {activeIndex === index && <Text style={styles.answerText}>{item.answer}</Text>}
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.questionText}>No FAQs available right now.</Text>
          </View>
        )}
      </Animated.View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  loaderWrap: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: appPalette.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: appPalette.line,
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: appPalette.ink,
    flex: 1,
    paddingRight: 10,
  },
  answerText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
  },
});
