import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import TopHeaderBox from "../../components/TopHeaderBox";
import { COURTS_API, COURT_IMAGES_BASE } from "../../src/config/api";
import { getStoredToken } from "../../src/utils/auth";
import { buildUploadAssetUrl } from "../../src/utils/media";

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

export default function ManageCourt() {
  const tabBarHeight = useBottomTabBarHeight();

  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);

  const [name, setName] = useState("");
  const [picture, setPicture] = useState(null);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState(null);

  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());

  const filteredCourts = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return courts;
    return courts.filter((court) => court.name?.toLowerCase().includes(value));
  }, [courts, search]);

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const res = await fetch(COURTS_API);
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load courts");
        return;
      }

      setCourts(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load courts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStoredToken().then(setToken);
    fetchCourts();
  }, []);

  const requireToken = async () => {
    const liveToken = await getStoredToken();

    if (!liveToken) {
      Alert.alert("Session expired", "Please log in again.");
      router.replace("/login");
      return null;
    }

    if (liveToken !== token) {
      setToken(liveToken);
    }

    return liveToken;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to gallery");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setPicture(asset);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("name", name.trim());

    if (picture?.uri) {
      const mimeType = picture.mimeType || "image/jpeg";
      formData.append("picture", {
        uri: picture.uri,
        name: `court-${Date.now()}.jpg`,
        type: mimeType,
      });
    }

    return formData;
  };

  const createCourt = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Court name is required");
      return;
    }

    const liveToken = await requireToken();
    if (!liveToken) return;

    setSaving(true);
    try {
      const res = await fetch(COURTS_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${liveToken}`,
        },
        body: buildFormData(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to create court");
        return;
      }

      closeModal();
      setImageRefreshKey(Date.now());
      fetchCourts();
    } catch {
      Alert.alert("Error", "Failed to create court");
    } finally {
      setSaving(false);
    }
  };

  const updateCourt = async () => {
    if (!editingCourt?.id) return;

    if (!name.trim()) {
      Alert.alert("Validation", "Court name is required");
      return;
    }

    const liveToken = await requireToken();
    if (!liveToken) return;

    setSaving(true);
    try {
      const res = await fetch(`${COURTS_API}/${editingCourt.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${liveToken}`,
        },
        body: buildFormData(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to update court");
        return;
      }

      closeModal();
      setImageRefreshKey(Date.now());
      fetchCourts();
    } catch {
      Alert.alert("Error", "Failed to update court");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourt = (id) => {
    Alert.alert("Confirm", "Delete this court?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const liveToken = await requireToken();
          if (!liveToken) return;

          try {
            const res = await fetch(`${COURTS_API}/${id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${liveToken}`,
              },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to delete court");
              return;
            }

            setImageRefreshKey(Date.now());
            fetchCourts();
          } catch {
            Alert.alert("Error", "Failed to delete court");
          }
        },
      },
    ]);
  };

  const openCreateModal = () => {
    setEditingCourt(null);
    setName("");
    setPicture(null);
    setModalVisible(true);
  };

  const openEditModal = (court) => {
    setEditingCourt(court);
    setName(court?.name || "");
    setPicture(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCourt(null);
    setName("");
    setPicture(null);
  };

  const courtImageUrl = (filename) => {
    if (!filename) return null;
    return buildUploadAssetUrl(COURT_IMAGES_BASE, filename, "courts", imageRefreshKey);
  };

  const existingEditingImage = editingCourt?.picture
    ? courtImageUrl(editingCourt.picture)
    : null;

  const renderCourt = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMediaWrap}>
        {item.picture ? (
          <Image
            source={{ uri: courtImageUrl(item.picture) }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={styles.noThumb}>
            <MaterialIcons name="sports-tennis" size={22} color={palette.iconGrey} />
            <Text style={styles.noThumbText}>No Image</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeadingRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.courtName} numberOfLines={1}>
              {item.name}
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
              onPress={() => openEditModal(item)}
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
              onPress={() => deleteCourt(item.id)}
            >
              <MaterialIcons name="delete-outline" size={16} color={palette.navy} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  const TOP_GUTTER = 12;
  const BOTTOM_GUTTER = 12;

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
            <TopHeaderBox title="Manage Courts" onBack={() => router.replace("/(tabs)/admin-panel")} />

            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color="#97A3B7" style={{ marginRight: 10 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search courts"
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
            data={filteredCourts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCourt}
            refreshing={loading}
            onRefresh={fetchCourts}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <MaterialIcons name="grid-view" size={30} color={palette.iconGrey} />
                  <Text style={styles.emptyText}>No courts found.</Text>
                  <Text style={styles.emptySub}>
                    Tap <Text style={{ fontFamily: "Poppins_700Bold" }}>Add</Text> to create your first court.
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
                    {editingCourt ? "Edit Court" : "Add Court"}
                  </Text>
                  <Text style={styles.modalHint}>
                    {editingCourt
                      ? "Update name and/or image."
                      : "Give it a name and optional image."}
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

              <Text style={styles.fieldLabel}>Court Name</Text>
              <TextInput
                placeholder="e.g. Center Court"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                style={styles.input}
                returnKeyType="done"
              />

              <Pressable
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed && Platform.OS === "ios" && styles.pressed,
                ]}
                onPress={pickImage}
              >
                <Text style={styles.pickBtnText}>
                  {picture ? "Change Image" : "Pick Image"}
                </Text>
                <Text style={styles.pickBtnSub}>JPG/PNG • Cropping enabled</Text>
              </Pressable>

              {picture?.uri ? (
                <Image source={{ uri: picture.uri }} style={styles.preview} />
              ) : editingCourt?.picture ? (
                <Image
                  source={{ uri: existingEditingImage }}
                  style={styles.preview}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>No image</Text>
                </View>
              )}

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
                  onPress={
                    saving ? undefined : editingCourt ? updateCourt : createCourt
                  }
                >
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.footerBtnText}>
                        {editingCourt ? "Updating..." : "Saving..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.footerBtnText}>
                      {editingCourt ? "Update" : "Save"}
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
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
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
  cardMediaWrap: {
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  courtName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: palette.ink },
  thumbnail: {
    width: 120,
    height: 76,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
  },
  noThumb: {
    width: 120,
    height: 76,
    borderRadius: 16,
    backgroundColor: palette.cardTint,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderStyle: "dashed",
    gap: 6,
  },
  noThumbText: { color: palette.iconGrey, fontFamily: "Poppins_700Bold", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginLeft: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
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
  modalTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#111827" },
  modalHint: { marginTop: 4, color: "#6B7280", fontFamily: "Poppins_500Medium" },
  closeX: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  closeXText: { fontFamily: "Poppins_700Bold", color: "#374151" },
  fieldLabel: { color: "#374151", fontFamily: "Poppins_700Bold", marginBottom: 8, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    color: "#111827",
    fontFamily: "Poppins_500Medium",
    backgroundColor: "#FAFAFB",
  },
  pickBtn: {
    backgroundColor: "#2B2D42",
    borderWidth: 1,
    borderColor: "#2B2D42",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  pickBtnText: { color: "#FFFFFF", fontFamily: "Poppins_700Bold" },
  pickBtnSub: { marginTop: 3, color: "rgba(255,255,255,0.72)", fontFamily: "Poppins_500Medium", fontSize: 12 },
  preview: { width: "100%", height: 170, borderRadius: 14, marginBottom: 12, backgroundColor: "#EEF2FF" },
  previewPlaceholder: {
    width: "100%",
    height: 170,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPlaceholderText: { color: "#6B7280", fontFamily: "Poppins_700Bold" },
  modalActions: { flexDirection: "row", gap: 10 },
  footerBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  cancelBtn: { backgroundColor: "#6C757D" },
  saveBtn: { backgroundColor: "#198754" },
  footerBtnText: { color: "#fff", fontFamily: "Poppins_700Bold" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
