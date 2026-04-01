import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import AppScreen from "../../components/AppScreen";
import TopHeaderBox from "../../components/TopHeaderBox";
import { EVENT_BOOKINGS_API } from "../../src/config/api";
import { getStoredToken } from "../../src/utils/auth";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const palette = {
  bg: "#F4F8FF",
  surface: "#FFFFFF",
  cardTint: "#EEF4FF",
  ink: "#112A5C",
  muted: "#66758F",
  line: "#CBD8F0",
  navy: "#2B2D42",
  blueStart: "#007FFF",
  blueEnd: "#2A52BE",
  success: "#198754",
  warning: "#C98A00",
  danger: "#D9534F",
};

export default function EventDashboard() {
  const [token, setToken] = useState(null);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);

  const [selected, setSelected] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editBookingStatus, setEditBookingStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");

  useEffect(() => {
    getStoredToken().then(setToken);
  }, []);

  const fetchBookings = async () => {
    if (!token) return;
    try {
      const params = {
        search,
        bookingStatus,
        paymentStatus,
        year,
        month,
        dateFrom: dateFrom ? dateFrom.toISOString().split("T")[0] : "",
        dateTo: dateTo ? dateTo.toISOString().split("T")[0] : "",
      };

      const res = await axios.get(`${EVENT_BOOKINGS_API}/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const sorted = (res.data || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setFiltered(sorted);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to fetch event bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bookingStatus, paymentStatus, year, month, dateFrom, dateTo]);

  const formatTime = (time) => {
    if (!time) return "";
    const [rawHour, m] = time.split(":").map(Number);
    const h = rawHour % 24;
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
  };

  const saveEdit = async () => {
    if (!selected) return;
    try {
      await axios.put(
        `${EVENT_BOOKINGS_API}/admin/${selected.id}/status`,
        { status: editBookingStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.put(
        `${EVENT_BOOKINGS_API}/admin/${selected.id}/payment`,
        { paymentStatus: editPaymentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditVisible(false);
      setSelected(null);
      fetchBookings();
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to update event booking");
    }
  };

  const getStatusTone = (value) => {
    switch ((value || "").toUpperCase()) {
      case "APPROVED":
      case "PAID":
        return styles.statusSuccess;
      case "PENDING":
      case "UNPAID":
        return styles.statusWarning;
      case "REJECTED":
      case "CANCELLED":
        return styles.statusDanger;
      default:
        return styles.statusNeutral;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardRow}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.user_name || "-"}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.event_name || "-"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setSelected(item);
            setEditBookingStatus(item.booking_status);
            setEditPaymentStatus(item.payment_status);
            setEditVisible(true);
          }}
          activeOpacity={0.85}
        >
          <FontAwesome5 name="pen" size={12} color="#fff" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaPill}>
          <MaterialIcons name="calendar-month" size={15} color={palette.blueEnd} />
          <Text style={styles.metaText}>{new Date(item.booking_date).toLocaleDateString()}</Text>
        </View>

        <View style={styles.metaPill}>
          <MaterialIcons name="schedule" size={15} color={palette.blueEnd} />
          <Text style={styles.metaText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, getStatusTone(item.booking_status)]}>
          <Text style={styles.statusText}>{item.booking_status || "UNKNOWN"}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusTone(item.payment_status)]}>
          <Text style={styles.statusText}>{item.payment_status || "UNKNOWN"}</Text>
        </View>
      </View>
    </View>
  );

  const ListHeader = (
    <View>
      <TopHeaderBox title="Event Dashboard" onBack={() => router.replace("/(tabs)/admin-panel")} />

      <View style={styles.topControls}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={14} color="#97A3B7" />
          <Text style={styles.searchGhost}>
            {search || "Search user or venue"}
          </Text>
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearChip}>
              <FontAwesome5 name="times" size={12} color={palette.navy} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchBookings}
          activeOpacity={0.85}
        >
          <FontAwesome5 name="sync" size={14} color="#FFFFFF" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={1} style={styles.hiddenInputOverlay}>
        <View style={styles.hiddenInputInner}>
          <FontAwesome5 name="search" size={14} color="#97A3B7" />
          <Text style={styles.hiddenInputText}>{search || "Search user or venue"}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filtersCard}>
        <View style={styles.field}>
          <Text style={styles.label}>Search</Text>
          <View style={styles.inputWrap}>
            <FontAwesome5 name="search" size={14} color="#6b7280" />
            <TextInputProxy value={search} onChangeText={setSearch} />
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Year</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={year}
                onValueChange={setYear}
                style={styles.pickerStyle}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={palette.ink}
              >
                <Picker.Item label="All" value="" />
                {Array.from({ length: 10 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <Picker.Item key={y} label={y.toString()} value={y.toString()} />;
                })}
              </Picker>
            </View>
          </View>

          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Month</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={month}
                onValueChange={setMonth}
                style={styles.pickerStyle}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={palette.ink}
              >
                <Picker.Item label="All" value="" />
                {MONTHS.map((m, idx) => (
                  <Picker.Item key={idx} label={m} value={(idx + 1).toString()} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>From Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDateFromPicker(true)}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="calendar-alt" size={14} color="#6b7280" />
              <Text style={styles.dateText} numberOfLines={1}>
                {dateFrom ? `  ${dateFrom.toLocaleDateString()}` : "  Select Date"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>To Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDateToPicker(true)}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="calendar-alt" size={14} color="#6b7280" />
              <Text style={styles.dateText} numberOfLines={1}>
                {dateTo ? `  ${dateTo.toLocaleDateString()}` : "  Select Date"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDateFromPicker && (
          <DateTimePicker
            value={dateFrom || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, selectedValue) => {
              if (Platform.OS !== "ios") setShowDateFromPicker(false);
              if (selectedValue) setDateFrom(selectedValue);
            }}
          />
        )}

        {showDateToPicker && (
          <DateTimePicker
            value={dateTo || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, selectedValue) => {
              if (Platform.OS !== "ios") setShowDateToPicker(false);
              if (selectedValue) setDateTo(selectedValue);
            }}
          />
        )}

        <View style={styles.grid2}>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Booking Status</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={bookingStatus}
                onValueChange={setBookingStatus}
                style={styles.pickerStyle}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={palette.ink}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="Pending" value="PENDING" />
                <Picker.Item label="Approved" value="APPROVED" />
                <Picker.Item label="Rejected" value="REJECTED" />
                <Picker.Item label="Cancelled" value="CANCELLED" />
              </Picker>
            </View>
          </View>

          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Payment Status</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={paymentStatus}
                onValueChange={setPaymentStatus}
                style={styles.pickerStyle}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={palette.ink}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="Unpaid" value="UNPAID" />
                <Picker.Item label="Paid" value="PAID" />
              </Picker>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Bookings</Text>
        <Text style={styles.smallMuted}>Sorted by newest</Text>
      </View>
    </View>
  );

  return (
    <AppScreen bottomOffset={34} scrollable={false}>
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {selected && (
        <Modal visible={editVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Booking</Text>
                <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalCloseBtn}>
                  <FontAwesome5 name="times" size={16} color={palette.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalInfoCard}>
                <InfoRow label="User" value={selected.user_name || "-"} />
                <InfoRow label="Venue" value={selected.event_name || "-"} />
                <InfoRow
                  label="Booking Date"
                  value={new Date(selected.booking_date).toLocaleDateString()}
                />
                <InfoRow
                  label="Time"
                  value={`${formatTime(selected.start_time)} - ${formatTime(selected.end_time)}`}
                  last
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Booking Status</Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={editBookingStatus}
                    onValueChange={setEditBookingStatus}
                    style={styles.pickerStyle}
                    dropdownIconColor={palette.ink}
                  >
                    <Picker.Item label="Pending" value="PENDING" />
                    <Picker.Item label="Approved" value="APPROVED" />
                    <Picker.Item label="Rejected" value="REJECTED" />
                    <Picker.Item label="Cancelled" value="CANCELLED" />
                  </Picker>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Payment Status</Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={editPaymentStatus}
                    onValueChange={setEditPaymentStatus}
                    style={styles.pickerStyle}
                    dropdownIconColor={palette.ink}
                  >
                    <Picker.Item label="Unpaid" value="UNPAID" />
                    <Picker.Item label="Paid" value="PAID" />
                  </Picker>
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEditVisible(false);
                    setSelected(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} activeOpacity={0.85}>
                  <Text style={styles.btnText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AppScreen>
  );
}

function TextInputProxy({ value, onChangeText }) {
  return (
    <View style={{ flex: 1, marginLeft: 8 }}>
      <Text suppressHighlighting onPress={() => {}} style={styles.input}>
        {value || "Search user or venue"}
      </Text>
      <View style={StyleSheet.absoluteFill}>
        <PickerSearchOverlay value={value} onChangeText={onChangeText} />
      </View>
    </View>
  );
}

function PickerSearchOverlay({ value, onChangeText }) {
  return (
    <View style={{ flex: 1 }}>
      <TextNativeInput value={value} onChangeText={onChangeText} />
    </View>
  );
}

function TextNativeInput({ value, onChangeText }) {
  const { TextInput } = require("react-native");
  return (
    <TextInput
      style={styles.nativeInput}
      placeholder="Search user or venue"
      placeholderTextColor="#9ca3af"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function InfoRow({ label, value, last = false }) {
  return (
    <View style={[styles.modalInfoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.modalLabel}>{label}</Text>
      <Text style={styles.modalValueText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  backStub: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },
  topControls: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#9AA9C6",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchGhost: {
    flex: 1,
    marginLeft: 10,
    color: searchPlaceholderColor(),
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  clearChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenInputOverlay: {
    display: "none",
  },
  hiddenInputInner: {
    display: "none",
  },
  hiddenInputText: {
    display: "none",
  },
  refreshBtn: {
    minWidth: 96,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#6F42C1",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
  },
  refreshText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  filtersCard: {
    marginTop: 18,
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#8AA0CA",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: palette.ink,
  },
  smallMuted: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
  },
  field: { marginBottom: 8 },
  half: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
    color: palette.ink,
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.cardTint,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  input: {
    color: palette.ink,
    fontSize: 10.5,
    minHeight: 20,
    fontFamily: "Poppins_500Medium",
  },
  nativeInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 10.5,
    paddingVertical: 8,
    fontFamily: "Poppins_500Medium",
  },
  grid2: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 10,
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: palette.cardTint,
    justifyContent: "center",
    paddingVertical: Platform.OS === "android" ? 2 : 0,
  },
  pickerStyle: {
    color: palette.ink,
    width: "100%",
    ...(Platform.OS === "android"
      ? { height: 56, paddingHorizontal: 10, fontSize: 11 }
      : { height: 34, fontSize: 11 }),
  },
  pickerItemStyle: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.cardTint,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  dateText: {
    fontSize: 10.5,
    color: palette.ink,
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins_500Medium",
  },
  listHeader: {
    marginTop: 14,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 28,
    paddingTop: 4,
  },
  cardRow: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#94A7C6",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: palette.ink,
  },
  cardSubtitle: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.cardTint,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: palette.line,
  },
  metaText: {
    fontSize: 10.5,
    color: palette.ink,
    fontFamily: "Poppins_500Medium",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusNeutral: {
    backgroundColor: "#E9EEF7",
  },
  statusSuccess: {
    backgroundColor: "#E8F6EE",
  },
  statusWarning: {
    backgroundColor: "#FFF4DA",
  },
  statusDanger: {
    backgroundColor: "#FDEBEC",
  },
  statusText: {
    fontSize: 9.5,
    fontFamily: "Poppins_700Bold",
    color: palette.ink,
  },
  editBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#198754",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    marginLeft: 6,
    color: "#fff",
    fontSize: 10.5,
    fontFamily: "Poppins_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 14,
  },
  modal: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: palette.ink,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#EEF2FB",
  },
  modalInfoCard: {
    backgroundColor: palette.cardTint,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 14,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    gap: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: palette.muted,
  },
  modalValueText: {
    fontSize: 12,
    color: palette.ink,
    flexShrink: 1,
    textAlign: "right",
    fontFamily: "Poppins_500Medium",
  },
  modalBtnRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: palette.success,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: palette.navy,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
  },
});

function searchPlaceholderColor() {
  return "#7D8CAB";
}
