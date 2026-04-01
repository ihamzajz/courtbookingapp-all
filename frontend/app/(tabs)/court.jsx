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
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";

import TopHeaderBox from "../../components/TopHeaderBox";
import { API_BASE, COURT_IMAGES_BASE } from "../../src/config/api";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { clearStoredUser, getStoredUser } from "../../src/utils/auth";
import { buildUploadAssetUrl } from "../../src/utils/media";

const palette = {
  bg: "#F5F7FC",
  card: "#FFFFFF",
  ink: "#13233F",
  muted: "#707D93",
  line: "#DEE5F0",
  navy: "#2B2D42",
  royal: "#2B2D42",
};

const buildCourtImageUrl = (picture) => buildUploadAssetUrl(COURT_IMAGES_BASE, picture, "courts");

const durations = [30, 60, 90, 120, 150, 180, 210, 240];
const MAX_BOOKING_PLAYERS = 4;
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
const createPlayerSummary = (user) =>
  user?.id && user?.name
    ? { id: user.id, name: user.name, cm_no: user.cm_no || "", fees_status: user.fees_status || "paid" }
    : null;
const formatPlayerLine = (player) =>
  `${player?.name || "User"}${player?.cm_no ? `  •  CM: ${player.cm_no}` : ""}`;

export default function CourtBooking() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerError, setPlayerError] = useState(null);
  const [courts, setCourts] = useState([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(startOfDay(new Date())));
  const [openingCourt, setOpeningCourt] = useState(false);
  const [switchingMonth, setSwitchingMonth] = useState(false);
  const openingTimeoutRef = useRef(null);
  const monthTimeoutRef = useRef(null);
  const dateScrollRef = useRef(null);
  const loaderPhase = useRef(new Animated.Value(0)).current;
  const courtListAnim = useRef(new Animated.Value(0)).current;

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
      const selfPlayer = createPlayerSummary(user);
      setToken(user.token);
      setCurrentUser(user);
      setSelectedPlayers(selfPlayer ? [selfPlayer] : []);
    };
    loadToken();
  }, []);

  const loadPlayers = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingPlayers(true);
      const res = await axios.get(`${API_BASE}/users/booking-options`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const nextPlayers = Array.isArray(res.data) ? res.data : [];
      setPlayers(nextPlayers);

      if (currentUser?.id) {
        const liveCurrentUser = nextPlayers.find((player) => player.id === currentUser.id);

        if (liveCurrentUser) {
          setCurrentUser((prev) => ({ ...(prev || {}), ...liveCurrentUser }));
          setSelectedPlayers((prev) =>
            prev.map((player) =>
              player.id === liveCurrentUser.id
                ? { ...player, ...liveCurrentUser }
                : player
            )
          );
        }
      }
    } catch {
      setPlayers([]);
      setPlayerError({
        title: "Players Unavailable",
        message: "We could not load players right now. Please try again.",
      });
    } finally {
      setLoadingPlayers(false);
    }
  }, [currentUser?.id, token]);

  const loadCourts = useCallback(async () => {
    try {
      setLoadingCourts(true);
      const res = await axios.get(`${API_BASE}/courts`);
      setCourts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPlayerError({
        title: "Courts Unavailable",
        message: "We could not load courts right now. Please try again.",
      });
    } finally {
      setLoadingCourts(false);
    }
  }, []);

  useLiveRefresh(loadCourts, { intervalMs: 90000 });
  useLiveRefresh(loadPlayers, { enabled: Boolean(token), intervalMs: 90000 });
  useRealtimeSubscription("courts:updated", loadCourts);
  useRealtimeSubscription("users:updated", loadPlayers, Boolean(token));

  const loadBookings = useCallback(async () => {
    if (!token || !selectedCourt) return;

    try {
      setLoadingBookings(true);
      const res = await axios.get(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          courtId: selectedCourt.id,
          date: formatDateKey(selectedDate),
        },
      });
      const nextBookings = Array.isArray(res.data)
        ? res.data.filter((booking) => isActiveBookingStatus(booking.booking_status))
        : [];
      setBookings(nextBookings);
    } catch {
      setBookings([]);
      setPlayerError({
        title: "Slots Unavailable",
        message: "We could not load slots for this date. Please try again.",
      });
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedCourt, selectedDate, token]);

  useLiveRefresh(loadBookings, {
    enabled: Boolean(token && selectedCourt),
    intervalMs: 45000,
  });
  useRealtimeSubscription("bookings:updated", loadBookings, Boolean(token && selectedCourt));

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
      courtListAnim.stopAnimation();
      courtListAnim.setValue(0);

      const animation = Animated.timing(courtListAnim, {
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
    }, [courtListAnim])
  );


  useEffect(() => {
    return () => {
      if (openingTimeoutRef.current) {
        clearTimeout(openingTimeoutRef.current);
      }
      if (monthTimeoutRef.current) {
        clearTimeout(monthTimeoutRef.current);
      }
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

  const filteredCourts = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return courts;
    return courts.filter((court) => court.name?.toLowerCase().includes(value));
  }, [courts, search]);

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

  const handleSelectCourt = (court) => {
    const today = startOfDay(new Date());
    if (openingTimeoutRef.current) {
      clearTimeout(openingTimeoutRef.current);
    }

    setOpeningCourt(true);

    openingTimeoutRef.current = setTimeout(() => {
      setSelectedCourt(court);
      setSelectedDate(today);
      setVisibleMonth(startOfMonth(today));
      setSelectedDuration(30);
      setSelectedSlot(null);
      const selfPlayer = createPlayerSummary(currentUser);
      setSelectedPlayers(selfPlayer ? [selfPlayer] : []);
      setOpeningCourt(false);
      openingTimeoutRef.current = null;
    }, 120);
  };

  const handleMonthChange = (months) => {
    const nextMonth = startOfMonth(addMonths(visibleMonth, months));
    const today = startOfDay(new Date());

    if (monthTimeoutRef.current) {
      clearTimeout(monthTimeoutRef.current);
    }

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
    if (!selectedCourt || !selectedSlot || !selectedSlot.available) {
      setPlayerError({
        title: "Select Slot",
        message: "Please choose an available slot before booking.",
      });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/bookings`,
        {
          courtId: selectedCourt.id,
          bookingDate: formatDateKey(selectedDate),
          startTime: timeValue(selectedSlot.start),
          endTime: timeValue(selectedSlot.end),
          playerIds: selectedPlayers.map((player) => player.id),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPlayerError({
        title: "Booking Created",
        message: "Your court booking has been created successfully.",
        success: true,
      });
      setSelectedSlot(null);
      const selfPlayer = createPlayerSummary(currentUser);
      setSelectedPlayers(selfPlayer ? [selfPlayer] : []);
      loadBookings();
    } catch (error) {
      if (error.response?.status === 409) {
        setPlayerError({
          title: "Unavailable",
          message: "This slot is no longer available.",
        });
      } else if (error.response?.data?.message) {
        setPlayerError({
          title: "Booking Failed",
          message: error.response.data.message,
        });
      } else {
        setPlayerError({
          title: "Booking Failed",
          message: "Failed to create booking.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlayer = (player) => {
    if (player.id === currentUser?.id) return;

    if (String(player.fees_status || "paid").toLowerCase() === "defaulter") {
      setPlayerError({
        title: `${player.name} Cannot Be Added`,
        message: "This user is a defaulter. Please select another user.",
      });
      return;
    }

    const exists = selectedPlayers.some((item) => item.id === player.id);
    if (exists) {
      setSelectedPlayers((prev) => prev.filter((item) => item.id !== player.id));
      return;
    }

    if (selectedPlayers.length >= MAX_BOOKING_PLAYERS) {
      setPlayerError({
        title: "Limit Reached",
        message: "Booking can have maximum 4 players including you.",
      });
      return;
    }

    setSelectedPlayers((prev) => [...prev, player]);
  };

  const selectablePlayers = players.filter(
    (player) =>
      !selectedPlayers.some((selected) => selected.id === player.id) &&
      [player.name, player.cm_no]
        .some((field) => String(field || "").toLowerCase().includes(playerSearch.trim().toLowerCase()))
  );

  const removePlayer = (playerId) => {
    if (playerId === currentUser?.id) return;
    setSelectedPlayers((prev) => prev.filter((player) => player.id !== playerId));
  };

  const renderCourtList = () => (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <TopHeaderBox title="Court Booking" onBack={() => router.replace("/(tabs)/home")} />

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

      {loadingCourts ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.royal} />
        </View>
      ) : (
        <View style={styles.courtGrid}>
          {filteredCourts.map((court, index) => {
            const imageSource = court.picture
              ? { uri: buildCourtImageUrl(court.picture) }
              : require("../../assets/images/icon.png");

            return (
              <Animated.View
                key={court.id}
                style={[
                  styles.courtCardWrap,
                  {
                    opacity: courtListAnim.interpolate({
                      inputRange: [0, index * 0.12, index * 0.12 + 0.35, 1],
                      outputRange: [0, 0, 1, 1],
                      extrapolate: "clamp",
                    }),
                    transform: [
                      {
                        translateY: courtListAnim.interpolate({
                          inputRange: [0, index * 0.12, index * 0.12 + 0.35, 1],
                          outputRange: [18, 18, 0, 0],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable style={styles.courtCard} onPress={() => handleSelectCourt(court)}>
                  <ImageBackground source={imageSource} style={styles.courtImage} imageStyle={styles.courtImageStyle} />
                  <View style={styles.courtInfo}>
                    <Text style={styles.courtName} numberOfLines={1}>
                      {court.name}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      {openingCourt ? (
        <View style={styles.openingOverlay} pointerEvents="none">
          <View style={styles.loadingBox}>
            <View style={styles.openingDotsRow}>
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[styles.openingDot, getLoaderDotStyle(index)]}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}

    </ScrollView>
  );

  const renderCourtDetail = () => {
    const selectedDateLabel = formatDateLabel(selectedDate);
    const heroImage = selectedCourt?.picture
      ? { uri: buildCourtImageUrl(selectedCourt.picture) }
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
                <Pressable style={styles.heroRoundBtn} onPress={() => setSelectedCourt(null)}>
                  <MaterialIcons name="arrow-back" size={28} color={palette.ink} />
                </Pressable>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.detailCard}>
            <Text style={styles.courtMainTitle}>{selectedCourt.name}</Text>

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
                const isLast = index === dateOptions.length - 1;

                return (
                  <Pressable
                    key={formatDateKey(date)}
                    style={[
                      styles.dateChip,
                      !isLast && styles.dateChipSpaced,
                      active && styles.dateChipActive,
                      disabled && styles.dateChipDisabled,
                    ]}
                    onPress={() => !disabled && setSelectedDate(date)}
        >
                    <Text
                      style={[
                        styles.dateMonth,
                        active && styles.dateMonthActive,
                        disabled && styles.dateTextDisabled,
                      ]}
                    >
                      {item.month}
                    </Text>
                    <Text
                      style={[
                        styles.dateDay,
                        active && styles.dateDayActive,
                        disabled && styles.dateTextDisabled,
                      ]}
                    >
                      {item.day}
                    </Text>
                    <Text
                      style={[
                        styles.dateWeek,
                        active && styles.dateWeekActive,
                        disabled && styles.dateTextDisabled,
                      ]}
                    >
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
                        <Animated.View
                          key={index}
                          style={[styles.monthDot, getLoaderDotStyle(index)]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
            </View>

            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="schedule" size={16} color={palette.royal} />
              </View>
              <Text style={styles.sectionHeadingSimple}>Duration</Text>
            </View>
            <View style={styles.durationGrid}>
              {durations.map((duration) => {
                const active = duration === selectedDuration;
                return (
                  <Pressable
                    key={duration}
                    style={[styles.durationCard, active && styles.durationCardActive]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text style={[styles.durationText, active && styles.durationTextActive]}>
                      {duration} min
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

            <View style={[styles.sectionHeadingRow, styles.playersHeading]}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="groups" size={16} color={palette.royal} />
              </View>
              <Text style={styles.sectionHeadingSimple}>Players</Text>
            </View>

            <View style={styles.playersCard}>
              <View style={styles.playersListWrap}>
                {selectedPlayers.map((player, index) => (
                  <View key={player.id} style={styles.selectedPlayerItem}>
                    <View style={styles.playerListRow}>
                      <Text style={styles.playerListRowText}>
                        {index + 1}. {formatPlayerLine(player)}
                      </Text>

                      {index === 0 ? (
                        <View style={styles.playerListLock}>
                          <MaterialIcons name="person" size={16} color={palette.royal} />
                        </View>
                      ) : (
                        <Pressable
                          style={styles.playerListRemove}
                          onPress={() => removePlayer(player.id)}
                        >
                          <MaterialIcons name="close" size={16} color="#FFFFFF" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.addPlayerBtn,
                  selectedPlayers.length >= MAX_BOOKING_PLAYERS && styles.addPlayerBtnDisabled,
                ]}
                onPress={() => {
                  if (selectedPlayers.length >= MAX_BOOKING_PLAYERS) {
                    setPlayerError({
                      title: "Limit Reached",
                      message: "Booking can have maximum 4 players including you.",
                    });
                    return;
                  }
                  setPlayerSearch("");
                  setPlayerModalVisible(true);
                }}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addPlayerBtnText}>Add Player</Text>
              </Pressable>
            </View>

              <View style={styles.selectionWrap}>
                <Text style={styles.selectionLabel}>Selected Slot</Text>
                <Text style={[styles.selectionValue, !canBook && styles.selectionValueMuted]}>
                  {canBook
                    ? `${selectedDateLabel.day} ${selectedDateLabel.month} • ${selectedSlot.fullLabel ?? selectedSlot.label}`
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

        <Modal visible={playerModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.playerModalCard}>
              <View style={styles.playerModalHeader}>
                <Text style={styles.playerModalTitle}>Add Players</Text>
                <Pressable onPress={() => setPlayerModalVisible(false)} style={styles.playerModalClose}>
                  <MaterialIcons name="close" size={18} color={palette.ink} />
                </Pressable>
              </View>

              <View style={styles.playerSearchBar}>
                <MaterialIcons name="search" size={18} color="#97A3B7" />
                <TextInput
                  value={playerSearch}
                  onChangeText={setPlayerSearch}
                  placeholder="Search users"
                  placeholderTextColor="#97A3B7"
                  style={styles.playerSearchInput}
                />
              </View>

              {loadingPlayers ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator color={palette.royal} />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.playerListScroll}>
                  {selectablePlayers.length ? (
                    selectablePlayers.map((player) => (
                      <Pressable
                        key={player.id}
                        style={styles.playerListItem}
                        onPress={() => {
                          togglePlayer(player);
                          setPlayerSearch("");
                          setPlayerModalVisible(false);
                        }}
                      >
                        <View style={styles.playerListItemCopy}>
                          <Text style={styles.playerListItemText} numberOfLines={1}>
                            {player.name}
                            {player.cm_no ? (
                              <Text style={styles.playerListItemCmBadge}>{`  CM: ${player.cm_no}`}</Text>
                            ) : null}
                          </Text>
                        </View>
                        <View style={styles.playerListAddIcon}>
                          <MaterialIcons name="add" size={16} color="#FFFFFF" />
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.noPlayersText}>No more users available to add.</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(playerError)} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noticeCard}>
              <View style={styles.noticeIconWrap}>
                <MaterialIcons
                  name={playerError?.success ? "check-circle" : "error-outline"}
                  size={22}
                  color={playerError?.success ? "#198754" : "#D64D4D"}
                />
              </View>
              <Text style={styles.noticeTitle}>{playerError?.title}</Text>
              <Text style={styles.noticeText}>{playerError?.message}</Text>
              <Pressable style={styles.noticeBtn} onPress={() => setPlayerError(null)}>
                <Text style={styles.noticeBtnText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  };

  return <SafeAreaView style={styles.safe}>{selectedCourt ? renderCourtDetail() : renderCourtList()}</SafeAreaView>;
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
  playersHeading: {
    marginTop: 22,
  },
  slotGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  playersCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  availablePlayersWrap: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playersListWrap: {
    marginTop: 2,
  },
  selectedPlayerItem: {
    width: "100%",
    marginBottom: 8,
  },
  playerListRow: {
    alignItems: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.line,
    minHeight: 42,
    justifyContent: "center",
  },
  playerListRowText: {
    color: palette.ink,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    paddingRight: 36,
    flexShrink: 1,
    lineHeight: 18,
  },
  playerListRowMeta: {
    marginTop: 2,
    color: palette.muted,
    fontSize: 10.5,
    fontFamily: "Poppins_500Medium",
    paddingRight: 36,
  },
  playerListRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC3545",
    alignItems: "center",
    justifyContent: "center",
  },
  playerListLock: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addPlayerBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: palette.royal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPlayerBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  addPlayerBtnDisabled: {
    opacity: 0.65,
  },
  playerModalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
  },
  playerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  playerModalTitle: {
    color: palette.ink,
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },
  playerModalClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  playerSearchBar: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  playerSearchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    marginLeft: 8,
    paddingVertical: 0,
  },
  playerListScroll: {
    maxHeight: 360,
  },
  playerListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  playerListItemCopy: {
    flex: 1,
    paddingRight: 12,
  },
  playerListItemText: {
    color: "#4B5563",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  playerListItemCmBadge: {
    color: "#8A6300",
    backgroundColor: "#FFF1BF",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  playerListAddIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#198754",
    alignItems: "center",
    justifyContent: "center",
  },
  noPlayersText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  noticeCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5ECF6",
  },
  noticeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitle: {
    marginTop: 14,
    color: palette.ink,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  noticeText: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  noticeBtn: {
    marginTop: 18,
    minWidth: 110,
    height: 42,
    borderRadius: 12,
    backgroundColor: palette.royal,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
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
