import { useCallback, useEffect, useMemo, useState } from "react";
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
import { FAQS_API } from "../../src/config/api";
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
  iconGrey: "#7B8497",
};

export default function ManageFaqs() {
  const tabBarHeight = useBottomTabBarHeight();
  const [token, setToken] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("active");
  const [sortOrder, setSortOrder] = useState("");

  useEffect(() => {
    getStoredToken().then(setToken);
  }, []);

  const filteredFaqs = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return faqs;

    return faqs.filter((faq) =>
      [faq.question, faq.answer, faq.status].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [faqs, search]);

  const fetchFaqs = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${FAQS_API}/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load FAQs");
        return;
      }

      setFaqs(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setStatus("active");
    setSortOrder("");
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingFaq(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingFaq(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setQuestion(faq?.question || "");
    setAnswer(faq?.answer || "");
    setStatus(faq?.status || "active");
    setSortOrder(String(faq?.sort_order || ""));
    setModalVisible(true);
  };

  const buildPayload = () => ({
    question: question.trim(),
    answer: answer.trim(),
    status,
    sortOrder: sortOrder.trim(),
  });

  const maxAllowedSortOrder = editingFaq ? faqs.length : faqs.length + 1;

  const validateForm = () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert("Validation", "Question and answer are required");
      return false;
    }

    if (sortOrder.trim()) {
      const parsed = Number.parseInt(sortOrder, 10);

      if (Number.isNaN(parsed) || parsed < 1 || parsed > maxAllowedSortOrder) {
        Alert.alert("Validation", `Order must be between 1 and ${maxAllowedSortOrder}`);
        return false;
      }
    }

    return true;
  };

  const createFaq = async () => {
    if (!token || !validateForm()) return;

    try {
      setSaving(true);
      const res = await fetch(FAQS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to create FAQ");
        return;
      }

      closeModal();
      fetchFaqs();
    } catch {
      Alert.alert("Error", "Failed to create FAQ");
    } finally {
      setSaving(false);
    }
  };

  const updateFaq = async () => {
    if (!token || !editingFaq?.id || !validateForm()) return;

    try {
      setSaving(true);
      const res = await fetch(`${FAQS_API}/${editingFaq.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to update FAQ");
        return;
      }

      closeModal();
      fetchFaqs();
    } catch {
      Alert.alert("Error", "Failed to update FAQ");
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = (id) => {
    if (!token) return;

    Alert.alert("Confirm", "Delete this FAQ?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${FAQS_API}/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              Alert.alert("Error", data?.message || "Failed to delete FAQ");
              return;
            }

            fetchFaqs();
          } catch {
            Alert.alert("Error", "Failed to delete FAQ");
          }
        },
      },
    ]);
  };

  const handleReorder = async (index, direction) => {
    if (!token) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= faqs.length) return;

    const reordered = [...faqs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);

    setFaqs(reordered);

    try {
      const res = await fetch(`${FAQS_API}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderedIds: reordered.map((item) => item.id),
        }),
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to reorder FAQs");
        fetchFaqs();
        return;
      }

      setFaqs(Array.isArray(data) ? data : reordered);
    } catch {
      Alert.alert("Error", "Failed to reorder FAQs");
      fetchFaqs();
    }
  };

  const renderFaq = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeadingRow}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.faqQuestion} numberOfLines={2}>
            {item.question}
          </Text>
          <Text style={styles.faqMeta} numberOfLines={2}>
            {item.answer}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.iconBtn, styles.orderBtn]} onPress={() => handleReorder(index, -1)}>
            <MaterialIcons name="arrow-upward" size={16} color={palette.navy} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.orderBtn]} onPress={() => handleReorder(index, 1)}>
            <MaterialIcons name="arrow-downward" size={16} color={palette.navy} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.editBtn]} onPress={() => openEditModal(item)}>
            <MaterialIcons name="edit" size={16} color={palette.navy} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.deleteBtn]} onPress={() => deleteFaq(item.id)}>
            <MaterialIcons name="delete-outline" size={16} color={palette.navy} />
          </Pressable>
        </View>
      </View>

      <View style={styles.pillsRow}>
        <MetaPill icon="sort" text={`Order: ${item.sort_order || "-"}`} tone="blue" />
        <MetaPill
          icon="toggle-on"
          text={String(item.status || "-")}
          tone={item.status === "active" ? "mint" : "rose"}
        />
      </View>
    </View>
  );

  const TOP_GUTTER = 12;
  const BOTTOM_GUTTER = 12;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.container, { paddingTop: TOP_GUTTER, paddingBottom: tabBarHeight + BOTTOM_GUTTER }]}>
        <View style={styles.page}>
          <View style={styles.header}>
            <TopHeaderBox title="Manage FAQs" onBack={() => router.replace("/(tabs)/admin-panel")} />

            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color="#97A3B7" style={{ marginRight: 10 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search FAQs"
                  placeholderTextColor="#97A3AF"
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
            data={filteredFaqs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderFaq}
            refreshing={loading}
            onRefresh={fetchFaqs}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <MaterialIcons name="quiz" size={30} color={palette.iconGrey} />
                  <Text style={styles.emptyText}>No FAQs found.</Text>
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
                  <Text style={styles.modalTitle}>{editingFaq ? "Edit FAQ" : "Add FAQ"}</Text>
                  <Text style={styles.modalHint}>Manage FAQ content, status, and order.</Text>
                </View>

                <Pressable style={styles.closeX} onPress={closeModal} disabled={saving}>
                  <Text style={styles.closeXText}>X</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.fieldLabel}>Question</Text>
                <TextInput
                  placeholder="Question"
                  placeholderTextColor="#9CA3AF"
                  value={question}
                  onChangeText={setQuestion}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Answer</Text>
                <TextInput
                  placeholder="Answer"
                  placeholderTextColor="#9CA3AF"
                  value={answer}
                  onChangeText={setAnswer}
                  style={[styles.input, styles.answerInput]}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.grid2}>
                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.pickerWrap}>
                      <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                        <Picker.Item label="Active" value="active" />
                        <Picker.Item label="Inactive" value="inactive" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.half}>
                    <Text style={styles.fieldLabel}>Order</Text>
                    <TextInput
                      placeholder={`1 to ${maxAllowedSortOrder}`}
                      placeholderTextColor="#9CA3AF"
                      value={sortOrder}
                      onChangeText={setSortOrder}
                      style={styles.input}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={[styles.footerBtn, styles.cancelBtn]} onPress={closeModal} disabled={saving}>
                  <Text style={styles.footerBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.footerBtn, styles.saveBtn, saving && { opacity: 0.8 }]}
                  onPress={saving ? undefined : editingFaq ? updateFaq : createFaq}
                >
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.footerBtnText}>{editingFaq ? "Updating..." : "Saving..."}</Text>
                    </View>
                  ) : (
                    <Text style={styles.footerBtnText}>{editingFaq ? "Update" : "Save"}</Text>
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
  title: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#FFFFFF" },
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
  },
  addBtnText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  cardHeadingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardTitleWrap: { flex: 1 },
  faqQuestion: { fontSize: 12.5, fontFamily: "Poppins_700Bold", color: palette.ink },
  faqMeta: { marginTop: 4, color: palette.muted, fontSize: 11.5, fontFamily: "Poppins_500Medium" },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  metaPillBlue: { backgroundColor: "#EDF4FF", borderColor: "#D7E6FF" },
  metaPillMint: { backgroundColor: "#ECFBF4", borderColor: "#CFEFDE" },
  metaPillRose: { backgroundColor: "#FFF0F3", borderColor: "#F3D3DB" },
  metaPillIconBlue: { color: "#3B6FB6" },
  metaPillIconMint: { color: "#2F8A68" },
  metaPillIconRose: { color: "#B95D78" },
  metaText: { color: palette.ink, fontSize: 10.5, fontFamily: "Poppins_500Medium" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginLeft: 8, width: 84, justifyContent: "flex-end" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  orderBtn: { backgroundColor: "#EEF2FF", borderColor: "#D3DDF2" },
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
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    maxHeight: "78%",
    borderWidth: 1,
    borderColor: "#EEF0F6",
  },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingBottom: 2, paddingRight: 4 },
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
  answerInput: { minHeight: 100 },
  grid2: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFB",
    marginBottom: 6,
  },
  picker: { color: "#111827", height: Platform.OS === "ios" ? 119 : 49 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  footerBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  cancelBtn: { backgroundColor: "#6C757D" },
  saveBtn: { backgroundColor: "#198754" },
  footerBtnText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
