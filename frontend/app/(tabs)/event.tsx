import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";

import TopHeaderBox from "../../components/TopHeaderBox";
import { API_BASE, EVENT_BOOKINGS_API, EVENT_IMAGES_BASE } from "../../src/config/api";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { clearStoredUser, getStoredUser } from "../../src/utils/auth";

const palette = {
  bg: "#F5F7FC",
  card: "#FFFFFF",
  ink: "#13233F",
  muted: "#707D93",
  line: "#DEE5F0",
  navy: "#2B2D42",
  royal: "#2B2D42",
};

const durations = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420];
const DATE_CHIP_WIDTH = 66;
const DATE_CHIP_GAP = 10;
const DATE_CHIP_SIZE = DATE_CHIP_WIDTH + DATE_CHIP_GAP;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildMonthDateOptions = (baseDate) => {
  const monthDate = startOfDay(baseDate);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const dates = [];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date));
  }

  return dates;
};

const startOfMonth = (value) => new Date(value.getFullYear(), value.getMonth(), 1);
const addMonths = (value, months) => new Date(value.getFullYear(), value.getMonth() + months, 1);
const formatMonthTitle = (date) =>
  date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date) => {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = `${date.getDate()}`.padStart(2, "0");
  const week = date.toLocaleString("en-US", { weekday: "short" });
  return { month, day, week };
};

const timeLabel = (minutes) => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const normalizedHour = hour24 % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const hour12 = normalizedHour % 12 || 12;
  return `${hour12}:${`${minute}`.padStart(2, "0")} ${suffix}`;
};

const timeValue = (minutes) => {
  const hour = `${Math.floor(minutes / 60)}`.padStart(2, "0");
  const minute = `${minutes % 60}`.padStart(2, "0");
  return `${hour}:${minute}:00`;
};

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;
const isPastDate = (date) => startOfDay(date) < startOfDay(new Date());
const isActiveBookingStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus !== "REJECTED" && normalizedStatus !== "CANCELLED";
};

const formatDurationLabel = (duration) => {
  if (duration < 60) {
    return `${duration} min`;
  }

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
};

