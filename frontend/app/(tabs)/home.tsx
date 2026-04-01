import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  useWindowDimensions,
  Animated,
} from "react-native";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import AppScreen from "../../components/AppScreen";
import { SLIDES_API, SLIDE_IMAGES_BASE } from "../../src/config/api";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { buildUploadAssetUrl } from "../../src/utils/media";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];
type QuickAction = {
  title: string;
  link: Href;
  icon: MaterialIconName;
};

const palette = {
  bg: "#F4F8FF",
  ink: "#112A5C",
  muted: "#5B6F9E",
  navy: "#2A52BE",
  line: "#D9E4FF",
  card: "#FFFFFF",
};

const buildSlideImageUrl = (picture) => buildUploadAssetUrl(SLIDE_IMAGES_BASE, picture, "slides");

export default function Home() {
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const sliderRef = useRef(null);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sliderAnim = useRef(new Animated.Value(0)).current;
  const quickAnim = useRef(new Animated.Value(0)).current;
  const heroTextAnim = useRef(new Animated.Value(0)).current;

  const [slides, setSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const slideCardWidth = useMemo(() => Math.max(width - 40, 280), [width]);

  const loadSlides = useCallback(async () => {
    try {
      const res = await fetch(SLIDES_API);
      const data = await res.json();
      if (!res.ok) return;
      setSlides(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch {
      setSlides([]);
    }
  }, []);

  useLiveRefresh(loadSlides, { intervalMs: 60000 });
  useRealtimeSubscription("slides:updated", loadSlides);

  const runEntranceAnimation = useCallback(() => {
    heroAnim.stopAnimation();
    sliderAnim.stopAnimation();
    quickAnim.stopAnimation();
    heroTextAnim.stopAnimation();

    heroAnim.setValue(1);
    sliderAnim.setValue(0);
    quickAnim.setValue(0);
    heroTextAnim.setValue(0);

    const animation = Animated.stagger(120, [
      Animated.timing(heroTextAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(sliderAnim, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
      Animated.timing(quickAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    requestAnimationFrame(() => {
      animation.start();
    });

    return animation;
  }, [heroAnim, heroTextAnim, quickAnim, sliderAnim]);

  useFocusEffect(
    useCallback(() => {
      const animation = runEntranceAnimation();

      return () => {
        animation.stop();
      };
    }, [runEntranceAnimation])
  );

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const interval = setInterval(() => {
      setActiveSlide((current) => {
        const next = (current + 1) % slides.length;
        sliderRef.current?.scrollToIndex?.({ index: next, animated: true });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (activeSlide >= slides.length && slides.length > 0) {
      setActiveSlide(0);
    }
  }, [activeSlide, slides.length]);

  const handleSliderMomentumEnd = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / (slideCardWidth + 12));
      setActiveSlide(nextIndex);
    },
    [slideCardWidth]
  );

  const quickActions: QuickAction[] = [
    { title: "Court Booking", link: "/(tabs)/court", icon: "sports-tennis" },
    { title: "Event Booking", link: "/(tabs)/event", icon: "emoji-events" },
    { title: "History", link: "/(tabs)/history", icon: "history" },
    { title: "Profile", link: "/(tabs)/profile", icon: "person" },
  ];

  const heroAnimatedStyle = {
    opacity: heroAnim,
  };

  const heroTextAnimatedStyle = {
    opacity: heroTextAnim,
    transform: [
      {
        translateX: heroTextAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [36, 0],
        }),
      },
    ],
  };

  const sliderAnimatedStyle = {
    opacity: sliderAnim,
    transform: [
      {
        translateY: sliderAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };

  const highlightsHeadingAnimatedStyle = {
    opacity: sliderAnim,
    transform: [
      {
        translateX: sliderAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };

  const quickAnimatedStyle = {
    opacity: quickAnim,
    transform: [
      {
        translateY: quickAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [26, 0],
        }),
      },
    ],
  };

  const quickHeadingAnimatedStyle = {
    opacity: quickAnim,
    transform: [
      {
        translateX: quickAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };

  return (
    <AppScreen
      bottomOffset={tabBarHeight + 34}
      contentContainerStyle={styles.content}
      maxWidth={9999}
      horizontalPadding={0}
    >
      <Animated.View style={heroAnimatedStyle}>
        <LinearGradient
          colors={["#000080", "#00BFFF"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          <Animated.View style={heroTextAnimatedStyle}>
            <Text style={styles.brandEyebrow}>NORTH NAZIMABAD GYMKHANA</Text>
            <Text style={styles.brandTitle}>Court & Event Booking</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={sliderAnimatedStyle}>
        <View style={styles.sliderSection}>
        <Animated.View style={highlightsHeadingAnimatedStyle}>
          <Text style={styles.sectionTitle}>Highlights</Text>
        </Animated.View>
        {slides.length ? (
          <>
            <FlatList
              ref={sliderRef}
              data={slides}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item: slide }) => (
                <View style={[styles.slideCard, { width: slideCardWidth }]}>
                  <Image
                    source={{ uri: buildSlideImageUrl(slide.picture) }}
                    style={styles.slideImage}
                  />
                  <LinearGradient
                    colors={["rgba(17,42,92,0.18)", "rgba(17,42,92,0.78)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.slideOverlay}
                  >
                    <Text style={styles.slideTitle} numberOfLines={1}>
                      {slide.title}
                    </Text>
                    {!!slide.subtitle && (
                      <Text style={styles.slideSubtitle} numberOfLines={2}>
                        {slide.subtitle}
                      </Text>
                    )}
                  </LinearGradient>
                </View>
              )}
              contentContainerStyle={styles.sliderTrack}
              onMomentumScrollEnd={handleSliderMomentumEnd}
              getItemLayout={(_, index) => ({
                length: slideCardWidth + 12,
                offset: (slideCardWidth + 12) * index,
                index,
              })}
            />

            <View style={styles.dotsRow}>
              {slides.map((slide, index) => (
                <View
                  key={slide.id}
                  style={[styles.dot, index === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptySlider}>
            <MaterialIcons name="image" size={24} color={palette.muted} />
            <Text style={styles.emptySliderText}>No slides added yet.</Text>
          </View>
        )}
        </View>
      </Animated.View>

      <Animated.View style={quickAnimatedStyle}>
        <View style={styles.sectionHeader}>
          <Animated.View style={quickHeadingAnimatedStyle}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
          </Animated.View>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item, index) =>
            <Pressable
              key={item.title}
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
          )}
        </View>
      </Animated.View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
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
  sliderSection: {
    marginTop: 22,
    paddingHorizontal: 20,
  },
  sliderTrack: {
    paddingRight: 20,
  },
  slideCard: {
    height: 184,
    marginRight: 12,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  slideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  slideSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.84)",
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  dotsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#C0D0F5",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#2A52BE",
  },
  emptySlider: {
    marginTop: 10,
    height: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptySliderText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 0,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 0,
  },
  quickGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
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
