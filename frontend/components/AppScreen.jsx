import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const appPalette = {
  background: "#F3FBF6",
  surface: "#FFFFFF",
  surfaceMuted: "#E7F7ED",
  ink: "#123126",
  muted: "#5D7A68",
  navy: "#2A52BE",
  royal: "#2B2D42",
  line: "#D9EDE0",
  green: "#20A765",
  red: "#D64D4D",
};

export default function AppScreen({
  children,
  backgroundColor = appPalette.background,
  barStyle = "dark-content",
  scrollable = true,
  keyboardAware = false,
  contentContainerStyle = null,
  style = null,
  edges = ["top", "left", "right"],
  bottomOffset = 24,
  horizontalPadding = 20,
  maxWidth = 560,
  scrollProps = undefined,
}) {
  const { height } = useWindowDimensions();

  const content = (
    <View
      style={[
        styles.page,
        {
          minHeight: Math.max(height, 0),
          paddingHorizontal: horizontalPadding,
          paddingBottom: bottomOffset,
          maxWidth,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scrollable ? (
    <ScrollView
      style={[styles.flex, { backgroundColor }]}
      contentContainerStyle={styles.flexGrow}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      overScrollMode="never"
      {...scrollProps}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.flexGrow, { backgroundColor }]}>{content}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }, style]} edges={edges}>
      <StatusBar barStyle={barStyle} backgroundColor={backgroundColor} />
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  flexGrow: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    alignSelf: "center",
    flexGrow: 1,
    paddingTop: 12,
  },
});