export default function EventBooking() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(startOfDay(new Date())));
  const [openingVenue, setOpeningVenue] = useState(false);
  const [switchingMonth, setSwitchingMonth] = useState(false);
  const openingTimeoutRef = useRef(null);
  const monthTimeoutRef = useRef(null);
  const dateScrollRef = useRef(null);
  const loaderPhase = useRef(new Animated.Value(0)).current;
  const venueListAnim = useRef(new Animated.Value(0)).current;

  const dateOptions = useMemo(() => buildMonthDateOptions(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);
  const selectedDateIndex = useMemo(
    () => Math.max(dateOptions.findIndex((date) => formatDateKey(date) === formatDateKey(selectedDate)), 0),
    [dateOptions, selectedDate]
  );

  useEffect(() => {
    const loadToken = async () => {
      const user = await getStoredUser();
      if (!user?.token) {
        await clearStoredUser();
        router.replace("/login");
        return;
      }
      setToken(user.token);
    };
    loadToken();
  }, []);

  const loadVenues = useCallback(async () => {
    try {
      setLoadingVenues(true);
      const res = await axios.get(`${API_BASE}/events`);
      setVenues(Array.isArray(res.data) ? res.data : []);
    } catch {
      Alert.alert("Error", "Failed to load venues");
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  useLiveRefresh(loadVenues, { intervalMs: 90000 });
  useRealtimeSubscription("events:updated", loadVenues);

  const loadBookings = useCallback(async () => {
    if (!token || !selectedVenue) return;

    try {
      setLoadingBookings(true);
      const res = await axios.get(EVENT_BOOKINGS_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          eventId: selectedVenue.id,
          date: formatDateKey(selectedDate),
        },
      });
      const nextBookings = Array.isArray(res.data)
        ? res.data.filter((booking) => isActiveBookingStatus(booking.booking_status))
        : [];
      setBookings(nextBookings);
    } catch {
      setBookings([]);
      Alert.alert("Error", "Failed to load slots for this date");
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedVenue, selectedDate, token]);

  useLiveRefresh(loadBookings, {
    enabled: Boolean(token && selectedVenue),
    intervalMs: 45000,
  });
  useRealtimeSubscription(
    "event-bookings:updated",
    loadBookings,
    Boolean(token && selectedVenue)
  );

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDuration, selectedDate]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(loaderPhase, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );

    loaderPhase.setValue(0);
    animation.start();

    return () => {
      animation.stop();
      loaderPhase.stopAnimation();
      loaderPhase.setValue(0);
    };
  }, [loaderPhase]);

  useFocusEffect(
    useCallback(() => {
      venueListAnim.stopAnimation();
      venueListAnim.setValue(0);

      const animation = Animated.timing(venueListAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      });

      requestAnimationFrame(() => {
        animation.start();
      });

      return () => {
        animation.stop();
      };
    }, [venueListAnim])
  );

  useEffect(() => {
    return () => {
      if (openingTimeoutRef.current) clearTimeout(openingTimeoutRef.current);
      if (monthTimeoutRef.current) clearTimeout(monthTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      dateScrollRef.current?.scrollTo({
        x: selectedDateIndex * DATE_CHIP_SIZE,
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedDateIndex, visibleMonth]);

  const filteredVenues = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return venues;
    return venues.filter((venue) => venue.name?.toLowerCase().includes(value));
  }, [venues, search]);

  const slotItems = useMemo(() => {
    const bookingRanges = bookings
      .filter((booking) => isActiveBookingStatus(booking.booking_status))
      .map((booking) => {
      const [startHour, startMinute] = booking.start_time.split(":").map(Number);
      const [endHour, endMinute] = booking.end_time.split(":").map(Number);
      return {
        start: startHour * 60 + startMinute,
        end: endHour * 60 + endMinute,
      };
      });

    const items = [];
    for (let start = 0; start < 1440; start += 30) {
      const end = start + selectedDuration;
      if (end > 1440) {
        continue;
      }
      const overlapsExisting = bookingRanges.some((booking) =>
        overlaps(start, end, booking.start, booking.end)
      );

      items.push({
        key: `${start}-${selectedDuration}`,
        label: timeLabel(start),
        fullLabel: `${timeLabel(start)} - ${timeLabel(end)}`,
        start,
        end,
        available: !overlapsExisting,
      });
    }

    return items;
  }, [bookings, selectedDuration]);

  const handleSelectVenue = (venue) => {
    const today = startOfDay(new Date());
    if (openingTimeoutRef.current) clearTimeout(openingTimeoutRef.current);

    setOpeningVenue(true);

    openingTimeoutRef.current = setTimeout(() => {
      setSelectedVenue(venue);
      setSelectedDate(today);
      setVisibleMonth(startOfMonth(today));
      setSelectedDuration(30);
      setSelectedSlot(null);
      setOpeningVenue(false);
      openingTimeoutRef.current = null;
    }, 120);
  };

  const handleMonthChange = (months) => {
    const nextMonth = startOfMonth(addMonths(visibleMonth, months));
    const today = startOfDay(new Date());

    if (monthTimeoutRef.current) clearTimeout(monthTimeoutRef.current);

    setSwitchingMonth(true);
    setVisibleMonth(nextMonth);
    setSelectedDate(isSameMonth(nextMonth, today) ? today : startOfDay(nextMonth));

    monthTimeoutRef.current = setTimeout(() => {
      setSwitchingMonth(false);
      monthTimeoutRef.current = null;
    }, 350);
  };

  const getLoaderDotStyle = (index) => {
    const start = index * 0.22;
    const peak = start + 0.16;
    const end = start + 0.32;

    return {
      opacity: loaderPhase.interpolate({
        inputRange: [0, start, peak, end, 1],
        outputRange: [0.3, 0.3, 1, 0.3, 0.3],
        extrapolate: "clamp",
      }),
      transform: [
        {
          scale: loaderPhase.interpolate({
            inputRange: [0, start, peak, end, 1],
            outputRange: [0.85, 0.85, 1.18, 0.85, 0.85],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  };

  const handleBookNow = async () => {
    if (!selectedVenue || !selectedSlot || !selectedSlot.available) {
      Alert.alert("Select slot", "Please choose an available slot before booking.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        EVENT_BOOKINGS_API,
        {
          eventId: selectedVenue.id,
          bookingDate: formatDateKey(selectedDate),
          startTime: timeValue(selectedSlot.start),
          endTime: timeValue(selectedSlot.end),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Booking Created", "Your venue booking has been created successfully.");
      setSelectedSlot(null);
      loadBookings();
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert("Unavailable", "This slot is no longer available.");
      } else if (error.response?.data?.message) {
        Alert.alert("Booking Failed", error.response.data.message);
      } else {
        Alert.alert("Error", "Failed to create booking.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderVenueList = () => (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <TopHeaderBox title="Event Booking" onBack={() => router.replace("/(tabs)/home")} />

      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="#97A3B7" style={{ marginRight: 10 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          placeholderTextColor="#97A3B7"
          style={styles.searchInput}
        />
      </View>

      {loadingVenues ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.royal} />
        </View>
      ) : (
        <View style={styles.courtGrid}>
          {filteredVenues.map((venue, index) => {
            const imageSource = venue.picture
              ? { uri: `${EVENT_IMAGES_BASE}${venue.picture}` }
              : require("../../assets/images/icon.png");

            return (
              <Animated.View
                key={venue.id}
                style={[
                  styles.courtCardWrap,
                  {
                    opacity: venueListAnim.interpolate({
                      inputRange: [0, index * 0.12, index * 0.12 + 0.35, 1],
                      outputRange: [0, 0, 1, 1],
                      extrapolate: "clamp",
                    }),
                    transform: [
                      {
                        translateY: venueListAnim.interpolate({
                          inputRange: [0, index * 0.12, index * 0.12 + 0.35, 1],
                          outputRange: [18, 18, 0, 0],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable style={styles.courtCard} onPress={() => handleSelectVenue(venue)}>
                  <ImageBackground source={imageSource} style={styles.courtImage} imageStyle={styles.courtImageStyle} />
                  <View style={styles.courtInfo}>
                    <Text style={styles.courtName} numberOfLines={1}>
                      {venue.name}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      {openingVenue ? (
        <View style={styles.openingOverlay} pointerEvents="none">
          <View style={styles.loadingBox}>
            <View style={styles.openingDotsRow}>
              {[0, 1, 2].map((index) => (
                <Animated.View key={index} style={[styles.openingDot, getLoaderDotStyle(index)]} />
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );

  const renderVenueDetail = () => {
    const selectedDateLabel = formatDateLabel(selectedDate);
    const heroImage = selectedVenue?.picture
      ? { uri: `${EVENT_IMAGES_BASE}${selectedVenue.picture}` }
      : require("../../assets/images/icon.png");
    const canBook = Boolean(selectedDate && selectedDuration && selectedSlot && selectedSlot.available);

    return (
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.detailContent, { paddingBottom: tabBarHeight + 36 }]}
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground source={heroImage} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
            <View style={[styles.heroOverlay, { paddingTop: insets.top + 14 }]}>
              <View style={styles.heroTop}>
                <Pressable style={styles.heroRoundBtn} onPress={() => setSelectedVenue(null)}>
                  <MaterialIcons name="arrow-back" size={28} color={palette.ink} />
                </Pressable>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.detailCard}>
            <Text style={styles.courtMainTitle}>{selectedVenue.name}</Text>

            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="calendar-month" size={16} color={palette.royal} />
              </View>
              <Text style={styles.sectionHeadingSimple}>Select Date</Text>
            </View>

            <View>
              <View style={styles.monthBar}>
                <Pressable style={styles.monthNavBtn} onPress={() => handleMonthChange(-1)}>
                  <MaterialIcons name="chevron-left" size={20} color={palette.ink} />
                </Pressable>
                <Text style={styles.monthTitle}>{monthTitle}</Text>
                <Pressable style={styles.monthNavBtn} onPress={() => handleMonthChange(1)}>
                  <MaterialIcons name="chevron-right" size={20} color={palette.ink} />
                </Pressable>
              </View>

              <View style={styles.dateSliderWrap}>
                <ScrollView
                  ref={dateScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateRow}
                >
                  {dateOptions.map((date, index) => {
                    const item = formatDateLabel(date);
                    const active = formatDateKey(date) === formatDateKey(selectedDate);
                    const disabled = isPastDate(date);

                    return (
                      <Pressable
                        key={formatDateKey(date)}
                        style={[
                          styles.dateChip,
                          index < dateOptions.length - 1 && styles.dateChipSpaced,
                          active && styles.dateChipActive,
                          disabled && styles.dateChipDisabled,
                        ]}
                        disabled={disabled}
                        onPress={() => setSelectedDate(startOfDay(date))}
                      >
                        <Text style={[styles.dateMonth, active && styles.dateMonthActive, disabled && styles.dateTextDisabled]}>
                          {item.month}
                        </Text>
                        <Text style={[styles.dateDay, active && styles.dateDayActive, disabled && styles.dateTextDisabled]}>
                          {item.day}
                        </Text>
                        <Text style={[styles.dateWeek, active && styles.dateWeekActive, disabled && styles.dateTextDisabled]}>
                          {item.week}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {switchingMonth ? (
                  <View style={styles.monthLoadingOverlay} pointerEvents="none">
                    <View style={styles.loadingBox}>
                      <View style={styles.monthDotsRow}>
                        {[0, 1, 2].map((index) => (
                          <Animated.View key={index} style={[styles.monthDot, getLoaderDotStyle(index)]} />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="hourglass-bottom" size={16} color={palette.royal} />
              </View>
              <Text style={styles.sectionHeadingSimple}>Duration</Text>
            </View>

            <View style={styles.durationGrid}>
              {durations.map((duration) => {
                const active = selectedDuration === duration;
                return (
                  <Pressable
                    key={duration}
                    style={[styles.durationCard, active && styles.durationCardActive]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text style={[styles.durationText, active && styles.durationTextActive]}>
                      {formatDurationLabel(duration)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.sectionHeadingRow, styles.slotsHeading]}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="access-time" size={16} color={palette.royal} />
              </View>
              <Text style={styles.sectionHeadingSimple}>Slots</Text>
            </View>

            {loadingBookings ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={palette.royal} />
              </View>
            ) : (
              <View style={styles.slotGrid}>
                {slotItems.map((slot) => {
                  const active = selectedSlot?.key === slot.key;
                  return (
                    <Pressable
                      key={slot.key}
                      style={[
                        styles.slotCard,
                        active && styles.slotCardActive,
                        !slot.available && styles.slotCardDisabled,
                      ]}
                      onPress={() => slot.available && setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          active && styles.slotTextActive,
                          !slot.available && styles.slotTextDisabled,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.selectionWrap}>
              <Text style={styles.selectionLabel}>Selected Slot</Text>
              <Text style={[styles.selectionValue, !canBook && styles.selectionValueMuted]}>
                {canBook
                  ? `${selectedDateLabel.day} ${selectedDateLabel.month} - ${selectedSlot.fullLabel ?? selectedSlot.label}`
                  : "Choose a date, duration, and available slot"}
              </Text>

              {canBook ? (
                <Pressable
                  style={[styles.bookNowInlineBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleBookNow}
                  disabled={submitting}
                >
                  <Text style={styles.bookNowText}>{submitting ? "Booking..." : "Book Now"}</Text>
                </Pressable>
              ) : (
                <View style={styles.bookNowPlaceholder} />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  return <SafeAreaView style={styles.safe}>{selectedVenue ? renderVenueDetail() : renderVenueList()}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  listTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backStub: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: palette.card,
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
    fontFamily: "Poppins_500Medium",
  },
  tipBanner: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tipTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
  },
  loaderWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  courtGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  courtCardWrap: {
    width: "48%",
  },
  courtCard: {
    width: "100%",
    backgroundColor: palette.card,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  courtImage: {
    width: "100%",
    height: 124,
  },
  courtImageStyle: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  courtInfo: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  courtName: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
  detailContent: {
    paddingBottom: 36,
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245,247,252,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    minWidth: 120,
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "#DCE4F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  openingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  openingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: palette.royal,
  },
  heroImage: {
    height: 250,
  },
  heroImageStyle: {
    width: "100%",
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: "rgba(7,16,35,0.18)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  heroRoundBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    marginTop: -20,
    backgroundColor: palette.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 24,
  },
  courtMainTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  sectionHeadingRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingSimple: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  dateRow: {
    marginTop: 12,
    paddingRight: 18,
  },
  dateSliderWrap: {
    position: "relative",
  },
  monthLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245,247,252,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthDotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: palette.royal,
  },
  monthBar: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  dateChip: {
    width: 66,
    height: 74,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipSpaced: {
    marginRight: 10,
  },
  dateChipActive: {
    backgroundColor: palette.royal,
    borderColor: palette.royal,
  },
  dateChipDisabled: {
    backgroundColor: "#ECEFF5",
    borderColor: "#D8E0EC",
  },
  dateMonth: {
    color: "#9AA7BC",
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  dateMonthActive: {
    color: "rgba(255,255,255,0.88)",
  },
  dateDay: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    marginTop: 1,
  },
  dateDayActive: {
    color: "#FFFFFF",
  },
  dateWeek: {
    color: "#9AA7BC",
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    marginTop: 2,
  },
  dateWeekActive: {
    color: "rgba(255,255,255,0.88)",
  },
  dateTextDisabled: {
    color: "#9DA6B5",
  },
  durationGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationCard: {
    width: "22%",
    height: 32,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  durationCardActive: {
    backgroundColor: palette.royal,
    borderColor: palette.royal,
  },
  durationText: {
    color: "#64748B",
    fontSize: 12.5,
    fontFamily: "Poppins_500Medium",
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  slotsHeading: {
    marginTop: 22,
  },
  slotGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  slotCard: {
    width: "18%",
    height: 32,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  slotCardActive: {
    backgroundColor: palette.royal,
    borderColor: palette.royal,
  },
  slotCardDisabled: {
    backgroundColor: "#ECEFF5",
  },
  slotText: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  slotTextActive: {
    color: "#FFFFFF",
  },
  slotTextDisabled: {
    color: "#9DA6B5",
  },
  selectionWrap: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    minHeight: 130,
  },
  selectionLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  selectionValue: {
    color: "#0B0F19",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    marginTop: 6,
  },
  selectionValueMuted: {
    color: "#7C889D",
    fontSize: 12.5,
    fontFamily: "Poppins_500Medium",
  },
  bookNowInlineBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 14,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowPlaceholder: {
    marginTop: 14,
    height: 54,
  },
  bookNowText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
});
