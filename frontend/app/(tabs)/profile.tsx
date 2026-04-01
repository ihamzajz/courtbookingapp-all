import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useCallback, useState } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { AUTH_API } from "../../src/config/api";
import AppScreen from "../../components/AppScreen";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { clearStoredUser, validateStoredSession } from "../../src/utils/auth";

const palette = {
  bg: "#F4F8FF",
  ink: "#112A5C",
  muted: "#5B6F9E",
  navy: "#2A52BE",
  royal: "#2B2D42",
  card: "#FFFFFF",
  line: "#D9E4FF",
  green: "#21A563",
  red: "#D64D4D",
};

export default function Profile() {
  const tabBarHeight = useBottomTabBarHeight();
  const [user, setUser] = useState(null);
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const loadUser = useCallback(async () => {
    const storedUser = await validateStoredSession();

    if (!storedUser?.token) {
      setUser(null);
      router.replace("/login");
      return;
    }

    setUser(storedUser);
  }, []);

  useLiveRefresh(loadUser, { intervalMs: 90000 });
  useRealtimeSubscription("users:updated", loadUser);

  const logout = async () => {
    await clearStoredUser();
    router.replace("/login");
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const canBook = (user?.can_book || "no").toLowerCase() === "yes";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const roleLabel = user?.role ? user.role.toUpperCase() : "USER";
  const feesPaid = (user?.fees_status || "paid").toLowerCase() === "paid";
  const feesRaw = (user?.fees_status || "paid").toLowerCase();
  const feesLabel = feesRaw.charAt(0).toUpperCase() + feesRaw.slice(1);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return Alert.alert("Error", "Please fill all password fields.");
    }
    if (newPassword.length < 6) {
      return Alert.alert("Error", "New password must be at least 6 characters.");
    }
    if (newPassword !== confirmNewPassword) {
      return Alert.alert("Error", "New password and confirm password do not match.");
    }
    if (!user?.token) {
      return Alert.alert("Error", "Session missing. Please login again.");
    }

    setSaving(true);
    try {
      const res = await fetch(`${AUTH_API}/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Failed", data.message || "Could not change password.");
        return;
      }

      await clearStoredUser();
      Alert.alert("Success", data.message || "Password changed successfully.");
      router.replace("/login");
    } catch {
      Alert.alert("Network Error", "Could not reach server. Make sure backend is running.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      return Alert.alert("Error", "Enter your current password to delete your account.");
    }

    if (!user?.token) {
      return Alert.alert("Error", "Session missing. Please login again.");
    }

    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);

            try {
              const res = await fetch(`${AUTH_API}/me`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({
                  currentPassword: deletePassword,
                }),
              });

              const data = await res.json().catch(() => ({}));

              if (!res.ok) {
                Alert.alert("Failed", data.message || "Could not delete account.");
                return;
              }

              await clearStoredUser();
              Alert.alert("Account Deleted", data.message || "Your account has been deleted.");
              router.replace("/login");
            } catch {
              Alert.alert("Network Error", "Could not reach server. Make sure backend is running.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen bottomOffset={tabBarHeight + 64} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#000080", "#00BFFF"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.profileIntro}>
          <View style={styles.profileIntroText}>
            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.subLine}>
              <Text style={styles.username}>@{user?.username || "-"}</Text>
              <Text style={styles.email}>  •  {user?.email || "-"}</Text>
            </Text>

            <View style={styles.badgesRow}>
              <Badge label={roleLabel} icon="verified-user" />
              <Badge
                label={canBook ? "BOOKING ON" : "BOOKING OFF"}
                icon={canBook ? "check-circle" : "block"}
                success={canBook}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <InfoRow icon="person-outline" label="Name" value={user?.name || "-"} />
        <InfoRow icon="alternate-email" label="Email" value={user?.email || "-"} />
        <InfoRow icon="badge" label="CM No" value={user?.cm_no || "-"} />
        <InfoRow icon="badge" label="Role" value={user?.role || "-"} />
        <InfoRow icon={feesPaid ? "payments" : "warning-amber"} label="Fees Status" value={feesLabel} />
        <InfoRow icon="fingerprint" label="User ID" value={String(user?.id || "-")} />
      </View>

      <View style={styles.passwordCard}>
        <TouchableOpacity
          style={styles.passwordHeader}
          onPress={() => setShowChangePass((prev) => !prev)}
          activeOpacity={0.88}
        >
          <View>
            <Text style={styles.sectionTitle}>Password</Text>
          </View>
          <MaterialIcons
            name={showChangePass ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={26}
            color={palette.royal}
          />
        </TouchableOpacity>

        {showChangePass ? (
          <View style={styles.passwordBody}>
            <InputField
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              secureTextEntry={!showCurrentPassword}
              visible={showCurrentPassword}
              onToggleVisibility={() => setShowCurrentPassword((value) => !value)}
            />
            <InputField
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry={!showNewPassword}
              visible={showNewPassword}
              onToggleVisibility={() => setShowNewPassword((value) => !value)}
            />
            <InputField
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              placeholder="Confirm new password"
              secureTextEntry={!showConfirmPassword}
              visible={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((value) => !value)}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="lock-reset" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.deleteCard}>
        <TouchableOpacity
          style={styles.passwordHeader}
          onPress={() => setShowDeleteAccount((prev) => !prev)}
          activeOpacity={0.88}
        >
          <View>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteSubtitle}>Permanently remove your account and stored data.</Text>
          </View>
          <MaterialIcons
            name={showDeleteAccount ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={26}
            color={palette.red}
          />
        </TouchableOpacity>

        {showDeleteAccount ? (
          <View style={styles.passwordBody}>
            <InputField
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Current password"
              secureTextEntry={!showDeletePassword}
              visible={showDeletePassword}
              onToggleVisibility={() => setShowDeletePassword((value) => !value)}
            />

            <TouchableOpacity
              style={[styles.deleteBtn, saving && { opacity: 0.7 }]}
              onPress={handleDeleteAccount}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Delete My Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {isAdmin ? (
        <Pressable style={styles.adminPanelAction} onPress={() => router.push("/(tabs)/admin-panel")}>
          <MaterialIcons name="admin-panel-settings" size={18} color="#FFFFFF" />
          <Text style={styles.adminPanelActionText}>Admin Panel</Text>
        </Pressable>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryAction} onPress={() => router.push("/(tabs)/history")}>
          <MaterialIcons name="receipt-long" size={18} color="#FFFFFF" />
          <Text style={styles.secondaryActionText}>Request History</Text>
        </Pressable>
        <Pressable style={styles.logoutAction} onPress={confirmLogout}>
          <MaterialIcons name="logout" size={18} color="#FFFFFF" />
          <Text style={styles.logoutActionText}>Logout</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function Badge({ label, icon, success = false }) {
  return (
    <View style={[styles.badge, success && styles.badgeSuccess]}>
      <MaterialIcons name={icon} size={14} color={success ? palette.green : palette.royal} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={styles.infoIcon}>
          <MaterialIcons name={icon} size={17} color={palette.royal} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InputField({ visible, onToggleVisibility, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <TextInput {...props} style={styles.input} placeholderTextColor="#97A3B7" />
      <Pressable style={styles.eyeButton} onPress={onToggleVisibility}>
        <MaterialIcons
          name={visible ? "visibility-off" : "visibility"}
          size={18}
          color="#7B8AA5"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 4,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  profileIntro: {
    marginTop: 4,
  },
  profileIntroText: {
    alignItems: "flex-start",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  username: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    marginTop: 1,
    fontFamily: "Poppins_500Medium",
  },
  subLine: {
    marginTop: 2,
  },
  email: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    textAlign: "left",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  badgeSuccess: {
    backgroundColor: "#EFFAF4",
  },
  badgeText: {
    color: palette.ink,
    fontSize: 9.5,
    fontFamily: "Poppins_600SemiBold",
  },
  infoCard: {
    marginTop: -10,
    borderRadius: 18,
    backgroundColor: palette.card,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#25385D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  passwordCard: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: palette.card,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
  },
  deleteCard: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#FFF5F5",
    padding: 13,
    borderWidth: 1,
    borderColor: "#F6CACA",
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  deleteTitle: {
    color: palette.red,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  deleteSubtitle: {
    color: "#8A3B3B",
    fontSize: 11,
    marginTop: 2,
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  infoValue: {
    color: palette.ink,
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    maxWidth: "48%",
    textAlign: "right",
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passwordBody: {
    marginTop: 4,
  },
  inputWrap: {
    position: "relative",
    marginBottom: 5,
  },
  input: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 12,
    color: palette.ink,
    marginBottom: 0,
    paddingRight: 44,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#2B2D42",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  deleteBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  adminPanelAction: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#6C757D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  adminPanelActionText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#0D6EFD",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
  },
  logoutAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#DC3545",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutActionText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
  },
});
