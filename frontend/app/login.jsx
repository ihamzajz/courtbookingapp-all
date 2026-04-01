import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { AUTH_API } from "../src/config/api";
import AppScreen from "../components/AppScreen";
import { setStoredUser } from "../src/utils/auth";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return identifier.trim().length > 0 && password.length > 0 && !loading;
  }, [identifier, password, loading]);

  const validate = () => {
    if (!identifier.trim() || !password) {
      setError("Please fill in username/email and password.");
      return false;
    }
    setError("");
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Login failed. Please try again.");
        return;
      }

      await setStoredUser(data);
      router.replace("/(tabs)/home");
    } catch {
      setError("Network error. Could not reach server. Check IP/WiFi and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen
      backgroundColor="#F5F8FC"
      barStyle="dark-content"
      keyboardAware
      bottomOffset={24}
      horizontalPadding={18}
    >
      <View style={styles.container}>
        <View style={styles.page}>
          <LinearGradient
            colors={["#0B0B0F", "#5B5F6A"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>Sign in to continue to your account.</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={18} color="#B42318" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Username or Email</Text>
            <Field
              icon="person-outline"
              placeholder="Enter username or email"
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                if (error) setError("");
              }}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <Field
              icon="lock-outline"
              placeholder="Enter password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError("");
              }}
              secureTextEntry={secure}
              rightIcon={secure ? "visibility" : "visibility-off"}
              onRightIconPress={() => setSecure((s) => !s)}
            />

            <Pressable
              onPress={canSubmit ? handleLogin : undefined}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
                pressed && canSubmit && styles.primaryBtnPressed,
              ]}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Login</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/register")}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.secondaryBtnText}>
                Do not have an account? <Text style={styles.link}>Register</Text>
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footerHint}>If your account is inactive, contact admin for approval.</Text>
        </View>
      </View>
    </AppScreen>
  );
}

function Field({
  icon,
  rightIcon = null,
  onRightIconPress = null,
  style = null,
  ...props
}) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.fieldIcon}>
        <MaterialIcons name={icon} size={18} color="#6B7280" />
      </View>

      <TextInput placeholderTextColor="#9CA3AF" style={styles.input} {...props} />

      {rightIcon ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={10}
          style={({ pressed }) => [styles.rightIcon, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name={rightIcon} size={18} color="#6B7280" />
        </Pressable>
      ) : (
        <View style={styles.rightIcon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    flex: 1,
  },
  page: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 14,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  errorBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "rgba(255, 232, 230, 0.95)",
    borderWidth: 1,
    borderColor: "#FDA29B",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  errorText: {
    color: "#7A271A",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    flex: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7E0EA",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 12,
  },
  fieldLabel: {
    color: "#334155",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    marginBottom: 6,
  },
  fieldIcon: {
    width: 30,
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    paddingVertical: 0,
  },
  rightIcon: {
    width: 30,
    alignItems: "center",
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: "#1D4ED8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnPressed: {
    transform: [{ scale: 0.99 }],
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
  },
  link: {
    color: "#1D4ED8",
    fontFamily: "Poppins_700Bold",
  },
  footerHint: {
    marginTop: 14,
    textAlign: "center",
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
});
