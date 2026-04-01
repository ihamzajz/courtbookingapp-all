import { Image, StyleSheet, StatusBar, Animated, View, Text } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();

    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2500);

    return () => {
      clearTimeout(timer);
      floatLoop.stop();
    };
  }, [fadeAnim, scaleAnim, floatAnim]);

  return (
    <LinearGradient
      colors={["#F9F7FF", "#EEF5FF", "#E8F4FF"]}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.92, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F9F7FF" />

      <LinearGradient
        colors={["rgba(170,153,255,0.18)", "rgba(103,191,255,0.08)", "rgba(255,255,255,0)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(116,194,255,0.14)", "rgba(182,167,255,0.16)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bottomGlow}
      />
      <View style={styles.waveOne} />
      <View style={styles.waveTwo} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, -6],
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>BookFlow</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -70,
    left: -30,
    right: -30,
    height: 260,
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 160,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -40,
    left: -20,
    right: -20,
    height: 260,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
  },
  waveOne: {
    position: "absolute",
    bottom: 72,
    left: -40,
    right: -40,
    height: 110,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderTopLeftRadius: 120,
    borderTopRightRadius: 180,
    transform: [{ rotate: "-4deg" }],
  },
  waveTwo: {
    position: "absolute",
    bottom: 22,
    left: -30,
    right: -50,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderTopLeftRadius: 170,
    borderTopRightRadius: 150,
    transform: [{ rotate: "3deg" }],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    zIndex: 2,
  },
  icon: {
    width: 180,
    height: 180,
  },
  title: {
    marginTop: 18,
    fontSize: 46,
    lineHeight: 52,
    color: "#173A7C",
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.3,
  },
});
