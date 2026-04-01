import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { AUTH_API, BASE_URL } from "../src/config/api";
import AppScreen from "../components/AppScreen";

export default function Register() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      username.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      !loading
    );
  }, [name, username, email, password, loading]);

  const validate = () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return false;
    }
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(username.trim())) {
      setError("Username must be at least 3 characters and use letters/numbers.");
      return false;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    setError("");
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${AUTH_API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Registration failed. Please try again.");
        return;
      }

      setSuccess(data?.message || "Registered successfully. Await admin approval.");

      setTimeout(() => {
        router.replace("/login");
      }, 900);
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
      bottomOffset={12}
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
              <Text style={styles.title}>Register</Text>
              <Text style={styles.subtitle}>Create your account to request bookings.</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={18} color="#B42318" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!!success && (
              <View style={styles.successBox}>
                <MaterialIcons name="check-circle-outline" size={18} color="#027A48" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Full Name</Text>
            <Field
              icon="badge"
              placeholder="Enter full name"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError("");
                if (success) setSuccess("");
              }}
            />

            <Text style={styles.fieldLabel}>Username</Text>
            <Field
              icon="alternate-email"
              placeholder="Choose username"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (error) setError("");
                if (success) setSuccess("");
              }}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <Field
              icon="email"
              placeholder="Enter email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
                if (success) setSuccess("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <Field
              icon="lock-outline"
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError("");
                if (success) setSuccess("");
              }}
              secureTextEntry={secure}
              rightIcon={secure ? "visibility" : "visibility-off"}
              onRightIconPress={() => setSecure((s) => !s)}
            />

            <Pressable
              onPress={canSubmit ? handleRegister : undefined}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
                pressed && canSubmit && styles.primaryBtnPressed,
              ]}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Creating...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Register</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.secondaryBtnText}>
                Already have an account? <Text style={styles.link}>Login</Text>
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footerHint}>After registering, wait for admin approval to activate your account.</Text>
          <Pressable
            onPress={() => Linking.openURL(`${BASE_URL}/privacy-policy`)}
            style={({ pressed }) => [styles.policyLinkWrap, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.policyLinkText}>View Privacy Policy</Text>
          </Pressable>
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginBottom: 10,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11.5,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 13,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  errorText: {
    color: "#7A271A",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "rgba(236, 253, 243, 0.95)",
    borderWidth: 1,
    borderColor: "#A6F4C5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  successText: {
    color: "#027A48",
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    flex: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7E0EA",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  fieldLabel: {
    color: "#334155",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    marginBottom: 5,
  },
  fieldIcon: {
    width: 30,
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    paddingVertical: 0,
  },
  rightIcon: {
    width: 30,
    alignItems: "center",
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: "#1D4ED8",
    borderRadius: 14,
    paddingVertical: 11,
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
    fontSize: 13.5,
  },
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  link: {
    color: "#1D4ED8",
    fontFamily: "Poppins_700Bold",
  },
  footerHint: {
    marginTop: 8,
    textAlign: "center",
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
  },
  policyLinkWrap: {
    marginTop: 6,
    alignItems: "center",
  },
  policyLinkText: {
    color: "#1D4ED8",
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
  },
});
