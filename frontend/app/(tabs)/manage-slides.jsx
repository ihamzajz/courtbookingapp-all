import { useCallback, useEffect, useMemo, useState } from "react";
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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import TopHeaderBox from "../../components/TopHeaderBox";
import { SLIDES_API, SLIDE_IMAGES_BASE } from "../../src/config/api";
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
  success: "#198754",
};

const buildSlideImageUrl = (picture, cacheKey = "") =>
  buildUploadAssetUrl(SLIDE_IMAGES_BASE, picture, "slides", cacheKey);

const getUploadFileName = (asset) => {
  const providedName = asset?.fileName?.trim();
  if (providedName) return providedName;

  const uri = asset?.uri || "";
  const uriName = uri.split("/").pop();
  if (uriName && uriName.includes(".")) return uriName;

  const mimeType = asset?.mimeType || "image/jpeg";
  const extension = mimeType.split("/")[1] || "jpg";
  return `slide-${Date.now()}.${extension}`;
};

const parseApiResponse = async (res) => {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export default function ManageSlides() {
  const tabBarHeight = useBottomTabBarHeight();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [reordering, setReordering] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isActive, setIsActive] = useState("yes");
  const [picture, setPicture] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const [token, setToken] = useState(null);

  const filteredSlides = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return slides;
    return slides.filter((slide) =>
      [slide.title, slide.subtitle].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [slides, search]);

  const fetchSlides = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${SLIDES_API}/admin/all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load slides");
        return;
      }

      setSlides(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load slides");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    getStoredToken().then(setToken);
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

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to gallery");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setPicture(asset);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subtitle", subtitle.trim());
    if (sortOrder.trim()) {
      formData.append("sortOrder", sortOrder.trim());
    }
    formData.append("isActive", isActive);

    if (picture?.uri) {
      const mimeType = picture.mimeType || "image/jpeg";
      formData.append("picture", {
        uri: picture.uri,
        name: getUploadFileName(picture),
        type: mimeType,
      });
    }

    return formData;
  };

  const saveSlide = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Slide title is required");
      return;
    }

    if (!editingSlide && !picture?.uri) {
      Alert.alert("Validation", "Slide image is required");
      return;
    }

    const liveToken = await requireToken();
    if (!liveToken) return;

    setSaving(true);
    try {
      const endpoint = editingSlide ? `${SLIDES_API}/${editingSlide.id}` : SLIDES_API;
      const method = editingSlide ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${liveToken}`,
        },
        body: buildFormData(),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to save slide");
        return;
      }

      closeModal();
      setImageRefreshKey(Date.now());
      fetchSlides();
    } catch {
      Alert.alert("Error", "Failed to save slide");
    } finally {
      setSaving(false);
    }
  };

  const deleteSlide = (id) => {
    Alert.alert("Confirm", "Delete this slide?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const liveToken = await requireToken();
          if (!liveToken) return;

          try {
            const res = await fetch(`${SLIDES_API}/${id}`, {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${liveToken}`,
              },
            });
            const data = await parseApiResponse(res);
            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to delete slide");
              return;
            }
            setImageRefreshKey(Date.now());
            fetchSlides();
          } catch {
            Alert.alert("Error", "Failed to delete slide");
          }
        },
      },
    ]);
  };

  const reorderSlides = async (nextSlides) => {
    const liveToken = await requireToken();
    if (!liveToken) return;

    setSlides(nextSlides);
    setReordering(true);

    try {
      const res = await fetch(`${SLIDES_API}/reorder`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${liveToken}`,
        },
        body: JSON.stringify({
          orderedIds: nextSlides.map((slide) => slide.id),
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to reorder slides");
        fetchSlides();
        return;
      }

      setSlides(Array.isArray(data) ? data : nextSlides);
    } catch {
      Alert.alert("Error", "Failed to reorder slides");
      fetchSlides();
    } finally {
      setReordering(false);
    }
  };

  const moveSlide = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length || reordering) return;

    const nextSlides = [...slides];
    const [item] = nextSlides.splice(index, 1);
    nextSlides.splice(targetIndex, 0, item);
    reorderSlides(nextSlides);
  };

  const openCreateModal = () => {
    setEditingSlide(null);
    setTitle("");
    setSubtitle("");
    setSortOrder("");
    setIsActive("yes");
    setPicture(null);
    setModalVisible(true);
  };

  const openEditModal = (slide) => {
    setEditingSlide(slide);
    setTitle(slide?.title || "");
    setSubtitle(slide?.subtitle || "");
    setSortOrder(String(slide?.sort_order ?? ""));
    setIsActive(slide?.is_active || "yes");
    setPicture(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingSlide(null);
    setTitle("");
    setSubtitle("");
    setSortOrder("");
    setIsActive("yes");
    setPicture(null);
  };

  const slideImageUrl = (filename) => buildSlideImageUrl(filename, imageRefreshKey);

  const renderSlide = ({ item, index }) => (
    <View style={styles.card}>
      <Image source={{ uri: slideImageUrl(item.picture) }} style={styles.thumbnail} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeadingRow}>
            <View style={styles.cardTitleWrap}>
            <Text style={styles.slideTitle}>
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text style={styles.slideSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              styles.sortBtn,
              (index === 0 || reordering) && styles.disabledIconBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => moveSlide(index, -1)}
            disabled={index === 0 || reordering}
          >
            <MaterialIcons name="keyboard-arrow-up" size={21} color={palette.navy} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              styles.sortBtn,
              (index === slides.length - 1 || reordering) && styles.disabledIconBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => moveSlide(index, 1)}
            disabled={index === slides.length - 1 || reordering}
          >
            <MaterialIcons name="keyboard-arrow-down" size={21} color={palette.navy} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, styles.editBtn, pressed && styles.pressed]}
            onPress={() => openEditModal(item)}
          >
            <MaterialIcons name="edit" size={18} color={palette.navy} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, styles.deleteBtn, pressed && styles.pressed]}
            onPress={() => deleteSlide(item.id)}
          >
            <MaterialIcons name="delete-outline" size={18} color={palette.navy} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.badge,
              item.is_active === "yes" ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.is_active === "yes" ? "Active" : "Hidden"}
            </Text>
          </View>
          <Text style={styles.sortText}>Order {index + 1}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.container, { paddingBottom: tabBarHeight + 12 }]}>
        <View style={styles.page}>
          <View style={styles.header}>
            <TopHeaderBox title="Manage Slides" onBack={() => router.replace("/(tabs)/admin-panel")} />

            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color="#97A3B7"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search slides"
                  placeholderTextColor="#97A3B7"
                  style={styles.searchInput}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                onPress={openCreateModal}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {search.trim() ? (
            <FlatList
              data={filteredSlides}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSlide}
              refreshing={loading}
              onRefresh={fetchSlides}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 6 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.empty}>
                    <MaterialIcons name="image" size={30} color={palette.muted} />
                    <Text style={styles.emptyText}>No slides found.</Text>
                    <Text style={styles.emptySub}>You can add up to 10 home page slides.</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 6 }}
            >
              {slides.map((item, index) => (
                <View key={item.id} style={{ marginBottom: index === slides.length - 1 ? 0 : 8 }}>
                  {renderSlide({ item, index })}
                </View>
              ))}

              {!loading && slides.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialIcons name="image" size={30} color={palette.muted} />
                  <Text style={styles.emptyText}>No slides found.</Text>
                  <Text style={styles.emptySub}>You can add up to 10 home page slides.</Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingSlide ? "Edit Slide" : "Add Slide"}
                  </Text>
                  <Text style={styles.modalHint}>
                    Home page slider supports up to 10 slides.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.closeX, pressed && styles.pressed]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.closeXText}>X</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                placeholder="Slide title"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput
                placeholder="Optional subtitle"
                placeholderTextColor="#9CA3AF"
                value={subtitle}
                onChangeText={setSubtitle}
                style={styles.input}
              />

              <View style={styles.grid2}>
                <View style={[styles.fieldCol, { marginRight: 10 }]}>
                  <Text style={styles.fieldLabel}>Sort Order</Text>
                  <TextInput
                    placeholder="Auto"
                    placeholderTextColor="#9CA3AF"
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleBtn, isActive === "yes" && styles.toggleBtnActive]}
                      onPress={() => setIsActive("yes")}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          isActive === "yes" && styles.toggleTextActive,
                        ]}
                      >
                        Active
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleBtn, isActive === "no" && styles.toggleBtnActive]}
                      onPress={() => setIsActive("no")}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          isActive === "no" && styles.toggleTextActive,
                        ]}
                      >
                        Hidden
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable style={styles.pickBtn} onPress={pickImage}>
                <Text style={styles.pickBtnText}>{picture ? "Change Image" : "Pick Image"}</Text>
                <Text style={styles.pickBtnSub}>JPG/PNG • Cropping enabled</Text>
              </Pressable>

              {picture?.uri ? (
                <Image source={{ uri: picture.uri }} style={styles.preview} />
              ) : editingSlide?.picture ? (
                <Image
                  source={{ uri: slideImageUrl(editingSlide.picture) }}
                  style={styles.preview}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>No image selected</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.footerBtn, styles.cancelBtn]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.footerBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.footerBtn, styles.saveBtn, saving && { opacity: 0.8 }]}
                  onPress={saveSlide}
                  disabled={saving}
                >
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.footerBtnText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.footerBtnText}>{editingSlide ? "Update" : "Save"}</Text>
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  page: { width: "100%", maxWidth: 520, alignSelf: "center", flex: 1 },
  header: { gap: 14, marginBottom: 6 },
  headerTopRow: { flexDirection: "row", alignItems: "stretch", gap: 12 },
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
  },
  headingIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headingCopy: { flex: 1 },
  headingTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#FFFFFF" },
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
  },
  searchInput: { flex: 1, color: palette.ink, fontSize: 15, paddingVertical: 0, fontFamily: "Poppins_500Medium" },
  addBtn: {
    width: "24%",
    height: 43,
    backgroundColor: palette.success,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addBtnText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  thumbnail: {
    width: "100%",
    height: 146,
    borderRadius: 14,
    backgroundColor: "#EAF1FF",
  },
  cardContent: {
    marginTop: 10,
  },
  cardHeadingRow: {
    gap: 4,
  },
  cardTitleWrap: { flex: 1 },
  slideTitle: { color: palette.ink, fontSize: 13, fontFamily: "Poppins_700Bold", lineHeight: 18 },
  slideSubtitle: { marginTop: 3, color: palette.muted, fontSize: 11.5, lineHeight: 16, fontFamily: "Poppins_400Regular" },
  actions: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-start", marginTop: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sortBtn: { backgroundColor: "#EEF3FF", borderColor: "#D7E2FB" },
  editBtn: { backgroundColor: "#E9EEF9", borderColor: "#D3DDF2" },
  deleteBtn: { backgroundColor: "#ECEFF7", borderColor: "#D9DEEB" },
  disabledIconBtn: { opacity: 0.45 },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeActive: { backgroundColor: "#E8F6EE" },
  badgeInactive: { backgroundColor: "#ECEFF7" },
  badgeText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: palette.ink },
  sortText: { color: palette.muted, fontSize: 11, fontFamily: "Poppins_500Medium" },
  empty: {
    marginTop: 18,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: palette.ink, textAlign: "center", fontFamily: "Poppins_700Bold", marginTop: 10 },
  emptySub: { marginTop: 6, color: palette.muted, textAlign: "center", fontFamily: "Poppins_500Medium" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
  },
  modalTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: palette.ink },
  modalHint: { marginTop: 4, color: palette.muted, fontFamily: "Poppins_500Medium" },
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
  grid2: { flexDirection: "row", alignItems: "flex-start" },
  fieldCol: { flex: 1 },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: "#EAF1FF", borderColor: "#BFD0F1" },
  toggleText: { color: palette.muted, fontFamily: "Poppins_500Medium", fontSize: 12 },
  toggleTextActive: { color: palette.ink },
  pickBtn: {
    backgroundColor: palette.navy,
    borderWidth: 1,
    borderColor: palette.navy,
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  pickBtnText: { color: "#FFFFFF", fontFamily: "Poppins_700Bold" },
  pickBtnSub: {
    marginTop: 3,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  preview: {
    width: "100%",
    height: 170,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#EEF2FF",
  },
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
  saveBtn: { backgroundColor: palette.success },
  footerBtnText: { color: "#fff", fontFamily: "Poppins_700Bold" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
