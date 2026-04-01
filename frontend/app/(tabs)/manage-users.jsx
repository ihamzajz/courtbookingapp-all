import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import TopHeaderBox from "../../components/TopHeaderBox";
import { COMPLIANCE_API, USERS_API } from "../../src/config/api";
import { getStoredToken, getStoredUser } from "../../src/utils/auth";

const CONTROL_HEIGHT = 48;
const palette = {
  bg: "#F4F8FF",
  surface: "#FFFFFF",
  cardTint: "#F8FAFF",
  ink: "#102A56",
  muted: "#66758F",
  line: "#DCE5F5",
  navy: "#2B2D42",
  blueStart: "#007FFF",
  blueEnd: "#2A52BE",
  iconGrey: "#7B8497",
};

export default function ManageUsers() {
  const tabBarHeight = useBottomTabBarHeight();

  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeletionRequests, setLoadingDeletionRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cmNo, setCmNo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("inactive");
  const [canBook, setCanBook] = useState("no");
  const [feesStatus, setFeesStatus] = useState("paid");

  useEffect(() => {
    getStoredToken().then(setToken);
    getStoredUser().then(setCurrentUser);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin" && currentUser.role !== "superadmin") {
      Alert.alert("Access Denied", "Only admin can access manage users.");
      router.replace("/(tabs)/home");
    }
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;

    return users.filter((user) =>
      [user.name, user.username, user.email, user.cm_no, user.role]
        .some((field) => String(field || "").toLowerCase().includes(value))
    );
  }, [users, search]);

  const fetchUsers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(USERS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load users");
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletionRequests = async () => {
    if (!token) return;

    try {
      setLoadingDeletionRequests(true);
      const res = await fetch(`${COMPLIANCE_API}/account-deletion-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load deletion requests");
        return;
      }

      setDeletionRequests(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load deletion requests");
    } finally {
      setLoadingDeletionRequests(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDeletionRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const processDeletionRequest = (requestItem, action) => {
    if (!token) return;

    const actionLabel =
      action === "delete_user"
        ? "grant this deletion request and delete the linked account"
        : "mark this request as processed";

    Alert.alert("Confirm", `Do you want to ${actionLabel}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: action === "delete_user" ? "destructive" : "default",
        onPress: async () => {
          try {
            setProcessingRequestId(requestItem.id);
            const res = await fetch(`${COMPLIANCE_API}/account-deletion-requests/${requestItem.id}/process`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to process deletion request");
              return;
            }

            Alert.alert("Success", data?.message || "Deletion request processed");
            fetchDeletionRequests();
            fetchUsers();
          } catch {
            Alert.alert("Error", "Failed to process deletion request");
          } finally {
            setProcessingRequestId(null);
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setName("");
    setUsername("");
    setEmail("");
    setCmNo("");
    setPassword("");
    setRole("user");
    setStatus("inactive");
    setCanBook("no");
    setFeesStatus("paid");
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setName(user?.name || "");
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    setCmNo(user?.cm_no || "");
    setPassword("");
    setRole(user?.role || "user");
    setStatus(user?.status || "inactive");
    setCanBook(user?.can_book || "no");
    setFeesStatus(user?.fees_status || "paid");
    setModalVisible(true);
  };

  const buildPayload = () => ({
    name: name.trim(),
    username: username.trim(),
    email: email.trim(),
    cm_no: cmNo.trim(),
    password: password.trim(),
    role,
    status,
    can_book: canBook,
    fees_status: feesStatus,
  });

  const canManagePrivilegedUsers = currentUser?.role === "superadmin";

  const validateForm = () => {
    if (!name.trim() || !username.trim() || !email.trim()) {
      Alert.alert("Validation", "Name, username, and email are required");
      return false;
    }

    if (!editingUser && !password.trim()) {
      Alert.alert("Validation", "Password is required for new user");
      return false;
    }

    return true;
  };

  const createUser = async () => {
    if (!token || !validateForm()) return;

    try {
      setSaving(true);
      const res = await fetch(USERS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to create user");
        return;
      }

      setUsers((prev) => [data, ...prev]);
      closeModal();
      fetchUsers();
    } catch {
      Alert.alert("Error", "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async () => {
    if (!token || !editingUser?.id || !validateForm()) return;

    try {
      setSaving(true);
      const res = await fetch(`${USERS_API}/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to update user");
        return;
      }

      setUsers((prev) => prev.map((user) => (user.id === editingUser.id ? data : user)));
      closeModal();
      fetchUsers();
    } catch {
      Alert.alert("Error", "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = (id) => {
    if (!token) return;

    if (Number(id) === Number(currentUser?.id)) {
      Alert.alert("Blocked", "You cannot delete your own account.");
      return;
    }

    Alert.alert("Confirm", "Delete this user?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${USERS_API}/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to delete user");
              return;
            }

            fetchUsers();
          } catch {
            Alert.alert("Error", "Failed to delete user");
          }
        },
      },
    ]);
  };

  const renderUser = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeadingRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: false }}
              style={({ pressed }) => [
                styles.iconBtn,
                styles.editBtn,
                pressed && Platform.OS === "ios" && styles.pressed,
              ]}
              onPress={() => {
                if (!canManagePrivilegedUsers && (item.role === "admin" || item.role === "superadmin")) {
                  Alert.alert("Restricted", "Only superadmin can manage admin or superadmin accounts.");
                  return;
                }
                openEditModal(item);
              }}
            >
              <MaterialIcons name="edit" size={16} color={palette.navy} />
            </Pressable>

            <Pressable
              android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: false }}
              style={({ pressed }) => [
                styles.iconBtn,
                styles.deleteBtn,
                pressed && Platform.OS === "ios" && styles.pressed,
              ]}
              onPress={() => {
                if (!canManagePrivilegedUsers && (item.role === "admin" || item.role === "superadmin")) {
                  Alert.alert("Restricted", "Only superadmin can manage admin or superadmin accounts.");
                  return;
                }
                deleteUser(item.id);
              }}
            >
              <MaterialIcons name="delete-outline" size={16} color={palette.navy} />
            </Pressable>
          </View>
        </View>

        <View style={styles.pillsRow}>
          <MetaPill
            icon="admin-panel-settings"
            text={String(item.role || "-")}
            tone="blue"
          />
          <MetaPill
            icon="badge"
            text={`CM: ${item.cm_no || "-"}`}
            tone="blue"
          />
          <MetaPill
            icon="toggle-on"
            text={String(item.status || "-")}
            tone="mint"
          />
          <MetaPill
            icon="event-available"
            text={`Book: ${item.can_book || "-"}`}
            tone="amber"
          />
          <MetaPill
            icon="payments"
            text={`Fees: ${item.fees_status || "-"}`}
            tone="rose"
          />
        </View>
      </View>
    </View>
  );

  const renderDeletionRequest = (item) => {
    const isProcessing = processingRequestId === item.id;
    const canDeleteLinkedUser = Boolean(item.user_id);

    return (
      <View key={item.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestEmail}>{item.email}</Text>
            <Text style={styles.requestMeta}>
              {item.user_name ? `${item.user_name} (@${item.user_username || "-"})` : "No linked user found"}
            </Text>
          </View>
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>Pending</Text>
          </View>
        </View>

        {item.note ? (
          <Text style={styles.requestNote}>Note: {item.note}</Text>
        ) : (
          <Text style={styles.requestNoteMuted}>No note provided.</Text>
        )}

        <Text style={styles.requestDate}>
          Requested: {new Date(item.created_at).toLocaleString()}
        </Text>

        <View style={styles.requestActions}>
          {canDeleteLinkedUser ? (
            <Pressable
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.requestActionBtn,
                styles.requestDeleteBtn,
                pressed && Platform.OS === "ios" && styles.pressed,
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={isProcessing ? undefined : () => processDeletionRequest(item, "delete_user")}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.requestActionText}>Grant Request</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.requestActionBtn,
                styles.requestResolveBtn,
                pressed && Platform.OS === "ios" && styles.pressed,
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={isProcessing ? undefined : () => processDeletionRequest(item, "mark_processed")}
            >
              <Text style={styles.requestActionText}>Mark Processed</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const TOP_GUTTER = 12;
  const BOTTOM_GUTTER = 12;
  const refreshManageUsersScreen = () => {
    fetchUsers();
    fetchDeletionRequests();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.container,
          { paddingTop: TOP_GUTTER, paddingBottom: tabBarHeight + BOTTOM_GUTTER },
        ]}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <TopHeaderBox title="Manage Users" onBack={() => router.replace("/(tabs)/admin-panel")} />

            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color="#97A3B7" style={{ marginRight: 10 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search users"
                  placeholderTextColor="#97A3B7"
                  style={styles.searchInput}
                />
              </View>

              <Pressable
                android_ripple={{ color: "rgba(255,255,255,0.22)" }}
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && Platform.OS === "ios" && styles.pressed,
                ]}
                onPress={openCreateModal}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderUser}
            refreshing={loading}
            onRefresh={refreshManageUsersScreen}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 6 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            ListFooterComponent={
              <View style={styles.requestSection}>
                <View style={styles.requestSectionHeader}>
                  <Text style={styles.requestSectionTitle}>Pending Deletion Requests</Text>
                  {loadingDeletionRequests ? <ActivityIndicator size="small" color={palette.navy} /> : null}
                </View>
                {deletionRequests.length > 0 ? (
                  deletionRequests.map(renderDeletionRequest)
                ) : (
                  <View style={styles.requestEmpty}>
                    <Text style={styles.requestEmptyTitle}>No pending deletion requests.</Text>
                    <Text style={styles.requestEmptyText}>
                      Web account deletion requests will appear here for admin review.
                    </Text>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <MaterialIcons name="supervisor-account" size={30} color={palette.iconGrey} />
                  <Text style={styles.emptyText}>No users found.</Text>
                  <Text style={styles.emptySub}>
                    Tap <Text style={{ fontFamily: "Poppins_700Bold" }}>Add</Text> to create your first user.
                  </Text>
                </View>
              ) : null
            }
          />
        </View>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Pressable style={styles.backdrop} onPress={closeModal} />

            <View style={styles.modalCard}>
              <View style={styles.modalTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingUser ? "Edit User" : "Add User"}
                  </Text>
                  <Text style={styles.modalHint}>
                    {editingUser
                      ? "Update user access and account settings."
                      : "Create a new user account."}
                  </Text>
                </View>

                <Pressable
                  hitSlop={12}
                  android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: true }}
                  style={({ pressed }) => [
                    styles.closeX,
                    pressed && Platform.OS === "ios" && styles.pressed,
                  ]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.closeXText}>X</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                persistentScrollbar
              >
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  placeholder="Full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Username</Text>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>CM No</Text>
                <TextInput
                  placeholder="CM No"
                  placeholderTextColor="#9CA3AF"
                  value={cmNo}
                  onChangeText={setCmNo}
                  style={styles.input}
                  autoCapitalize="characters"
                />

                <Text style={styles.fieldLabel}>
                  {editingUser ? "Password (leave blank to keep same)" : "Password"}
                </Text>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  secureTextEntry
                />

                <View style={styles.grid2}>
                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Role</Text>
                    <View style={styles.pickerWrap}>
                      <Picker selectedValue={role} onValueChange={setRole} style={styles.picker}>
                        <Picker.Item label="User" value="user" />
                        {canManagePrivilegedUsers ? (
                          <Picker.Item label="Admin" value="admin" />
                        ) : null}
                        {canManagePrivilegedUsers ? (
                          <Picker.Item label="Superadmin" value="superadmin" />
                        ) : null}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.pickerWrap}>
                      <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                        <Picker.Item label="Active" value="active" />
                        <Picker.Item label="Inactive" value="inactive" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.grid2}>
                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Can Book</Text>
                    <View style={styles.pickerWrap}>
                      <Picker selectedValue={canBook} onValueChange={setCanBook} style={styles.picker}>
                        <Picker.Item label="Yes" value="yes" />
                        <Picker.Item label="No" value="no" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Fees Status</Text>
                    <View style={styles.pickerWrap}>
                      <Picker selectedValue={feesStatus} onValueChange={setFeesStatus} style={styles.picker}>
                        <Picker.Item label="Paid" value="paid" />
                        <Picker.Item label="Defaulter" value="defaulter" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  style={({ pressed }) => [
                    styles.footerBtn,
                    styles.cancelBtn,
                    pressed && Platform.OS === "ios" && styles.pressed,
                    saving && { opacity: 0.7 },
                  ]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.footerBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  style={({ pressed }) => [
                    styles.footerBtn,
                    styles.saveBtn,
                    pressed && Platform.OS === "ios" && styles.pressed,
                    saving && { opacity: 0.85 },
                  ]}
                  onPress={saving ? undefined : editingUser ? updateUser : createUser}
                >
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.footerBtnText}>
                        {editingUser ? "Updating..." : "Saving..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.footerBtnText}>
                      {editingUser ? "Update" : "Save"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function MetaPill({ icon, text, tone = "blue" }) {
  return (
    <View style={[styles.metaPill, styles[`metaPill${capitalize(tone)}`]]}>
      <MaterialIcons name={icon} size={14} color={styles[`metaPillIcon${capitalize(tone)}`].color} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { flex: 1, paddingHorizontal: 16 },
  page: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    flex: 1,
  },
  header: {
    gap: 14,
    marginBottom: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  backStub: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: 8,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  headingBanner: {
    flex: 1,
    height: CONTROL_HEIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#1B4DB1",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headingIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headingCopy: {
    flex: 1,
  },
  title: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#FFFFFF" },
  controlsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 12,
  },
  searchBar: {
    width: "70%",
    height: CONTROL_HEIGHT,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#9AA9C6",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: "Poppins_500Medium",
  },
  addBtn: {
    width: "24%",
    height: 43,
    backgroundColor: "#198754",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#2B2D42",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },
  addBtnText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.line,
    ...Platform.select({
      ios: {
        shadowColor: "#7A8CAA",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
    }),
  },
  cardContent: {
    flex: 1,
  },
  cardHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  userName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: palette.ink },
  userMeta: {
    marginTop: 1,
    color: palette.muted,
    fontSize: 10.5,
    fontFamily: "Poppins_500Medium",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  metaPillBlue: {
    backgroundColor: "#EDF4FF",
    borderColor: "#D7E6FF",
  },
  metaPillMint: {
    backgroundColor: "#ECFBF4",
    borderColor: "#CFEFDE",
  },
  metaPillAmber: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F3DEB2",
  },
  metaPillRose: {
    backgroundColor: "#FFF0F3",
    borderColor: "#F3D3DB",
  },
  metaPillIconBlue: {
    color: "#3B6FB6",
  },
  metaPillIconMint: {
    color: "#2F8A68",
  },
  metaPillIconAmber: {
    color: "#B07A19",
  },
  metaPillIconRose: {
    color: "#B95D78",
  },
  metaText: {
    color: palette.ink,
    fontSize: 9.5,
    fontFamily: "Poppins_500Medium",
  },
  actions: { flexDirection: "row", gap: 6, marginLeft: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  editBtn: { backgroundColor: "#E9EEF9", borderColor: "#D3DDF2" },
  deleteBtn: { backgroundColor: "#ECEFF7", borderColor: "#D9DEEB" },
  empty: {
    marginTop: 18,
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: palette.ink, textAlign: "center", fontFamily: "Poppins_700Bold", marginTop: 10 },
  emptySub: { marginTop: 6, color: palette.muted, textAlign: "center", fontFamily: "Poppins_500Medium" },
  requestSection: {
    marginTop: 18,
    gap: 10,
  },
  requestSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestSectionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  requestEmpty: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
  },
  requestEmptyTitle: {
    color: palette.ink,
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
  },
  requestEmptyText: {
    marginTop: 4,
    color: palette.muted,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  requestCard: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 8,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  requestEmail: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
  requestMeta: {
    marginTop: 2,
    color: palette.muted,
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
  },
  requestBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#FFF7E8",
    borderWidth: 1,
    borderColor: "#F3DEB2",
  },
  requestBadgeText: {
    color: "#B07A19",
    fontFamily: "Poppins_700Bold",
    fontSize: 10.5,
  },
  requestNote: {
    color: palette.ink,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  requestNoteMuted: {
    color: palette.muted,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  requestDate: {
    color: palette.muted,
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  requestActionBtn: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  requestResolveBtn: {
    backgroundColor: "#6C757D",
  },
  requestDeleteBtn: {
    backgroundColor: "#B42318",
  },
  requestActionText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    maxHeight: "78%",
    borderWidth: 1,
    borderColor: "#EEF0F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 4 },
    }),
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 2,
    paddingRight: 4,
  },
  modalTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  modalTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#111827" },
  modalHint: { marginTop: 3, color: "#6B7280", fontFamily: "Poppins_500Medium", fontSize: 12 },
  closeX: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  closeXText: { fontFamily: "Poppins_700Bold", color: "#374151", fontSize: 12 },
  fieldLabel: {
    color: "#374151",
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    marginTop: 4,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    color: "#111827",
    fontFamily: "Poppins_500Medium",
    backgroundColor: "#FAFAFB",
    fontSize: 13,
  },
  grid2: {
    flexDirection: "row",
    gap: 8,
  },
  half: {
    flex: 1,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFB",
    marginBottom: 6,
  },
  picker: {
    color: "#111827",
    height: Platform.OS === "ios" ? 119 : 49,
  },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  footerBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  cancelBtn: { backgroundColor: "#6C757D" },
  saveBtn: { backgroundColor: "#198754" },
  footerBtnText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
