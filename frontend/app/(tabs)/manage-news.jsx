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
import { NEWS_API, NEWS_IMAGES_BASE } from "../../src/config/api";
import { getStoredToken } from "../../src/utils/auth";

const CONTROL_HEIGHT = 48;
const palette = {
  bg: "#F4F8FF",
  surface: "#FFFFFF",
  ink: "#102A56",
  muted: "#66758F",
  line: "#DCE5F5",
  navy: "#2B2D42",
  blueStart: "#007FFF",
  blueEnd: "#2A52BE",
  success: "#198754",
};

const buildNewsImageUrl = (picture, cacheKey = "") => {
  if (!picture) return null;
  if (/^https?:\/\//i.test(picture)) return picture;

  const normalizedBase = NEWS_IMAGES_BASE.replace(/\/+$/, "");
  const normalizedPicture = String(picture).replace(/^\/+/, "");
  const suffix = cacheKey ? `?v=${cacheKey}` : "";
  return `${normalizedBase}/${normalizedPicture}${suffix}`;
};

const getUploadFileName = (asset) => {
  const providedName = asset?.fileName?.trim();
  if (providedName) return providedName;

  const uri = asset?.uri || "";
  const uriName = uri.split("/").pop();
  if (uriName && uriName.includes(".")) return uriName;

  const mimeType = asset?.mimeType || "image/jpeg";
  const extension = mimeType.split("/")[1] || "jpg";
  return `news-${Date.now()}.${extension}`;
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

export default function ManageNews() {
  const tabBarHeight = useBottomTabBarHeight();
  const [token, setToken] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [reordering, setReordering] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [status, setStatus] = useState("active");
  const [picture, setPicture] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());

  useEffect(() => {
    getStoredToken().then(setToken);
  }, []);

  const filteredNews = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return news;

    return news.filter((item) =>
      [item.heading, item.content, item.status].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [news, search]);

  const fetchNews = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${NEWS_API}/admin/all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load news");
        return;
      }

      setNews(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const pickImage = async () => {
    const { status: permissionStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionStatus !== "granted") {
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
      if (asset?.uri) setPicture(asset);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("heading", heading.trim());
    formData.append("content", content.trim());
    formData.append("status", status);
    if (sortOrder.trim()) {
      formData.append("sortOrder", sortOrder.trim());
    }

    if (picture?.uri) {
      formData.append("picture", {
        uri: picture.uri,
        name: getUploadFileName(picture),
        type: picture.mimeType || "image/jpeg",
      });
    }

    return formData;
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingNews(null);
    setHeading("");
    setContent("");
    setSortOrder("");
    setStatus("active");
    setPicture(null);
  };

  const openCreateModal = () => {
    closeModal();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingNews(item);
    setHeading(item?.heading || "");
    setContent(item?.content || "");
    setSortOrder(String(item?.sort_order ?? ""));
    setStatus(item?.status || "active");
    setPicture(null);
    setModalVisible(true);
  };

  const saveNews = async () => {
    if (!heading.trim() || !content.trim()) {
      Alert.alert("Validation", "Heading and content are required");
      return;
    }

    if (!editingNews && !picture?.uri) {
      Alert.alert("Validation", "News image is required");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingNews ? `${NEWS_API}/${editingNews.id}` : NEWS_API;
      const method = editingNews ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: buildFormData(),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to save news");
        return;
      }

      closeModal();
      setImageRefreshKey(Date.now());
      fetchNews();
    } catch {
      Alert.alert("Error", "Failed to save news");
    } finally {
      setSaving(false);
    }
  };

  const deleteNews = (id) => {
    Alert.alert("Confirm", "Delete this news item?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${NEWS_API}/${id}`, {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            const data = await parseApiResponse(res);
            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to delete news");
              return;
            }
            setImageRefreshKey(Date.now());
            fetchNews();
          } catch {
            Alert.alert("Error", "Failed to delete news");
          }
        },
      },
    ]);
  };

  const reorderNews = async (nextNews) => {
    setNews(nextNews);
    setReordering(true);

    try {
      const res = await fetch(`${NEWS_API}/reorder`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderedIds: nextNews.map((item) => item.id),
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to reorder news");
        fetchNews();
        return;
      }

      setNews(Array.isArray(data) ? data : nextNews);
    } catch {
      Alert.alert("Error", "Failed to reorder news");
      fetchNews();
    } finally {
      setReordering(false);
    }
  };

  const moveNews = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= news.length || reordering) return;

    const nextNews = [...news];
    const [item] = nextNews.splice(index, 1);
    nextNews.splice(targetIndex, 0, item);
    reorderNews(nextNews);
  };

  const newsImageUrl = (filename) => buildNewsImageUrl(filename, imageRefreshKey);

  const renderNews = ({ item, index }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: newsImageUrl(item.picture) || undefined,
        }}
        style={styles.thumbnail}
      />

      <View style={styles.cardContent}>
        <Text style={styles.newsHeading}>{item.heading}</Text>
        <Text style={styles.newsExcerpt} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.iconBtn, styles.sortBtn, (index === 0 || reordering) && styles.disabledIconBtn]}
            onPress={() => moveNews(index, -1)}
            disabled={index === 0 || reordering}
          >
            <MaterialIcons name="keyboard-arrow-up" size={21} color={palette.navy} />
          </Pressable>
          <Pressable
            style={[
              styles.iconBtn,
              styles.sortBtn,
              (index === news.length - 1 || reordering) && styles.disabledIconBtn,
            ]}
            onPress={() => moveNews(index, 1)}
            disabled={index === news.length - 1 || reordering}
          >
            <MaterialIcons name="keyboard-arrow-down" size={21} color={palette.navy} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.editBtn]} onPress={() => openEditModal(item)}>
            <MaterialIcons name="edit" size={18} color={palette.navy} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.deleteBtn]} onPress={() => deleteNews(item.id)}>
            <MaterialIcons name="delete-outline" size={18} color={palette.navy} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.badge, item.status === "active" ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{item.status === "active" ? "Active" : "Hidden"}</Text>
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
            <TopHeaderBox title="Manage News" onBack={() => router.replace("/(tabs)/admin-panel")} />

            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color="#97A3B7" style={{ marginRight: 10 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search news"
                  placeholderTextColor="#97A3B7"
                  style={styles.searchInput}
                />
              </View>

              <Pressable style={styles.addBtn} onPress={openCreateModal}>
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={filteredNews}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderNews}
            refreshing={loading}
            onRefresh={fetchNews}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{editingNews ? "Edit News" : "Add News"}</Text>
                  <Text style={styles.modalHint}>Upload image, heading, content, status, and order.</Text>
                </View>

                <Pressable style={styles.closeX} onPress={closeModal} disabled={saving}>
                  <Text style={styles.closeXText}>X</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Heading</Text>
                <TextInput
                  placeholder="News heading"
                  placeholderTextColor="#9CA3AF"
                  value={heading}
                  onChangeText={setHeading}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Content</Text>
                <TextInput
                  placeholder="News content"
                  placeholderTextColor="#9CA3AF"
                  value={content}
                  onChangeText={setContent}
                  style={[styles.input, styles.contentInput]}
                  multiline
                  textAlignVertical="top"
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
                        style={[styles.toggleBtn, status === "active" && styles.toggleBtnActive]}
                        onPress={() => setStatus("active")}
                      >
                        <Text style={[styles.toggleText, status === "active" && styles.toggleTextActive]}>
                          Active
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.toggleBtn, status === "inactive" && styles.toggleBtnActive]}
                        onPress={() => setStatus("inactive")}
                      >
                        <Text style={[styles.toggleText, status === "inactive" && styles.toggleTextActive]}>
                          Hidden
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <Pressable style={styles.pickBtn} onPress={pickImage}>
                  <Text style={styles.pickBtnText}>{picture ? "Change Image" : "Pick Image"}</Text>
                </Pressable>

                {picture?.uri ? (
                  <Image source={{ uri: picture.uri }} style={styles.preview} />
                ) : editingNews?.picture ? (
                  <Image source={{ uri: newsImageUrl(editingNews.picture) }} style={styles.preview} />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Text style={styles.previewPlaceholderText}>No image selected</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={[styles.footerBtn, styles.cancelBtn]} onPress={closeModal} disabled={saving}>
                  <Text style={styles.footerBtnText}>Cancel</Text>
                </Pressable>

                <Pressable style={[styles.footerBtn, styles.saveBtn, saving && { opacity: 0.8 }]} onPress={saveNews}>
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.footerBtnText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.footerBtnText}>{editingNews ? "Update" : "Save"}</Text>
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
  page: { width: "100%", maxWidth: 560, alignSelf: "center", flex: 1 },
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
  controlsRow: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 12 },
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
    padding: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: "#EAF1FF",
  },
  cardContent: {
    marginTop: 12,
  },
  newsHeading: { color: palette.ink, fontSize: 13, fontFamily: "Poppins_700Bold", lineHeight: 18 },
  newsExcerpt: { marginTop: 4, color: palette.muted, fontSize: 12.5, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-start", marginTop: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sortBtn: { backgroundColor: "#EEF3FF", borderColor: "#D7E2FB" },
  editBtn: { backgroundColor: "#E9EEF9", borderColor: "#D3DDF2" },
  deleteBtn: { backgroundColor: "#ECEFF7", borderColor: "#D9DEEB" },
  disabledIconBtn: { opacity: 0.45 },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeActive: { backgroundColor: "#E8F6EE" },
  badgeInactive: { backgroundColor: "#ECEFF7" },
  badgeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: palette.ink },
  sortText: { color: palette.muted, fontSize: 12, fontFamily: "Poppins_500Medium" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: palette.line, maxHeight: "88%" },
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
  contentInput: { minHeight: 130 },
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
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  pickBtnText: { color: "#FFFFFF", fontFamily: "Poppins_700Bold" },
  preview: { width: "100%", height: 180, borderRadius: 14, marginBottom: 12, backgroundColor: "#EEF2FF" },
  previewPlaceholder: {
    width: "100%",
    height: 180,
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
