import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  ImageBackground,
  Animated,
  Easing,
  AppState,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { AdminRaceScreen } from "./onecore/AdminRaceScreen";
import { ArtistInviteScreen } from "./onecore/ArtistInviteScreen";
import { DemandScoutScreen } from "./onecore/DemandScoutScreen";
import { OnecoreRaceCard } from "./onecore/OnecoreRaceCard";
import { RaceProposalScreen } from "./onecore/RaceProposalScreen";
import {
  applyRaceStatusChange,
  artistById,
  backerCount,
  commitCore,
  createRaceFromDraft,
  createScoutCampaign,
  getPublicFoundingFans,
  handoffScoutToAdmin,
  inviteVenuesForRace,
  refundPolicyById,
  sendArtistPrivateInvite,
  submitArtistInvite,
  updateRaceDraft,
  updateRaceOperations,
} from "./onecore/logic";
import { seedOnecoreState } from "./onecore/seed";
import type { OnecoreState, Race, RaceDraft, RaceStatus } from "./onecore/types";
import { BattleArtistSocialProof, openArtistSocialUrl } from "./components/BattleArtistSocialProof";
import {
  BattleProofPitchFields,
  buildBattleProofPitchValue,
  validateBattleProofPitch,
} from "./components/BattleProofPitchFields";
import {
  enrichCompetingArtist,
  formatSocialProofSummary,
  listSocialLinks,
  type ArtistSocialProof,
  type SocialLinkItem,
  type SocialPlatform,
} from "./lib/artistSocial";

const HERO_BG_VIDEO = require("./assets/hero-bg.mp4");

// ——— Design tokens ———
const C = {
  bg: "#08111f",
  surface: "#101a2d",
  card: "#172033",
  border: "#263247",
  accent: "#22c55e",
  accentSoft: "#86efac",
  gold: "#fbbf24",
  rival: "#f472b6",
  text: "#ffffff",
  muted: "#94a3b8",
  dim: "#64748b",
  ink: "#06111f",
};

const SPACE = { xs: 8, sm: 12, md: 20, lg: 28, xl: 36 };
const BACKING_PRICE = "3만원";
const FANSTAGE_TAGLINE = "팬스테이지는 팬이 무대를 현실로 만드는 곳입니다.";
const FANSTAGE_HERO_MAIN = "팬이 모이면, 무대가 열린다";
const FANSTAGE_HERO_SUB =
  "한 공연장, 한 번의 선택. 가장 많은 지지를 받은 팀이 실제 무대에 오릅니다.";
const ONECORE_TAGLINE_SHORT = "100명의 코어가 모이면, 한 팀의 밤이 공연 준비 단계로 넘어갑니다.";
const ONECORE_RACE_LEAD = "지금 무대에 가장 가까운 팀";
const ONECORE_RACE_FINISH = "100코어를 먼저 채운 한 팀이 단독 공연 준비 단계로 넘어갑니다.";
const ONECORE_LINEUP_TITLE = "누가 이 밤의 주인공이 될까요?";
const ONECORE_RULE_SUMMARY = "100코어를 먼저 채운 한 팀이 공연 준비 단계로 넘어갑니다. 실패 시 전액 환불.";
const ONECORE_SOLO_CORE_GOAL = 100;
const ONECORE_ALMOST_THERE_REMAINING = 35;

function getVenueLeader(venue: VenueCompetition) {
  return sortedArtists(venue)[0];
}

function getVenueOnecoreLeaderStats(venue: VenueCompetition) {
  const leader = getVenueLeader(venue);
  const cores = leader.supporters;
  const toGo = Math.max(0, ONECORE_SOLO_CORE_GOAL - cores);
  return { leader, cores, toGo };
}

/** Venues 탭: 아직 100코어를 향해 가는 무대만 */
function isVenueOnecoreInProgress(venue: VenueCompetition) {
  if (venue.winnerId) return false;
  const { cores } = getVenueOnecoreLeaderStats(venue);
  return cores < ONECORE_SOLO_CORE_GOAL;
}

function getVenueDiscoverBadge(venue: VenueCompetition) {
  if (!isVenueOnecoreInProgress(venue)) return "성사 완료";
  const { toGo } = getVenueOnecoreLeaderStats(venue);
  return toGo <= ONECORE_ALMOST_THERE_REMAINING ? "성사 임박" : "모집 중";
}

function venueOnecoreProgressLine(venue: VenueCompetition) {
  const { leader, toGo } = getVenueOnecoreLeaderStats(venue);
  if (toGo > 0) return `${toGo}명만 더 모이면 ${leader.name} 단독 공연이 열립니다`;
  return `${leader.name} 단독 공연 확정 조건 달성`;
}

function buildTicketWalletEntries(
  venues: VenueCompetition[],
  venueBackings: Record<string, string>,
  wonTickets: Ticket[]
) {
  const converting: { id: string; venue: VenueCompetition; artist: CompetingArtist }[] = [];
  const ready: Ticket[] = [];
  const past: Ticket[] = [];

  for (const ticket of wonTickets) {
    const venue = venues.find((v) => v.id === ticket.venueId || v.venueName === ticket.venue);
    if (venue && countdownEnded(venue.countdown)) past.push(ticket);
    else ready.push(ticket);
  }

  for (const [venueId, pickId] of Object.entries(venueBackings)) {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue || isVenueOnecoreInProgress(venue)) continue;
    const artist = venue.artists.find((a) => a.id === pickId);
    if (!artist) continue;
    if (venue.winnerId && venue.winnerId !== pickId) continue;
    if (findVenueEntryTicket(venue, pickId, wonTickets)) continue;
    converting.push({ id: `conv-${venueId}-${pickId}`, venue, artist });
  }

  return { converting, ready, past };
}

const SCREEN_OVERLAY = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 100,
  backgroundColor: C.bg,
  flex: 1,
};

const ROLE = {
  fan: { primary: "#22c55e", soft: "#86efac", bg: "#14532d", border: "#22c55e66", label: "Fan" },
  artist: { primary: "#a855f7", soft: "#d8b4fe", bg: "#3b0764", border: "#a855f766", label: "Artist" },
  venue: { primary: "#f59e0b", soft: "#fcd34d", bg: "#422006", border: "#f59e0b66", label: "Venue" },
  curator: { primary: "#3b82f6", soft: "#93c5fd", bg: "#1e3a5f", border: "#3b82f666", label: "Curator" },
};

const FAN_LEVELS = [
  { min: 0, title: "Newcomer", color: ROLE.fan.soft },
  { min: 100, title: "Scene Scout", color: ROLE.fan.primary },
  { min: 250, title: "Tastemaker", color: ROLE.fan.primary },
  { min: 500, title: "Night Curator", color: ROLE.fan.primary },
  { min: 800, title: "Venue Oracle", color: ROLE.fan.primary },
];

type ArtistApprovalStatus = "not_applied" | "pending" | "approved";
type ProfileMode = "fan" | "artist";

function getFanLevel(rep: number) {
  return [...FAN_LEVELS].reverse().find((l) => rep >= l.min) ?? FAN_LEVELS[0];
}

function artistStatusLabel(status: ArtistApprovalStatus) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending review";
  return "Not applied";
}

function artistStatusColor(status: ArtistApprovalStatus) {
  if (status === "approved") return ROLE.artist.primary;
  if (status === "pending") return ROLE.venue.primary;
  return C.dim;
}

type Tab = "discover" | "tickets" | "profile";
type Overlay =
  | null
  | "venueDetail"
  | "artistDetail"
  | "backingFlow"
  | "backingConfirmation"
  | "ticketQr"
  | "curatorTools"
  | "venueAdmin"
  | "inviteArtist"
  | "applyBattle"
  | "raceProposal"
  | "adminRace"
  | "artistInvite";
type BackingStep = "review" | "confirmed";
type VenueMomentum = "Heating up" | "Almost unlocked" | "Slot won";
type DistrictFilter = "전체" | "홍대" | "마포" | "이태원" | "성수";
type SlotGenre = "Indie" | "Electronic" | "Hip-hop" | "Jazz";
type GenreFilter = "All" | SlotGenre;
type StatusFilter = "All" | VenueMomentum;

type CompetingArtist = {
  id: string;
  name: string;
  genre: string;
  supporters: number;
  tagline: string;
  battlePitch: string;
  social: ArtistSocialProof;
  story: string;
  latestTrack: { title: string; duration: string };
};

type VenueCompetition = {
  id: string;
  venueName: string;
  district: string;
  address: string;
  capacity: number;
  slotLabel: string;
  slotDate: string;
  bookingCloseDate: string;
  bookingCloseTime: string;
  countdown: { days: number; hours: number; minutes: number };
  minGoal: number;
  slotGenre: SlotGenre;
  slotsOpen: number;
  artists: CompetingArtist[];
  winnerId?: string;
};

const DISTRICT_CHIPS: DistrictFilter[] = ["홍대", "마포", "이태원", "성수"];

function genreKo(genre: SlotGenre) {
  if (genre === "Electronic") return "일렉트로닉";
  if (genre === "Hip-hop") return "힙합";
  if (genre === "Jazz") return "재즈";
  return "인디";
}

const GENRE_THEME: Record<
  SlotGenre,
  { primary: string; soft: string; bg: string; border: string; wash: string }
> = {
  Indie: { primary: "#4ade80", soft: "#bbf7d0", bg: "#14532d", border: "#4ade8099", wash: "#14532d66" },
  Electronic: { primary: "#f472b6", soft: "#fbcfe8", bg: "#831843", border: "#f472b699", wash: "#83184366" },
  "Hip-hop": { primary: "#fb923c", soft: "#fed7aa", bg: "#7c2d12", border: "#fb923c99", wash: "#7c2d1266" },
  Jazz: { primary: "#38bdf8", soft: "#bae6fd", bg: "#0c4a6e", border: "#38bdf899", wash: "#0c4a6e66" },
};

function genreTheme(genre: SlotGenre) {
  return GENRE_THEME[genre];
}

function momentumKo(m: VenueMomentum) {
  if (m === "Slot won") return "예매 확정";
  if (m === "Almost unlocked") return "확정 임박";
  return "성사 진행 중";
}

function districtFeedLabel(district: DistrictFilter) {
  if (district === "전체") return "서울";
  return `서울 ${district}`;
}

function formatShowSchedule(venue: VenueCompetition) {
  const time = parseShowTime(venue.slotLabel);
  const date = venue.slotDate.replace("(", " ").replace(")", "").trim();
  return time ? `${date} · ${time}` : date;
}

function parseWeekdayFromSlotDate(slotDate: string) {
  const m = slotDate.match(/\((.)\)/);
  return m ? m[1] : "";
}

function parseShortDate(slotDate: string) {
  const m = slotDate.match(/(\d+)월\s*(\d+)일/);
  if (m) return `${m[1]}.${m[2]}`;
  return slotDate;
}

function parseLongDate(slotDate: string) {
  const wd = parseWeekdayFromSlotDate(slotDate);
  const base = slotDate.replace(/\s*\(.+\)\s*/, "").trim();
  return wd ? `${base} ${wd}` : base;
}

function parseShowTime(slotLabel: string) {
  if (slotLabel.includes("·")) return slotLabel.split("·").pop()?.trim() ?? slotLabel;
  return slotLabel;
}

function formatCountdownUntil(c: VenueCompetition["countdown"]) {
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "마감됨";
  const parts: string[] = [];
  if (c.days > 0) parts.push(`${c.days}일`);
  if (c.hours > 0) parts.push(`${c.hours}시간`);
  if (c.minutes > 0 && c.days === 0) parts.push(`${c.minutes}분`);
  return `마감까지 ${parts.join(" ")}`;
}

function formatCountdownShort(c: VenueCompetition["countdown"]) {
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "마감됨";
  if (c.days > 0) return `${c.days}일 남음`;
  if (c.hours > 0) return `${c.hours}시간 남음`;
  return `${c.minutes}분 남음`;
}

function venueDemandMetric(total: number, minGoal: number, capacity: number, phase: VenueDemandPhase) {
  if (phase === "pre_min") return `${total} / ${minGoal}명 · 최소 성사`;
  if (phase === "sold_out") return `${capacity} / ${capacity}명`;
  return `${total} / ${capacity}명 · 최소 ${minGoal} 돌파`;
}

function venueDemandSubline(phase: VenueDemandPhase, toMin: number, remaining: number) {
  if (phase === "pre_min") return `성사까지 ${toMin}명 남았어요`;
  if (phase === "sold_out") return "";
  if (phase === "near_capacity") return `확정 완료 · 잔여 ${remaining}석`;
  return `공연 확정 · 잔여 ${remaining}석`;
}

function venueExploreBadge(phase: VenueDemandPhase) {
  if (phase === "sold_out") return "매진";
  if (phase === "winner") return "예매 확정";
  if (phase === "near_capacity") return "확정 완료";
  if (phase === "confirmed") return "공연 확정";
  return "성사 진행 중";
}

function venueExploreHeadline(phase: VenueDemandPhase, toMin: number, remaining: number) {
  if (phase === "pre_min") return `성사까지 ${toMin}명 남았어요`;
  if (phase === "sold_out") return "매진됐어요";
  if (phase === "near_capacity") return `확정 완료 · 잔여 ${remaining}석`;
  return `공연 확정 · 잔여 ${remaining}석`;
}

function venueExploreSecondary(total: number, minGoal: number, capacity: number, phase: VenueDemandPhase) {
  if (phase === "pre_min") return `${total} / ${minGoal}명 · 정원 ${capacity}`;
  if (phase === "sold_out") return `${capacity} / ${capacity}명 · 정원 ${capacity}`;
  return `${total} / ${capacity}명 · 정원 ${capacity}`;
}

function venueParticipatingMetric(total: number, minGoal: number, capacity: number, phase: VenueDemandPhase) {
  const remaining = Math.max(0, capacity - total);
  const toMin = Math.max(0, minGoal - total);
  if (phase === "pre_min") return `${total} / ${minGoal}명 · 최소 ${minGoal}명 · ${toMin}명 남음`;
  if (phase === "sold_out") return `${capacity} / ${capacity}명 · 매진`;
  return `${total} / ${capacity}명 · 최소 ${minGoal}명 돌파 · 잔여 ${remaining}석`;
}

function venueParticipatingCardMetric(total: number, minGoal: number, capacity: number, phase: VenueDemandPhase) {
  const remaining = Math.max(0, capacity - total);
  const toMin = Math.max(0, minGoal - total);
  if (phase === "pre_min") return `${total} / ${minGoal}명 · ${toMin}명 남음`;
  if (phase === "sold_out") return `${capacity} / ${capacity}명 · 매진`;
  return `${total} / ${capacity}명 · 잔여 ${remaining}석`;
}

function participationStageLabel(phase: VenueDemandPhase, hasTicket: boolean) {
  if (hasTicket) return "성사 완료 · 티켓 준비";
  if (phase === "pre_min") return "성사 대기 중";
  if (phase === "sold_out") return "입장 준비";
  return "공연 확정 · 티켓 전환 중";
}

function participationCardCtaLabel(phase: VenueDemandPhase, hasTicket: boolean) {
  if (hasTicket) return "티켓 받기";
  if (phase === "pre_min") return "진행 보기";
  return "전환 상태 보기";
}

const VENUE_POSTER_URI: Record<string, string> = {
  rolling: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80",
  modeci: "https://images.unsplash.com/photo-1571266028245-d220c702a51f?w=900&q=80",
  velvet: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80",
  clubff: "https://images.unsplash.com/photo-1415201364774-f6f0ff38a28b?w=900&q=80",
};

const DEFAULT_VENUE_POSTER_URI = "https://images.unsplash.com/photo-1540037953447-85910fdee816?w=900&q=80";

function venuePosterUri(venue: VenueCompetition) {
  return VENUE_POSTER_URI[venue.id] ?? DEFAULT_VENUE_POSTER_URI;
}

function findVenueEntryTicket(venue: VenueCompetition, artistId: string, tickets: Ticket[]) {
  const artist = venue.artists.find((a) => a.id === artistId);
  return tickets.find(
    (t) =>
      (t.venueId === venue.id || t.venue === venue.venueName) &&
      (t.artistId === artistId || (artist && t.artist === artist.name))
  );
}

function canShowParticipatingQr(phase: VenueDemandPhase) {
  return phase !== "pre_min";
}

function QrMarkIcon({ size = 18, color = "rgba(255,255,255,0.88)" }: { size?: number; color?: string }) {
  const unit = size / 5;
  const corner = unit * 1.55;
  const stroke = Math.max(1.5, size * 0.1);
  const dot = unit * 0.72;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: corner,
          height: corner,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: corner,
          height: corner,
          borderTopWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: corner,
          height: corner,
          borderBottomWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          borderRadius: 1,
        }}
      />
      <View style={{ position: "absolute", top: unit * 0.35, left: unit * 0.35, width: dot, height: dot, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: "absolute", top: unit * 0.35, right: unit * 0.35, width: dot, height: dot, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: "absolute", bottom: unit * 0.35, left: unit * 0.35, width: dot, height: dot, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: "absolute", bottom: unit * 0.2, right: unit * 0.15, width: dot * 1.15, height: dot * 1.15, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function formatBookingDeadlineTension(c: VenueCompetition["countdown"]) {
  const { days, hours, minutes } = c;
  if (days === 0 && hours === 0 && minutes === 0) return "마감 종료";
  if (days >= 1) return `마감 D-${days}`;
  if (hours > 3) return "오늘 마감";
  if (hours >= 1) return `마감 ${hours}시간 전`;
  if (minutes > 0) return "오늘 마감";
  return "마감 종료";
}

function formatBattleHeroStatus(venue: VenueCompetition, total: number) {
  const parts: string[] = [];
  if (!venue.winnerId) parts.push("라이브");
  const toMin = Math.max(0, venue.minGoal - total);
  if (toMin > 0 && toMin <= 25) parts.push("확정 임박");
  const c = venue.countdown;
  if (c.days === 0 && c.hours === 0 && c.minutes > 0) parts.push(`마감까지 ${c.minutes}분`);
  else if (c.days === 0 && c.hours > 0 && c.hours <= 3) parts.push(`마감까지 ${c.hours}시간`);
  else if (c.days === 0 && c.hours > 0) parts.push(`마감 ${c.hours}시간 전`);
  else parts.push(formatCountdownUntil(c));
  return parts.join(" / ");
}

function formatShowDateCompact(venue: VenueCompetition) {
  const showWd = parseWeekdayFromSlotDate(venue.slotDate);
  const showTime = parseShowTime(venue.slotLabel);
  return `공연 ${parseShortDate(venue.slotDate)} ${showWd} ${showTime}`;
}

function formatVenueLineupHeadline(artists: CompetingArtist[]) {
  const names = artists.map((a) => a.name);
  if (names.length === 0) return "라인업 공개 예정";
  if (names.length <= 2) return names.join(" · ");
  return `${names[0]} 외 ${names.length - 1}팀`;
}

function formatVenueLineupMeta(venue: VenueCompetition, teamCount: number) {
  return `${genreKo(venue.slotGenre)} ${teamCount}팀 · ${venue.venueName} · 정원 ${venue.capacity}`;
}

/** 상세·마감 섹션: 날짜 전체 */
function formatVenueScheduleCompact(venue: VenueCompetition) {
  const closeWd = parseWeekdayFromSlotDate(venue.bookingCloseDate);
  return `마감 ${parseLongDate(venue.bookingCloseDate)} ${closeWd} · ${venue.bookingCloseTime} · ${formatShowDateCompact(venue)}`;
}

function venueIsClosed(venue: VenueCompetition, total: number) {
  return !!venue.winnerId || total >= venue.capacity;
}

function ScheduleInfoCell({
  label,
  primary,
  secondary,
  tertiary,
}: {
  label: string;
  primary: string;
  secondary: string;
  tertiary?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0a0e14",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700", letterSpacing: 0.2 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "800", marginTop: 5, letterSpacing: -0.3 }}>{primary}</Text>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 16 }}>{secondary}</Text>
      {tertiary ? (
        <Text style={{ color: C.dim, fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 15 }}>{tertiary}</Text>
      ) : null}
    </View>
  );
}

function VenueScheduleTwinBlocks({
  venue,
  phase,
  total,
}: {
  venue: VenueCompetition;
  phase: VenueDemandPhase;
  total: number;
}) {
  const bookingConfirmed = phase !== "pre_min";
  const remaining = Math.max(0, venue.capacity - total);
  const closeWd = parseWeekdayFromSlotDate(venue.bookingCloseDate);
  const showWd = parseWeekdayFromSlotDate(venue.slotDate);
  const showTime = parseShowTime(venue.slotLabel);

  const leftLabel = bookingConfirmed ? "예매 마감" : "수요 마감";
  const rightLabel = bookingConfirmed ? "공연일" : "공연 예정";

  return (
    <View style={{ flexDirection: "row", gap: SPACE.sm, marginTop: SPACE.md }}>
      <ScheduleInfoCell
        label={leftLabel}
        primary={`${parseShortDate(venue.bookingCloseDate)} ${closeWd}`}
        secondary={`${venue.bookingCloseTime}까지`}
        tertiary={bookingConfirmed ? `잔여 ${remaining}석` : formatCountdownUntil(venue.countdown)}
      />
      <ScheduleInfoCell
        label={rightLabel}
        primary={`${parseShortDate(venue.slotDate)} ${showWd}`}
        secondary={showTime}
        tertiary={bookingConfirmed ? undefined : `${venue.venueName} · ${venue.district}`}
      />
    </View>
  );
}

type VenueDemandPhase = "pre_min" | "confirmed" | "near_capacity" | "sold_out" | "winner";

function getVenueDemandPhase(venue: VenueCompetition, total: number): VenueDemandPhase {
  if (venue.winnerId) return "winner";
  if (total >= venue.capacity) return "sold_out";
  if (total >= venue.capacity * 0.92) return "near_capacity";
  if (total >= venue.minGoal) return "confirmed";
  return "pre_min";
}

function venueDemandInfo(
  venue: VenueCompetition,
  total: number,
  opts?: { hasPick?: boolean; pickedName?: string }
) {
  const { minGoal, capacity } = venue;
  const phase = getVenueDemandPhase(venue, total);
  const remaining = Math.max(0, capacity - total);
  const toMin = Math.max(0, minGoal - total);
  const hasPick = opts?.hasPick && opts.pickedName;
  const headline = hasPick
    ? `당신은 ${opts!.pickedName}와 함께 이 무대를 만들고 있어요`
    : `${total}명이 이 공연을 만들고 있어요`;

  if (phase === "sold_out") {
    return {
      badge: "매진",
      headline: hasPick ? headline : "매진됐어요",
      subline: "",
      metric: venueDemandMetric(total, minGoal, capacity, phase),
    };
  }
  if (phase === "winner") {
    return {
      badge: "예매 확정",
      headline,
      subline: venueDemandSubline(phase, toMin, remaining),
      metric: venueDemandMetric(total, minGoal, capacity, phase),
    };
  }
  if (phase === "near_capacity") {
    return {
      badge: "확정 완료",
      headline,
      subline: venueDemandSubline(phase, toMin, remaining),
      metric: venueDemandMetric(total, minGoal, capacity, phase),
    };
  }
  if (phase === "confirmed") {
    return {
      badge: "공연 확정",
      headline,
      subline: venueDemandSubline(phase, toMin, remaining),
      metric: venueDemandMetric(total, minGoal, capacity, phase),
    };
  }
  return {
    badge: "성사 진행 중",
    headline,
    subline: venueDemandSubline(phase, toMin, remaining),
    metric: venueDemandMetric(total, minGoal, capacity, phase),
  };
}

function VenueCapacityBar({
  total,
  minGoal,
  capacity,
  fillColor,
  animateOnMount = false,
}: {
  total: number;
  minGoal: number;
  capacity: number;
  fillColor: string;
  animateOnMount?: boolean;
}) {
  const fillRatio = Math.min(1, total / capacity);
  const fillPct = fillRatio * 100;
  const minMarkerPct = Math.min(98, (minGoal / capacity) * 100);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const markerOpacity = useRef(new Animated.Value(0.7)).current;
  const didAnimateFill = useRef(false);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startMarkerPulse = useCallback(() => {
    if (!animateOnMount) {
      markerOpacity.setValue(1);
      return;
    }
    pulseRef.current?.stop();
    markerOpacity.setValue(0.7);
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(markerOpacity, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(markerOpacity, { toValue: 0.7, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }, [animateOnMount, markerOpacity]);

  const onTrackLayout = useCallback(
    (width: number) => {
      if (width < 1) return;
      const target = width * fillRatio;

      if (!animateOnMount) {
        fillWidth.setValue(target);
        return;
      }

      if (didAnimateFill.current) return;
      didAnimateFill.current = true;
      fillWidth.setValue(0);
      startMarkerPulse();
      Animated.timing(fillWidth, {
        toValue: target,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [animateOnMount, fillRatio, fillWidth, startMarkerPulse]
  );

  useEffect(() => {
    return () => pulseRef.current?.stop();
  }, []);

  return (
    <View style={{ marginTop: SPACE.sm }}>
      <View
        style={{ height: 8, position: "relative", width: "100%" }}
        onLayout={(e) => onTrackLayout(e.nativeEvent.layout.width)}
        collapsable={false}
      >
        <View style={{ height: 8, backgroundColor: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
          {animateOnMount ? (
            <Animated.View
              style={{
                width: fillWidth,
                height: "100%",
                backgroundColor: fillColor,
                borderRadius: 999,
                opacity: 0.9,
              }}
            />
          ) : (
            <View
              style={{
                width: `${fillPct}%`,
                height: "100%",
                backgroundColor: fillColor,
                borderRadius: 999,
                opacity: 0.9,
              }}
            />
          )}
        </View>
        <Animated.View
          style={{
            position: "absolute",
            left: `${minMarkerPct}%`,
            top: -4,
            width: 2,
            height: 16,
            backgroundColor: C.gold,
            borderRadius: 1,
            marginLeft: -1,
            opacity: animateOnMount ? markerOpacity : 1,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: C.dim, fontSize: 10, fontWeight: "600" }}>최소 {minGoal}</Text>
        <Text style={{ color: C.dim, fontSize: 10, fontWeight: "600" }}>정원 {capacity}</Text>
      </View>
    </View>
  );
}

function genreFilterKo(chip: GenreFilter) {
  return chip === "All" ? "전체" : genreKo(chip);
}

function statusFilterKo(chip: StatusFilter) {
  return chip === "All" ? "전체" : momentumKo(chip);
}
const GENRE_CHIPS: GenreFilter[] = ["All", "Indie", "Electronic", "Hip-hop", "Jazz"];
const SLOT_GENRES: SlotGenre[] = ["Indie", "Electronic", "Hip-hop", "Jazz"];

const INITIAL_VENUES: VenueCompetition[] = [
  {
    id: "rolling",
    venueName: "롤링홀",
    district: "마포",
    address: "서울 마포구 와우산로 19",
    capacity: 450,
    slotLabel: "헤드라인 · 19:30",
    slotDate: "6월 14일 (금)",
    bookingCloseDate: "6월 12일 (수)",
    bookingCloseTime: "23:59",
    countdown: { days: 3, hours: 0, minutes: 0 },
    minGoal: 150,
    slotGenre: "Indie",
    slotsOpen: 0,
    winnerId: "minu",
    artists: [
      {
        id: "minu",
        name: "미누",
        genre: "인디 록",
        supporters: 94,
        tagline: "마포 감성, 다같이 부르는 후렴",
        story:
          "새벽의 식당, 마지막 지하철, 오래 미룬 고백을 노래하는 인디 록 아티스트. 이 공연은 예정된 게 아니라, 서울 팬 94명이 먼저 만들어냈습니다.",
        latestTrack: { title: "위성 기도", duration: "4:08" },
      },
      {
        id: "luna",
        name: "루나 아카이브",
        genre: "드림팝",
        supporters: 78,
        tagline: "테이프 딜레이, 지하실 찬가",
        story: "작은 공간을 멈춘 순간으로 바꾸는 루나 아카이브. 롤링홀 메인에 딱 맞는 팀.",
        latestTrack: { title: "유리 과수원", duration: "3:42" },
      },
      {
        id: "river",
        name: "리버라이트",
        genre: "인디 포크",
        supporters: 41,
        tagline: "어쿠스틱, 관객 숨 고르기",
        story: "팬스테이지 팝업 두 번 매진. 마포가 원하는 조용함과 울림을 동시에 노린다.",
        latestTrack: { title: "조수실", duration: "3:55" },
      },
    ],
  },
  {
    id: "modeci",
    venueName: "모데시",
    district: "이태원",
    address: "서울 용산구 이태원로 54",
    capacity: 280,
    slotLabel: "토요일 레이트 · 23:00",
    slotDate: "6월 21일 (토)",
    bookingCloseDate: "6월 20일 (금)",
    bookingCloseTime: "23:59",
    countdown: { days: 0, hours: 9, minutes: 18 },
    minGoal: 120,
    slotGenre: "Electronic",
    slotsOpen: 1,
    artists: [
      {
        id: "neon",
        name: "네온룸",
        genre: "일렉트로닉",
        supporters: 68,
        tagline: "웨어하우스 베이스, 팝 훅",
        story: "이태원 에너지와 헤드라인급 사운드를 섞는 네온룸. 모데시가 목표 무대다.",
        latestTrack: { title: "미드나잇 릴레이", duration: "5:11" },
      },
      {
        id: "yuna",
        name: "유나 플럭스",
        genre: "하우스 · K-일렉",
        supporters: 61,
        tagline: "피크타임 압박, 군더더기 없음",
        story: "서울 레지던시에서 뜨거운 유나 플럭스. 이번 슬롯이 커리어 분기점이 될 수 있다.",
        latestTrack: { title: "플럭스 상태", duration: "4:44" },
      },
    ],
  },
  {
    id: "velvet",
    venueName: "벨벳홀",
    district: "성수",
    address: "서울 성동구 성수이로 12",
    capacity: 320,
    slotLabel: "목요일 랩 쇼케이스 · 21:00",
    slotDate: "6월 12일 (목)",
    bookingCloseDate: "6월 10일 (화)",
    bookingCloseTime: "23:59",
    countdown: { days: 0, hours: 0, minutes: 0 },
    minGoal: 100,
    slotGenre: "Hip-hop",
    slotsOpen: 0,
    winnerId: "kontra",
    artists: [
      {
        id: "kontra",
        name: "콘트라",
        genre: "K-랩",
        supporters: 112,
        tagline: "성수 랩, 라이브 밴드 파워",
        story: "막판 서포트로 벨벳홀 슬롯을 가져간 콘트라. 112명의 서포트가 예매를 확정했다.",
        latestTrack: { title: "백스테이지 패스", duration: "2:56" },
      },
      {
        id: "sable",
        name: "세이블 크루",
        genre: "힙합",
        supporters: 89,
        tagline: "사이퍼 에너지, 모스피트 훅",
        story: "세이블 크루가 콘트라를 끝까지 밀었다. 마지막 48시간이 아직도 회자된다.",
        latestTrack: { title: "크루 콜", duration: "3:12" },
      },
    ],
  },
  {
    id: "clubff",
    venueName: "홍대 클럽 FF",
    district: "홍대",
    address: "서울 마포구 어울마당로 33",
    capacity: 180,
    slotLabel: "수요일 신인 나이트 · 19:30",
    slotDate: "6월 18일 (수)",
    bookingCloseDate: "6월 16일 (월)",
    bookingCloseTime: "23:59",
    countdown: { days: 0, hours: 0, minutes: 6 },
    minGoal: 80,
    slotGenre: "Jazz",
    slotsOpen: 3,
    artists: [
      {
        id: "oki",
        name: "김오키",
        genre: "모던 재즈",
        supporters: 34,
        tagline: "즉흥 리드, 공간 장악",
        story: "김오키는 클럽 FF가 원하는 심야 재즈의 중심이다.",
        latestTrack: { title: "리버라이트 스위트", duration: "6:20" },
      },
      {
        id: "moon",
        name: "문미향",
        genre: "재즈 보컬",
        supporters: 28,
        tagline: "심야 연기, 브라스 열기",
        story: "문미향의 보컬이 FF의 재즈 나이트를 완성한다.",
        latestTrack: { title: "연기 신호", duration: "5:02" },
      },
      {
        id: "trioA",
        name: "트리오 A",
        genre: "퓨전 재즈",
        supporters: 12,
        tagline: "리듬 섹션, 날카로운 브레이크",
        story: "트리오 A는 FF 신인 나이트에서 가장 빠르게 올라온 팀이다.",
        latestTrack: { title: "블루 코리더", duration: "4:18" },
      },
      {
        id: "bandB",
        name: "밴드 B",
        genre: "시티팝 재즈",
        supporters: 8,
        tagline: "도시 밤, 부드러운 그루브",
        story: "밴드 B는 홍대 재즈 팬층의 숨은 후보다.",
        latestTrack: { title: "네온 블루", duration: "3:54" },
      },
    ],
  },
].map((venue) => ({
  ...venue,
  slotGenre: venue.slotGenre as SlotGenre,
  artists: venue.artists.map((a) => enrichCompetingArtist(a)),
})) as VenueCompetition[];

type PendingPick = {
  id: string;
  venueId: string;
  artistId: string;
  artist: string;
  venue: string;
  countdown: string;
  rank: string;
  momentum: VenueMomentum;
  supporterGap: number;
};

type RefundedPick = {
  id: string;
  venueId: string;
  artistId: string;
  artist: string;
  venue: string;
  winnerName: string;
  refundedAmount: string;
};

type TicketWalletFilter = "all" | "converting" | "ticket" | "past" | "refund";

type ArtistDetailReturn = null | "venueDetail" | "tickets" | "discover";

type Ticket = {
  id: string;
  artist: string;
  artistId?: string;
  venue: string;
  venueId?: string;
  date: string;
  seat: string;
  code: string;
};

type FanInvite = { id: string; venueId: string; profileId: string; genre: SlotGenre; note: string };
type ArtistApplication = {
  id: string;
  venueId: string;
  artistName: string;
  battlePitch: string;
  social: ArtistSocialProof;
};

type ArtistRoleRequestStatus = "pending" | "approved" | "rejected";

type ArtistRoleRequest = {
  id: string;
  handle: string;
  stageName: string;
  status: ArtistRoleRequestStatus;
  submittedLabel: string;
  source: "profile" | "battle";
  slotGenre: SlotGenre;
  note?: string;
  battlePitch?: string;
  social?: ArtistSocialProof;
};

type ApprovedArtist = {
  id: string;
  handle: string;
  stageName: string;
  slotGenre: SlotGenre;
  genre: string;
  tagline: string;
  story: string;
};

const SEED_ARTIST_ROLE_REQUESTS: ArtistRoleRequest[] = [
  {
    id: "req-yuna",
    handle: "yuna_mix",
    stageName: "DJ Yuna Flux",
    status: "pending",
    submittedLabel: "18m ago",
    source: "battle",
    slotGenre: "Electronic",
    note: "House · K-electronic · Modeci slot ready",
    battlePitch: "K-일렉 하우스. 모데시에서 커리어 분기점이 될 수 있는 세트. 팬들이 먼저 만들어내는 밤.",
    social: { primaryPlatform: "tiktok", tiktok: "yuna_flux", spotify: "yunaflux", instagram: "yuna_mix" },
  },
  {
    id: "req-han",
    handle: "han_archive",
    stageName: "Han River Jazz Collective",
    status: "pending",
    submittedLabel: "1h ago",
    source: "profile",
    slotGenre: "Jazz",
    note: "Modern jazz · Club FF applications",
    battlePitch: "한강의 재즈. 현대적인 편성과 실험적인 즉흥 연주로 클럽 FF의 밤을 채웁니다.",
    social: { primaryPlatform: "youtube", youtube: "hanriverjazz", soundcloud: "han-archive-seoul", instagram: "han_archive" },
  },
  {
    id: "req-kontra",
    handle: "kontra_seoul",
    stageName: "KONTRA",
    status: "approved",
    submittedLabel: "3d ago",
    source: "battle",
    slotGenre: "Hip-hop",
    note: "K-rap · Velvet Hall winner path",
    battlePitch: "성수 랩과 라이브 밴드 파워. 112명의 서포트가 만든 벨벳홀 승리.",
    social: { primaryPlatform: "youtube", youtube: "kontraseoul", instagram: "kontra_seoul" },
  },
];

const SEED_APPROVED_ARTISTS: ApprovedArtist[] = [
  {
    id: "roster-kontra",
    handle: "kontra_seoul",
    stageName: "KONTRA",
    slotGenre: "Hip-hop",
    genre: "K-rap",
    tagline: "Seongsu rap, live-band power",
    story: "KONTRA is verified and cleared for hip-hop venue battles across Seoul.",
  },
  {
    id: "roster-luna",
    handle: "luna_archive",
    stageName: "Luna Archive",
    slotGenre: "Indie",
    genre: "Dream pop",
    tagline: "Tape-delay vocals, basement hymns",
    story: "Luna Archive brings dream-pop tension to indie-locked rooms.",
  },
];

// ——— Helpers ———

function totalSupporters(venue: VenueCompetition) {
  return venue.artists.reduce((s, a) => s + a.supporters, 0);
}

function sortedArtists(venue: VenueCompetition) {
  return [...venue.artists].sort((a, b) => b.supporters - a.supporters);
}

function getLeader(venue: VenueCompetition) {
  return sortedArtists(venue)[0];
}

function getRunnerUp(venue: VenueCompetition) {
  return sortedArtists(venue)[1];
}

function getVenueMomentum(venue: VenueCompetition): VenueMomentum {
  if (venue.winnerId) return "Slot won";
  const total = totalSupporters(venue);
  if (total >= venue.capacity * 0.9 || total / venue.minGoal >= 0.75) return "Almost unlocked";
  const leader = getLeader(venue);
  const runner = getRunnerUp(venue);
  if (runner && leader.supporters - runner.supporters <= 8) return "Almost unlocked";
  return "Heating up";
}

function momentumStyle(m: VenueMomentum) {
  if (m === "Slot won") return { bg: "#14532d", color: C.accent };
  if (m === "Almost unlocked") return { bg: "#422006", color: C.gold };
  return { bg: "#3b0764", color: C.rival };
}

function formatCountdown(c: VenueCompetition["countdown"]) {
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "종료";
  const parts: string[] = [];
  if (c.days > 0) parts.push(`${c.days}일`);
  if (c.hours > 0) parts.push(`${c.hours}시간`);
  if (c.minutes > 0) parts.push(`${c.minutes}분`);
  return parts.join(" ");
}

function countdownEnded(c: VenueCompetition["countdown"]) {
  return c.days === 0 && c.hours === 0 && c.minutes === 0;
}

function tickVenueCountdowns(venues: VenueCompetition[]): VenueCompetition[] {
  return venues.map((venue) => {
    if (venue.winnerId || countdownEnded(venue.countdown)) return venue;
    let { days, hours, minutes } = venue.countdown;
    minutes -= 1;
    if (minutes < 0) {
      minutes = 59;
      hours -= 1;
    }
    if (hours < 0) {
      hours = 23;
      days -= 1;
    }
    return {
      ...venue,
      countdown: {
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
      },
    };
  });
}

function createWinnerTicket(venue: VenueCompetition, artist: CompetingArtist): Ticket {
  const timeLabel = venue.slotLabel.includes("·") ? venue.slotLabel.split("·").pop()?.trim() : venue.slotLabel;
  return {
    id: `ticket-${venue.id}-${artist.id}`,
    artist: artist.name,
    artistId: artist.id,
    venue: venue.venueName,
    venueId: venue.id,
    date: `${venue.slotDate} · ${timeLabel ?? "8PM"}`,
    seat: "GA · Fanstage winner pick",
    code: `FS-${artist.id.toUpperCase()}-${venue.id.toUpperCase()}-2026`,
  };
}

function resolveEndedBattles(
  venues: VenueCompetition[],
  venueBackings: Record<string, string>,
  tickets: Ticket[]
): { venues: VenueCompetition[]; tickets: Ticket[]; toast?: string } {
  let nextTickets = [...tickets];
  let toast: string | undefined;

  const nextVenues = venues.map((venue) => {
    if (venue.winnerId || !countdownEnded(venue.countdown)) return venue;

    const leader = getLeader(venue);
    const userPickId = venueBackings[venue.id];
    const resolved = { ...venue, winnerId: leader.id, slotsOpen: 0 };

    if (userPickId === leader.id) {
      const artist = venue.artists.find((a) => a.id === leader.id)!;
      if (!nextTickets.some((t) => t.venueId === venue.id)) {
        nextTickets = [...nextTickets, createWinnerTicket(venue, artist)];
        toast = `${artist.name} won ${venue.venueName}! Your ticket is ready.`;
      }
    } else if (userPickId) {
      const artist = venue.artists.find((a) => a.id === userPickId);
      toast = `Battle ended at ${venue.venueName}.${artist ? ` ${artist.name} didn't win` : ""} — ${BACKING_PRICE} refunded.`;
    }

    return resolved;
  });

  return { venues: nextVenues, tickets: nextTickets, toast };
}

function buildActivePicks(venues: VenueCompetition[], venueBackings: Record<string, string>): PendingPick[] {
  return Object.entries(venueBackings)
    .map(([venueId, artistId]) => {
      const venue = venues.find((v) => v.id === venueId);
      if (!venue || venue.winnerId) return null;
      const artist = venue.artists.find((a) => a.id === artistId);
      if (!artist) return null;
      const sorted = sortedArtists(venue);
      const rank = sorted.findIndex((a) => a.id === artistId) + 1;
      const leader = sorted[0];
      const gap = leader.id === artistId ? 0 : leader.supporters - artist.supporters;
      return {
        id: `${venueId}-${artistId}`,
        venueId,
        artistId,
        artist: artist.name,
        venue: venue.venueName,
        countdown: formatCountdown(venue.countdown),
        rank: `${rank}위 · ${sorted.length}팀 경쟁`,
        momentum: getVenueMomentum(venue),
        supporterGap: gap,
      };
    })
    .filter((p): p is PendingPick => p !== null);
}

function buildRefundedPicks(venues: VenueCompetition[], venueBackings: Record<string, string>): RefundedPick[] {
  return Object.entries(venueBackings)
    .map(([venueId, artistId]) => {
      const venue = venues.find((v) => v.id === venueId);
      if (!venue?.winnerId || venue.winnerId === artistId) return null;
      const artist = venue.artists.find((a) => a.id === artistId);
      const winner = venue.artists.find((a) => a.id === venue.winnerId);
      return {
        id: `refund-${venueId}-${artistId}`,
        venueId,
        artistId,
        artist: artist?.name ?? "Your pick",
        venue: venue.venueName,
        winnerName: winner?.name ?? "Winner",
        refundedAmount: BACKING_PRICE,
      };
    })
    .filter((p): p is RefundedPick => p !== null);
}

function seedTicketWalletState(): {
  venues: VenueCompetition[];
  venueBackings: Record<string, string>;
  wonTickets: Ticket[];
} {
  const venues = INITIAL_VENUES.map((v) => {
    const base = { ...v, artists: v.artists.map((a) => ({ ...a })) };
    if (v.id === "modeci") {
      return { ...base, winnerId: "neon", slotsOpen: 0, countdown: { days: 0, hours: 0, minutes: 0 } };
    }
    if (v.id === "rolling") {
      return { ...base, winnerId: "minu", slotsOpen: 0, countdown: { days: 3, hours: 0, minutes: 0 } };
    }
    return base;
  });
  const venueBackings: Record<string, string> = {
    rolling: "minu",
    modeci: "neon",
    velvet: "sable",
  };
  const modeci = venues.find((v) => v.id === "modeci")!;
  const neon = modeci.artists.find((a) => a.id === "neon")!;
  const rolling = venues.find((v) => v.id === "rolling")!;
  const minu = rolling.artists.find((a) => a.id === "minu")!;
  const wonTickets = [createWinnerTicket(modeci, neon), createWinnerTicket(rolling, minu)];
  return { venues, venueBackings, wonTickets };
}

function bumpArtistSupport(venues: VenueCompetition[], venueId: string, artistId: string): VenueCompetition[] {
  return venues.map((venue) => {
    if (venue.id !== venueId) return venue;
    return {
      ...venue,
      artists: venue.artists.map((a) => (a.id === artistId ? { ...a, supporters: a.supporters + 1 } : a)),
    };
  });
}

function findLiveVenue(venues: VenueCompetition[], venue: VenueCompetition | null) {
  if (!venue) return null;
  return venues.find((v) => v.id === venue.id) ?? venue;
}

function findLiveArtist(venue: VenueCompetition | null, artist: CompetingArtist | null) {
  if (!venue || !artist) return null;
  return venue.artists.find((a) => a.id === artist.id) ?? artist;
}

function genreLabelForSlot(slotGenre: SlotGenre) {
  if (slotGenre === "Electronic") return "Electronic";
  if (slotGenre === "Hip-hop") return "Hip-hop";
  if (slotGenre === "Jazz") return "Jazz";
  return "Indie";
}

function requestToApprovedArtist(req: ArtistRoleRequest): ApprovedArtist {
  return {
    id: `roster-${req.handle}`,
    handle: req.handle,
    stageName: req.stageName,
    slotGenre: req.slotGenre,
    genre: genreLabelForSlot(req.slotGenre),
    tagline: req.note?.split("·")[0]?.trim() ?? "Fanstage verified act",
    story: `${req.stageName} is approved to enter ${req.slotGenre} venue battles.`,
  };
}

function addArtistToVenueLineup(venue: VenueCompetition, artist: ApprovedArtist): VenueCompetition | null {
  if (venue.winnerId) return null;
  if (venue.slotGenre !== artist.slotGenre) return null;
  if (venue.artists.some((a) => a.id === artist.id || a.name === artist.stageName)) return null;

  const entrant: CompetingArtist = enrichCompetingArtist({
    id: artist.id,
    name: artist.stageName,
    genre: artist.genre,
    supporters: 24 + (artist.id.length % 40),
    tagline: artist.tagline,
    story: artist.story,
    latestTrack: { title: "Battle entry", duration: "3:42" },
    social: { instagram: artist.handle },
  });

  return {
    ...venue,
    artists: [...venue.artists, entrant],
    slotsOpen: Math.max(0, venue.slotsOpen - 1),
  };
}

function applicationToCompetingArtist(app: ArtistApplication, venue: VenueCompetition): CompetingArtist {
  return enrichCompetingArtist({
    id: `app-${app.id}`,
    name: app.artistName,
    genre: genreLabelForSlot(venue.slotGenre),
    supporters: 18,
    tagline: app.battlePitch.slice(0, 48),
    battlePitch: app.battlePitch,
    social: app.social,
    story: app.battlePitch,
    latestTrack: { title: "Application demo", duration: "3:20" },
  });
}

function enqueueArtistRoleRequest(
  prev: ArtistRoleRequest[],
  payload: {
    handle: string;
    stageName: string;
    source: ArtistRoleRequest["source"];
    slotGenre?: SlotGenre;
    note?: string;
    battlePitch?: string;
    social?: ArtistSocialProof;
  }
): ArtistRoleRequest[] {
  const existing = prev.find((r) => r.handle === payload.handle);
  if (existing?.status === "approved") return prev;
  if (existing) {
    return prev.map((r) =>
      r.handle === payload.handle
        ? {
            ...r,
            stageName: payload.stageName,
            status: "pending",
            submittedLabel: "Just now",
            source: payload.source,
            slotGenre: payload.slotGenre ?? r.slotGenre,
            note: payload.note ?? r.note,
            battlePitch: payload.battlePitch ?? r.battlePitch,
            social: payload.social ?? r.social,
          }
        : r
    );
  }
  return [
    {
      id: `req-${Date.now()}`,
      handle: payload.handle,
      stageName: payload.stageName,
      status: "pending",
      submittedLabel: "Just now",
      source: payload.source,
      slotGenre: payload.slotGenre ?? "Indie",
      note: payload.note,
      battlePitch: payload.battlePitch,
      social: payload.social,
    },
    ...prev,
  ];
}

function resolveArtist(
  venues: VenueCompetition[],
  opts: {
    venueId?: string;
    artistId?: string;
    artistName?: string;
    venueName?: string;
  }
): { venue: VenueCompetition; artist: CompetingArtist } | null {
  for (const venue of venues) {
    if (opts.venueId && venue.id !== opts.venueId) continue;
    if (opts.venueName && venue.venueName !== opts.venueName) continue;
    const artist = venue.artists.find(
      (a) =>
        (opts.artistId ? a.id === opts.artistId : true) &&
        (opts.artistName ? a.name === opts.artistName : true)
    );
    if (artist && (opts.artistId || opts.artistName)) return { venue, artist };
  }
  return null;
}

function getArtistStatusLabel(
  venue: VenueCompetition,
  artist: CompetingArtist,
  userPickId?: string
): string {
  if (venue.winnerId === artist.id) return "공연 확정";
  if (userPickId === artist.id) return "예치 완료 · 함께 부르는 중";
  const { probability } = campaignPledgeStats(artist.supporters, venue.minGoal);
  return `성사 가능성 ${probability}%`;
}

function campaignPledgeStats(supporters: number, goal: number) {
  const remaining = Math.max(0, goal - supporters);
  const probability = Math.min(100, Math.round((supporters / Math.max(goal, 1)) * 100));
  return { remaining, probability };
}

function artistCampaignEyebrow(artist: CompetingArtist) {
  return `서울이 ${artist.name}를 부르는 중`;
}

function artistConfirmedEyebrow(artist: CompetingArtist) {
  return `서울이 ${artist.name}를 불렀습니다`;
}

function artistConfirmedTitle(artist: CompetingArtist, venue: VenueCompetition) {
  return `${artist.name} @ ${venue.venueName} 확정`;
}

function artistCampaignTitle(artist: CompetingArtist, venue: VenueCompetition) {
  return `${artist.name} @ ${venue.venueName} 만들기`;
}

function ticketOpenStatusLabel(countdown: VenueCompetition["countdown"], isUserPick: boolean) {
  if (isUserPick) return "티켓 전환 가능";
  if (countdown.days > 0) return `티켓 오픈 D-${countdown.days}`;
  if (countdown.hours > 0 || countdown.minutes > 0) return "티켓 오픈 임박";
  return "티켓 전환 가능";
}

type ShowPageStage = "recruiting" | "almost_there" | "confirmed" | "ticket_ready";
type StatusTone = "green" | "pink" | "yellow" | "slate";

function getShowPageStage(venue: VenueCompetition, artist: CompetingArtist, hasTicket: boolean): ShowPageStage {
  if (venue.winnerId === artist.id) return hasTicket ? "ticket_ready" : "confirmed";
  const { probability, remaining } = campaignPledgeStats(artist.supporters, venue.minGoal);
  if (remaining <= 30 || probability >= 70) return "almost_there";
  return "recruiting";
}

function showStageStatusLabel(stage: ShowPageStage): string {
  if (stage === "recruiting") return "모집 중";
  if (stage === "almost_there") return "성사 임박";
  if (stage === "confirmed") return "공연 확정";
  return "티켓 전환 가능";
}

function statusToneStyle(tone: StatusTone) {
  if (tone === "green") return { bg: ROLE.fan.bg, border: ROLE.fan.border, color: ROLE.fan.primary };
  if (tone === "pink") return { bg: "#2d1f4e", border: C.rival + "44", color: C.rival };
  if (tone === "yellow") return { bg: "#422006", border: "#f59e0b66", color: C.gold };
  return { bg: C.surface, border: C.border, color: C.muted };
}

function stageStatusTone(stage: ShowPageStage): StatusTone {
  if (stage === "confirmed" || stage === "ticket_ready") return "green";
  if (stage === "almost_there") return "yellow";
  if (stage === "recruiting") return "pink";
  return "slate";
}

type DemandSurfaceCopy = {
  status: string;
  context: string;
  evidence: string;
  current: number;
  goal: number;
  progressPct: number;
  tone: StatusTone;
};

function demandDeadlineLabel(venue: VenueCompetition): string {
  const c = venue.countdown;
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "마감됨";
  if (c.days === 0) return "오늘 마감";
  if (c.days === 1) return "내일 마감";
  return `${c.days}일 후 마감`;
}

function buildDemandSurfaceCopy(
  stage: ShowPageStage,
  artist: CompetingArtist,
  venue: VenueCompetition,
  isUserPick: boolean
): DemandSurfaceCopy {
  const goal = venue.minGoal;
  const current = artist.supporters;
  const { remaining } = campaignPledgeStats(current, goal);
  const progressPct = Math.min(100, Math.round((current / Math.max(goal, 1)) * 100));
  const tone = stageStatusTone(stage);

  if (stage === "confirmed" || stage === "ticket_ready") {
    const ticketNote = isUserPick ? ticketOpenStatusLabel(venue.countdown, true) : ticketOpenStatusLabel(venue.countdown, false);
    return {
      status: showStageStatusLabel(stage),
      context: `서울 팬 ${current}명이 만든 공연`,
      evidence: `${current} / ${goal}명 · ${ticketNote}`,
      current,
      goal,
      progressPct: 100,
      tone,
    };
  }

  return {
    status: stage === "almost_there" ? "성사 임박" : "모집 중",
    context: `${remaining}명만 더 모이면 ${artist.name} 무대가 열립니다`,
    evidence: `${current} / ${goal}명 · ${demandDeadlineLabel(venue)}`,
    current,
    goal,
    progressPct,
    tone,
  };
}

function getDemandPrimaryAction(
  stage: ShowPageStage,
  artist: CompetingArtist,
  isUserPick: boolean,
  hasTicket: boolean
): string {
  if (stage === "ticket_ready") return "입장권 보기";
  if (stage === "confirmed") return "내 티켓 받기";
  if (stage === "almost_there" && isUserPick) return "친구 초대하기";
  if (isUserPick && stage === "recruiting") return "친구 초대하기";
  return `${BACKING_PRICE} 예치하고 ${artist.name} 부르기`;
}

function venueBattleSummary(venue: VenueCompetition) {
  const total = totalSupporters(venue);
  const sorted = sortedArtists(venue);
  if (venue.winnerId) {
    const winner = sorted.find((a) => a.id === venue.winnerId) ?? sorted[0];
    return `${winner.name} 무대 확정 · 서포트 ${total}명`;
  }
  if (total >= venue.minGoal) {
    return `${total}명 참여 · 최소 ${venue.minGoal}명 돌파 · 정원 ${venue.capacity}`;
  }
  return `${sorted.length}팀 경쟁 · ${total}/${venue.minGoal}명 (최소 성사)`;
}

// ——— Primitives ———

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 11, letterSpacing: 1.4, marginBottom: SPACE.sm }}>
      {children}
    </Text>
  );
}

function ShowCard({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) {
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 24,
        padding: SPACE.md,
        marginBottom: SPACE.md,
        borderWidth: 1,
        borderColor: borderColor ?? C.border,
      }}
    >
      {children}
    </View>
  );
}

function DemandFieldLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: C.dim, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 }}>{children}</Text>
  );
}

function DemandGraph({ current, goal, progressPct }: { current: number; goal: number; progressPct: number }) {
  const segments = 16;
  const filled = Math.round((Math.min(100, progressPct) / 100) * segments);
  return (
    <View style={{ marginTop: SPACE.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: SPACE.xs }}>
        <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700" }}>서울 수요 그래프</Text>
        <Text style={{ color: ROLE.fan.primary, fontSize: 10, fontWeight: "800" }}>
          {current} / {goal}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 52, gap: 3 }}>
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < filled;
          const h = 10 + ((i + 1) / segments) * 38;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                borderRadius: 4,
                backgroundColor: active ? ROLE.fan.primary : C.border,
                opacity: active ? 1 : 0.28,
              }}
            />
          );
        })}
      </View>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: C.border, marginTop: SPACE.sm, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${Math.min(100, progressPct)}%`, backgroundColor: ROLE.fan.primary, borderRadius: 999 }} />
      </View>
    </View>
  );
}

function DemandSurfaceBlock({
  copy,
  artist,
  venue,
  stage,
}: {
  copy: DemandSurfaceCopy;
  artist: CompetingArtist;
  venue: VenueCompetition;
  stage: ShowPageStage;
}) {
  const schedule = formatShowSchedule(venue);
  const title =
    stage === "confirmed" || stage === "ticket_ready" ? artistConfirmedTitle(artist, venue) : artistCampaignTitle(artist, venue);
  const s = statusToneStyle(copy.tone);

  return (
    <ShowCard borderColor={s.border}>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 22, letterSpacing: -0.5, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: C.dim, fontSize: 13, fontWeight: "600", marginBottom: SPACE.md }}>
        {venue.venueName} · {schedule}
      </Text>

      <DemandFieldLabel>상태</DemandFieldLabel>
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: s.bg,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: s.border,
          marginBottom: SPACE.md,
        }}
      >
        <Text style={{ color: s.color, fontWeight: "900", fontSize: 12 }}>{copy.status}</Text>
      </View>

      <DemandFieldLabel>맥락</DemandFieldLabel>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: "800", lineHeight: 26, marginBottom: SPACE.md }}>{copy.context}</Text>

      <DemandFieldLabel>증거</DemandFieldLabel>
      <Text style={{ color: ROLE.fan.primary, fontSize: 16, fontWeight: "800", marginBottom: SPACE.xs }}>{copy.evidence}</Text>
      <DemandGraph current={copy.current} goal={copy.goal} progressPct={copy.progressPct} />
    </ShowCard>
  );
}

function FanCreditCard({ artist, isUserPick }: { artist: CompetingArtist; isUserPick: boolean }) {
  const lines = [
    `서울 팬 ${artist.supporters}명이 만든 공연`,
    ...(isUserPick ? ["당신의 참여가 티켓으로 전환됐어요"] : []),
    "Founding fan으로 기록됩니다",
    "이 무대는 관객이 먼저 불렀습니다",
  ];
  return (
    <ShowCard borderColor={ROLE.fan.border}>
      {lines.map((line) => (
        <Text key={line} style={{ color: "#cbd5e1", lineHeight: 26, fontSize: 15, fontWeight: line.includes("당신") ? "800" : "600" }}>
          · {line}
        </Text>
      ))}
      <Text style={{ color: C.dim, marginTop: SPACE.md, fontSize: 12, lineHeight: 18 }}>
        티켓은 다른 곳에서도 살 수 있어요. 이 기록은 fanstage만 줍니다.
      </Text>
    </ShowCard>
  );
}

function ShowStoryCard({ artist, venue }: { artist: CompetingArtist; venue: VenueCompetition }) {
  return (
    <ShowCard>
      <Text style={{ color: "#cbd5e1", lineHeight: 24, fontSize: 15 }}>{artist.story}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ fontSize: 16, color: ROLE.fan.primary, marginRight: SPACE.sm }}>▶</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
            {artist.latestTrack.title} · {artist.latestTrack.duration}
          </Text>
          <Text style={{ color: C.dim, marginTop: 4, fontSize: 13 }}>
            {venue.venueName}에서 듣고 싶은 사람 {artist.supporters}명
          </Text>
        </View>
      </View>
    </ShowCard>
  );
}

function ShowBottomActionBar({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  hint,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  hint?: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: SPACE.md,
        paddingTop: SPACE.md,
        paddingBottom: SPACE.lg,
        backgroundColor: C.bg,
        borderTopWidth: 1,
        borderTopColor: C.border,
      }}
    >
      <DemandFieldLabel>행동</DemandFieldLabel>
      <TouchableOpacity onPress={onPrimary} style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}>
        <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>{primaryLabel}</Text>
      </TouchableOpacity>
      {secondaryLabel && onSecondary ? (
        <TouchableOpacity
          onPress={onSecondary}
          style={{
            marginTop: SPACE.sm,
            borderRadius: 18,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.muted, fontWeight: "700", fontSize: 15 }}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {hint ? (
        <Text style={{ color: C.dim, textAlign: "center", marginTop: SPACE.sm, fontSize: 12, fontWeight: "600" }}>{hint}</Text>
      ) : null}
    </View>
  );
}

function OverlayBackHeader({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: SPACE.md, zIndex: 20 }}>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 10, right: 16, bottom: 10, left: 16 }}
        style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
      >
        <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 16 }}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function ShowPageShell({ children, bottom }: { children: React.ReactNode; bottom?: React.ReactNode }) {
  if (!bottom) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {bottom}
    </View>
  );
}

function ScreenHeader({
  title,
  subtitle,
  onBack,
  eyebrow,
  titleColor,
  titleSize,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  eyebrow?: string;
  titleColor?: string;
  titleSize?: number;
}) {
  const size = titleSize ?? 32;
  return (
    <View style={{ marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, right: 16, bottom: 10, left: 16 }}
          style={{ alignSelf: "flex-start", justifyContent: "center", minHeight: 44, marginBottom: SPACE.md }}
        >
          <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
      ) : null}
      {eyebrow ? <Text style={{ color: C.rival, fontWeight: "800", fontSize: 11, marginBottom: SPACE.xs }}>{eyebrow}</Text> : null}
      <Text style={{ color: titleColor ?? C.text, fontSize: size, fontWeight: "900", lineHeight: size + 6, letterSpacing: -1 }}>{title}</Text>
      {subtitle ? <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24, marginTop: SPACE.sm, fontWeight: "600" }}>{subtitle}</Text> : null}
    </View>
  );
}

function MomentumBadge({ momentum }: { momentum: VenueMomentum }) {
  const s = momentumStyle(momentum);
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: s.color, fontWeight: "800", fontSize: 11 }}>{momentumKo(momentum)}</Text>
    </View>
  );
}

function GenrePill({ genre, large, hero }: { genre: SlotGenre; large?: boolean; hero?: boolean }) {
  const g = genreTheme(genre);
  if (hero) {
    return (
      <View style={{ marginBottom: SPACE.xs }}>
        <Text style={{ color: g.primary, fontWeight: "900", fontSize: 40, lineHeight: 44, letterSpacing: -1.2 }}>
          {genreKo(genre)}
        </Text>
      </View>
    );
  }
  const fontSize = large ? 20 : 12;
  return (
    <View
      style={{
        backgroundColor: g.bg,
        borderRadius: large ? 14 : 999,
        paddingHorizontal: large ? 16 : 12,
        paddingVertical: large ? 10 : 6,
        borderWidth: 1.5,
        borderColor: g.border,
      }}
    >
      <Text style={{ color: g.primary, fontWeight: "900", fontSize, letterSpacing: large ? -0.5 : 0 }}>
        {genreKo(genre)}
      </Text>
    </View>
  );
}

function WinnerGlow({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return <>{children}</>;

  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 2,
        borderColor: C.accent,
      }}
    >
      {children}
    </View>
  );
}

function FanLevelBadge({ reputation }: { reputation: number }) {
  const level = getFanLevel(reputation);
  return (
    <View style={{ backgroundColor: ROLE.fan.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: ROLE.fan.border }}>
      <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 11 }}>{level.title.toUpperCase()}</Text>
    </View>
  );
}

function RoleSwitcher({
  mode,
  canUseArtist,
  artistRoleStatus,
  onChange,
}: {
  mode: ProfileMode;
  canUseArtist: boolean;
  artistRoleStatus: ArtistApprovalStatus;
  onChange: (m: ProfileMode) => void;
}) {
  const options: { id: ProfileMode; title: string; desc: string; role: typeof ROLE.fan; locked?: boolean }[] = [
    { id: "fan", title: "Fan", desc: "Back artists, invite talent, earn rep", role: ROLE.fan },
    {
      id: "artist",
      title: "Artist",
      desc: canUseArtist
        ? "Enter battles and win venue slots"
        : artistRoleStatus === "pending"
          ? "Verification in review"
          : "Apply once to unlock this view",
      role: ROLE.artist,
      locked: !canUseArtist,
    },
  ];

  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700", marginBottom: SPACE.sm, letterSpacing: 1 }}>VIEW AS</Text>
      <View style={{ flexDirection: "row", gap: SPACE.sm }}>
        {options.map((opt) => {
          const active = mode === opt.id;
          const disabled = !!opt.locked;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => !disabled && onChange(opt.id)}
              activeOpacity={disabled ? 1 : 0.7}
              style={{
                flex: 1,
                backgroundColor: active ? opt.role.bg : C.surface,
                borderRadius: 18,
                padding: SPACE.md,
                borderWidth: 2,
                borderColor: active ? opt.role.border : C.border,
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACE.xs }}>
                <Text style={{ color: active ? opt.role.primary : C.dim, fontWeight: "900", fontSize: 15 }}>{opt.title}</Text>
                {disabled ? <Text style={{ color: C.dim, fontSize: 14 }}>🔒</Text> : active ? <Text style={{ color: opt.role.primary, fontSize: 12 }}>●</Text> : null}
              </View>
              <Text style={{ color: active ? opt.role.soft : C.muted, fontSize: 11, lineHeight: 16, fontWeight: "600" }}>{opt.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProfileActionRow({
  title,
  subtitle,
  onPress,
  accent,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  accent: typeof ROLE.fan;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderRadius: 18,
        padding: SPACE.md,
        marginBottom: SPACE.sm,
        borderWidth: 1,
        borderColor: accent.border,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>{title}</Text>
        <Text style={{ color: C.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{subtitle}</Text>
      </View>
      <Text style={{ color: accent.primary, fontWeight: "900", fontSize: 18 }}>→</Text>
    </TouchableOpacity>
  );
}

function LiveBadgeStatic() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ef444420",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: "#ef444470",
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#ef4444aa",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 6,
          backgroundColor: "#ef444410",
        }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" }} />
        <View
          style={{
            position: "absolute",
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#ef444455",
          }}
        />
      </View>
      <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>라이브</Text>
    </View>
  );
}

const HERO_HEIGHT = 380;
const HERO_CONTENT_PAD_TOP = 52;
const HERO_CONTENT_PAD_BOTTOM = 40;
const HERO_SLIDES = ["home", "branding", "rules"] as const;
const HERO_SLIDE_LABELS = ["시작", "소개", "방식"];
const HERO_SLIDE_HINTS = ["브랜드 소개", "성사 방식", "다시 처음"];

function HeroPagerDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: SPACE.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 7,
            height: 7,
            borderRadius: 999,
            marginHorizontal: 4,
            backgroundColor: i === active ? ROLE.fan.primary : C.border,
          }}
        />
      ))}
    </View>
  );
}

function HeroSlideShell({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <View style={{ backgroundColor: "#070d18", height: HERO_HEIGHT, overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, backgroundColor: accent ?? "#0f172a", opacity: 0.4 }} />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: "12%",
          right: "12%",
          height: 1,
          backgroundColor: accent ?? ROLE.fan.primary,
          opacity: 0.25,
        }}
      />
      <View style={{ paddingHorizontal: SPACE.lg, paddingTop: HERO_CONTENT_PAD_TOP, paddingBottom: HERO_CONTENT_PAD_BOTTOM }}>{children}</View>
    </View>
  );
}

function HeroLiveDemandBadge() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#14532d",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: ROLE.fan.border,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ROLE.fan.primary, marginRight: 8 }} />
      <Text style={{ color: ROLE.fan.soft, fontWeight: "900", fontSize: 12 }}>실시간 성사 중</Text>
    </View>
  );
}

function HeroHomeSlide() {
  const player = useVideoPlayer(HERO_BG_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const restartHeroVideo = useCallback(() => {
    player.muted = true;
    player.loop = true;
    player.play();
  }, [player]);

  useEffect(() => {
    restartHeroVideo();
    const resumeTimer = setTimeout(restartHeroVideo, 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") restartHeroVideo();
    });
    return () => {
      clearTimeout(resumeTimer);
      subscription.remove();
    };
  }, [restartHeroVideo]);

  return (
    <View style={{ backgroundColor: "#070d18", height: HERO_HEIGHT, overflow: "hidden" }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7, 13, 24, 0.58)" }]} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, backgroundColor: "rgba(15, 23, 42, 0.35)" }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "rgba(34, 197, 94, 0.06)" }} />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: "12%",
          right: "12%",
          height: 1,
          backgroundColor: ROLE.fan.primary,
          opacity: 0.25,
        }}
      />
      <View style={{ paddingHorizontal: SPACE.lg, paddingTop: HERO_CONTENT_PAD_TOP, paddingBottom: HERO_CONTENT_PAD_BOTTOM }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ color: C.dim, fontWeight: "700", fontSize: 10, letterSpacing: 3.2 }}>FANSTAGE · SEOUL</Text>
          <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 11 }}>밀어서 보기 →</Text>
        </View>
        <Text style={{ color: C.text, fontSize: 30, fontWeight: "900", lineHeight: 38, marginTop: 20, letterSpacing: -0.8, maxWidth: 340 }}>
          {FANSTAGE_HERO_MAIN}
        </Text>
        <Text style={{ color: ROLE.fan.soft, fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 320, fontWeight: "600" }}>
          {FANSTAGE_HERO_SUB}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 22, alignItems: "center" }}>
          <HeroLiveDemandBadge />
          <Text style={{ color: C.dim, marginLeft: 14, fontWeight: "600", fontSize: 12, letterSpacing: 0.3 }}>
            팬이 무대를 만든다 · 서울
          </Text>
        </View>
      </View>
    </View>
  );
}

function HeroBrandingSlide() {
  return (
    <HeroSlideShell accent="#3b0764">
      <Text style={{ color: C.rival, fontWeight: "700", fontSize: 10, letterSpacing: 3.2 }}>팬스테이지</Text>
      <Text style={{ color: C.text, fontSize: 26, fontWeight: "900", lineHeight: 32, marginTop: 10, letterSpacing: -0.5 }}>
        {FANSTAGE_TAGLINE}
      </Text>
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: SPACE.sm }}>
        당신의 선택이 오늘의 무대를 만듭니다
      </Text>
      <View style={{ marginTop: SPACE.md }}>
        {[
          { icon: "♪", title: "팬이 이끕니다", body: "당신의 선택이 무대에 오를 팀을 정합니다." },
          { icon: "◎", title: "공연장이 열립니다", body: "실제 공연장, 장르별 성사 무대." },
          { icon: "✦", title: "무대가 성사됩니다", body: "가장 많은 지지를 받은 팀이 헤드라인 무대에 오릅니다." },
        ].map((item) => (
          <View key={item.title} style={{ flexDirection: "row", marginBottom: SPACE.sm, alignItems: "center" }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                backgroundColor: C.surface,
                alignItems: "center",
                justifyContent: "center",
                marginRight: SPACE.sm,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 12 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 13 }}>{item.title}</Text>
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </HeroSlideShell>
  );
}

function HeroRulesSlide() {
  return (
    <HeroSlideShell accent="#422006">
      <Text style={{ color: C.gold, fontWeight: "700", fontSize: 10, letterSpacing: 3.2 }}>무대 성사 방식</Text>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: "900", lineHeight: 28, marginTop: 10, letterSpacing: -0.4 }}>
        팬이 무대를 만드는 법
      </Text>
      <Text style={{ color: ROLE.fan.soft, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: SPACE.sm, fontWeight: "600" }}>
        공연장마다 한 팬, 한 선택. 당신의 선택이 라인업을 정합니다.
      </Text>
      {[
        `공연장별 1회 선택 · 보증금 ${BACKING_PRICE}`,
        "공연장 장르에 맞는 팀만 참여",
        "가장 많은 지지가 무대 확정 · 참여자 티켓",
        "선택한 팀이 성사되지 않으면 환불",
      ].map((rule) => (
        <View key={rule} style={{ flexDirection: "row", marginBottom: 6, alignItems: "flex-start" }}>
          <Text style={{ color: ROLE.fan.primary, fontWeight: "900", marginRight: 8, fontSize: 12, lineHeight: 18 }}>·</Text>
          <Text style={{ color: "#cbd5e1", flex: 1, lineHeight: 18, fontSize: 13, fontWeight: "600" }}>{rule}</Text>
        </View>
      ))}
    </HeroSlideShell>
  );
}

function LandingHero() {
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = screenWidth - SPACE.md * 2;
  const [activePage, setActivePage] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setActivePage(page);
  };

  return (
    <View style={{ marginTop: SPACE.lg, marginBottom: SPACE.xl }}>
      <View style={{ borderRadius: 24, overflow: "hidden" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          <View style={{ width: pageWidth, height: HERO_HEIGHT }}>
            <HeroHomeSlide />
          </View>
          <View style={{ width: pageWidth, height: HERO_HEIGHT }}>
            <HeroBrandingSlide />
          </View>
          <View style={{ width: pageWidth, height: HERO_HEIGHT }}>
            <HeroRulesSlide />
          </View>
        </ScrollView>
      </View>
      <HeroPagerDots count={HERO_SLIDES.length} active={activePage} />
      <Text style={{ color: C.dim, textAlign: "center", marginTop: SPACE.xs, fontSize: 11, fontWeight: "700" }}>
        {HERO_SLIDE_LABELS[activePage]} · {activePage < HERO_SLIDES.length - 1 ? HERO_SLIDE_HINTS[activePage] : HERO_SLIDE_HINTS[2]}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: active ? accent : C.card,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginRight: SPACE.sm,
        marginBottom: SPACE.sm,
        borderWidth: 1,
        borderColor: active ? accent : C.border,
      }}
    >
      <Text style={{ color: active ? C.ink : C.muted, fontWeight: "800", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function UnfoldableFilters({
  genreFilter,
  onGenreFilterChange,
  district,
  onDistrictChange,
  statusFilter,
  onStatusFilterChange,
}: {
  genreFilter: GenreFilter;
  onGenreFilterChange: (g: GenreFilter) => void;
  district: DistrictFilter;
  onDistrictChange: (d: DistrictFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = [genreFilter !== "All", district !== "전체", statusFilter !== "All"].filter(Boolean).length;

  return (
    <View style={{ marginBottom: SPACE.xl }}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: C.surface,
          borderRadius: 14,
          paddingHorizontal: SPACE.md,
          paddingVertical: 16,
          borderWidth: 1,
          borderColor: activeCount > 0 ? ROLE.fan.border : "#ffffff0d",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>필터</Text>
          {activeCount > 0 ? (
            <View style={{ backgroundColor: ROLE.fan.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: SPACE.sm, borderWidth: 1, borderColor: ROLE.fan.border }}>
              <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 11 }}>{activeCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: C.accentSoft, fontWeight: "800" }}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: SPACE.md, marginTop: SPACE.sm, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, letterSpacing: 1 }}>장르</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {GENRE_CHIPS.map((chip) => (
              <FilterChip
                key={chip}
                label={genreFilterKo(chip)}
                active={genreFilter === chip}
                accent={chip === "All" ? C.muted : genreTheme(chip).primary}
                onPress={() => onGenreFilterChange(chip)}
              />
            ))}
          </View>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, marginTop: SPACE.xs, letterSpacing: 1 }}>지역</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(["전체", ...DISTRICT_CHIPS] as DistrictFilter[]).map((chip) => (
              <FilterChip key={chip} label={chip} active={district === chip} accent={ROLE.fan.primary} onPress={() => onDistrictChange(chip)} />
            ))}
          </View>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, marginTop: SPACE.xs, letterSpacing: 1 }}>상태</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(["All", "Heating up", "Almost unlocked", "Slot won"] as StatusFilter[]).map((chip) => (
              <FilterChip
                key={chip}
                label={statusFilterKo(chip)}
                active={statusFilter === chip}
                accent={chip === "Slot won" ? ROLE.fan.primary : chip === "Almost unlocked" ? C.gold : ROLE.artist.primary}
                onPress={() => onStatusFilterChange(chip)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CountdownPill({ venue }: { venue: VenueCompetition }) {
  const ended = venue.winnerId;
  return (
    <View style={{ backgroundColor: ended ? C.border : "#2d1f4e", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ color: ended ? C.dim : C.rival, fontWeight: "900", fontSize: 13 }}>
        {ended ? "예매 확정" : formatCountdownUntil(venue.countdown)}
      </Text>
      <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700", marginTop: 2 }}>{ended ? "승자 확정" : "참여 마감"}</Text>
    </View>
  );
}

function LeaderboardRow({
  artist,
  rank,
  maxSupporters,
  isWinner,
  isLeading,
  isUserPick,
  blockedByOtherPick,
  onPress,
  onPick,
}: {
  artist: CompetingArtist;
  rank: number;
  maxSupporters: number;
  isWinner: boolean;
  isLeading: boolean;
  isUserPick: boolean;
  blockedByOtherPick: boolean;
  onPress: () => void;
  onPick: () => void;
}) {
  const pct = maxSupporters > 0 ? (artist.supporters / maxSupporters) * 100 : 0;
  const highlight = isWinner || isLeading;

  const row = (
    <View
      style={{
        backgroundColor: highlight ? "#1f2f4a" : C.surface,
        borderRadius: 20,
        padding: SPACE.md,
        marginBottom: SPACE.sm,
        borderWidth: highlight ? 1.5 : 1,
        borderColor: isWinner ? C.accent : isLeading ? C.gold + "88" : C.border,
      }}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACE.sm }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: rank === 1 ? C.gold : C.border,
              alignItems: "center",
              justifyContent: "center",
              marginRight: SPACE.sm,
            }}
          >
            <Text style={{ color: rank === 1 ? C.ink : C.muted, fontWeight: "900" }}>#{rank}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: "900" }}>{artist.name}</Text>
              {isWinner ? (
                <View style={{ backgroundColor: "#14532d", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: SPACE.xs }}>
                  <Text style={{ color: C.accent, fontWeight: "800", fontSize: 10 }}>승자</Text>
                </View>
              ) : isLeading ? (
                <View style={{ backgroundColor: "#422006", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: SPACE.xs }}>
                  <Text style={{ color: C.gold, fontWeight: "800", fontSize: 10 }}>1위</Text>
                </View>
              ) : null}
              {isUserPick ? (
                <View style={{ backgroundColor: ROLE.fan.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: SPACE.xs, borderWidth: 1, borderColor: ROLE.fan.border }}>
                  <Text style={{ color: ROLE.fan.primary, fontWeight: "800", fontSize: 10 }}>내 선택</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: C.muted, marginTop: 4 }}>{artist.genre}</Text>
          </View>
          <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 18 }}>{artist.supporters}</Text>
        </View>
        <View style={{ height: 6, backgroundColor: C.border, borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
          <View style={{ width: `${pct}%`, height: "100%", backgroundColor: isWinner ? C.accent : isLeading ? C.gold : C.dim }} />
        </View>
        <Text style={{ color: C.dim, fontSize: 12, fontWeight: "700" }}>지지 {artist.supporters}명</Text>
      </TouchableOpacity>

      {!isWinner ? (
        <View style={{ marginTop: SPACE.sm, alignItems: "center" }}>
          {isUserPick ? (
            <Text style={{ color: C.dim, fontSize: 12, fontWeight: "600", textAlign: "center", paddingVertical: 8 }}>
              내가 서포트 중인 팀
            </Text>
          ) : blockedByOtherPick ? (
            <Text style={{ color: C.dim, fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 18, paddingVertical: 8 }}>
              다른 팀을 선택하려면 현재 선택을 취소하세요
            </Text>
          ) : (
            <TouchableOpacity
              onPress={onPick}
              style={{
                alignSelf: "stretch",
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: C.ink, fontWeight: "900", fontSize: 14 }}>이 팀 선택 · {BACKING_PRICE}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );

  return <WinnerGlow active={isWinner}>{row}</WinnerGlow>;
}

// ——— Venue feed ———

function posterAccent(genre: SlotGenre) {
  const g = genreTheme(genre);
  return { stripe: g.primary, wash: g.wash };
}

function artistInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CompactLineupArtistRow({
  artist,
  isUserPick,
  blockedByOtherPick,
  onPress,
  onPick,
}: {
  artist: CompetingArtist;
  isUserPick: boolean;
  blockedByOtherPick: boolean;
  onPress: () => void;
  onPick: () => void;
}) {
  return (
    <View
      style={{
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#ffffff0d",
        backgroundColor: isUserPick ? "#22c55e12" : "transparent",
        borderRadius: isUserPick ? 10 : 0,
        paddingHorizontal: isUserPick ? 6 : 0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isUserPick ? ROLE.fan.bg : C.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: SPACE.sm,
            borderWidth: isUserPick ? 1 : 0,
            borderColor: ROLE.fan.border,
          }}
        >
          <Text style={{ color: isUserPick ? ROLE.fan.primary : C.muted, fontWeight: "900", fontSize: 11 }}>
            {artistInitials(artist.name)}
          </Text>
        </View>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1, paddingRight: SPACE.sm }}>
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }} numberOfLines={1}>
            {artist.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 2 }}>
            지지 {artist.supporters}명
          </Text>
        </TouchableOpacity>
        <View style={{ alignItems: "flex-end", maxWidth: 128 }}>
          {isUserPick ? (
            <>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: ROLE.fan.bg,
                  borderWidth: 1,
                  borderColor: ROLE.fan.border,
                }}
              >
                <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 11 }}>내 선택</Text>
              </View>
            </>
          ) : blockedByOtherPick ? (
            <Text style={{ color: C.dim, fontSize: 10, fontWeight: "600", lineHeight: 15, textAlign: "right" }}>
              다른 팀을 선택하려면{"\n"}현재 선택을 취소하세요
            </Text>
          ) : (
            <TouchableOpacity
              onPress={onPick}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: C.accent,
              }}
            >
              <Text style={{ color: C.ink, fontWeight: "900", fontSize: 11 }}>이 팀 선택</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const PARTICIPATING_CARD_HEIGHT = 268;

const participatingCardStyles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    marginBottom: SPACE.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ROLE.fan.border,
  },
  image: {
    minHeight: PARTICIPATING_CARD_HEIGHT,
    justifyContent: "flex-end",
  },
  imageRadius: {
    borderRadius: 15,
    width: "100%",
    height: PARTICIPATING_CARD_HEIGHT + 72,
    top: -36,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 12, 22, 0.28)",
  },
  gradientMid: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "72%",
    backgroundColor: "rgba(3, 8, 14, 0.52)",
  },
  gradientBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    backgroundColor: "rgba(2, 6, 12, 0.92)",
  },
  body: {
    padding: SPACE.md,
    minHeight: PARTICIPATING_CARD_HEIGHT,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: ROLE.fan.soft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  headline: {
    color: C.text,
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  venueLine: {
    color: "rgba(226, 232, 240, 0.88)",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 6,
  },
  metric: {
    color: "rgba(203, 213, 225, 0.92)",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  schedule: {
    color: "rgba(148, 163, 184, 0.95)",
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  cta: {
    marginTop: SPACE.md,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: ROLE.fan.primary,
  },
  ctaLabel: {
    color: ROLE.fan.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  qrBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    zIndex: 3,
  },
});

function ParticipatingVenueCard({
  venue,
  userPickId,
  wonTickets,
  onOpenArtist,
  onOpenTicketQr,
  onQrPending,
  onInviteFriend,
}: {
  venue: VenueCompetition;
  userPickId: string;
  wonTickets: Ticket[];
  onOpenArtist: (artist: CompetingArtist) => void;
  onOpenTicketQr: (ticket: Ticket) => void;
  onQrPending: () => void;
  onInviteFriend?: () => void;
}) {
  const sorted = sortedArtists(venue);
  const total = totalSupporters(venue);
  const pickedArtist = sorted.find((a) => a.id === userPickId);
  if (!pickedArtist) return null;

  const inOnecoreCampaign = isVenueOnecoreInProgress(venue);
  const { leader, cores } = getVenueOnecoreLeaderStats(venue);
  const discoverBadge = getVenueDiscoverBadge(venue);
  const entryTicket = findVenueEntryTicket(venue, userPickId, wonTickets);
  const stageLabel = inOnecoreCampaign ? discoverBadge : participationStageLabel(getVenueDemandPhase(venue, total), !!entryTicket);
  const metricLine = inOnecoreCampaign
    ? `1위 ${leader.name} 기준 ${cores} / ${ONECORE_SOLO_CORE_GOAL}명`
    : venueParticipatingCardMetric(total, venue.minGoal, venue.capacity, getVenueDemandPhase(venue, total));
  const subline = inOnecoreCampaign ? venueOnecoreProgressLine(venue) : null;
  const ctaLabel = inOnecoreCampaign ? "이 팀 밀기" : participationCardCtaLabel(getVenueDemandPhase(venue, total), !!entryTicket);

  const handleQrPress = () => {
    if (entryTicket) onOpenTicketQr(entryTicket);
    else onQrPending();
  };

  return (
    <View style={participatingCardStyles.shell}>
      <ImageBackground
        source={{ uri: venuePosterUri(venue) }}
        style={participatingCardStyles.image}
        imageStyle={participatingCardStyles.imageRadius}
        resizeMode="cover"
      >
        <View style={participatingCardStyles.veil} />
        <View style={participatingCardStyles.gradientMid} />
        <View style={participatingCardStyles.gradientBottom} />
        {!inOnecoreCampaign && entryTicket ? (
          <TouchableOpacity
            onPress={handleQrPress}
            style={participatingCardStyles.qrBtn}
            activeOpacity={0.85}
            accessibilityLabel="입장 QR 보기"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <QrMarkIcon size={18} color="rgba(255, 255, 255, 0.9)" />
          </TouchableOpacity>
        ) : null}
        <View style={participatingCardStyles.body}>
          <View>
            <Text style={participatingCardStyles.eyebrow}>{stageLabel}</Text>
            <Text style={participatingCardStyles.headline}>{pickedArtist.name}와 함께 만드는 무대</Text>
            <Text style={participatingCardStyles.venueLine}>
              {venue.venueName} · {venue.district}
            </Text>
            <Text style={participatingCardStyles.metric}>{metricLine}</Text>
            {subline ? (
              <Text style={[participatingCardStyles.schedule, { color: "rgba(255,255,255,0.88)", marginTop: 4 }]}>
                {subline}
              </Text>
            ) : null}
            <Text style={participatingCardStyles.schedule}>{formatBookingDeadlineTension(venue.countdown)}</Text>
            <Text style={[participatingCardStyles.schedule, { marginTop: 2 }]}>{formatShowDateCompact(venue)}</Text>
          </View>
          {inOnecoreCampaign ? (
            <View style={{ gap: SPACE.sm }}>
              <TouchableOpacity onPress={() => onOpenArtist(pickedArtist)} style={participatingCardStyles.cta} activeOpacity={0.9}>
                <Text style={participatingCardStyles.ctaLabel}>{ctaLabel}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: SPACE.sm }}>
                <TouchableOpacity
                  onPress={() => onOpenArtist(pickedArtist)}
                  style={[participatingCardStyles.cta, { flex: 1, backgroundColor: "rgba(255,255,255,0.12)" }]}
                  activeOpacity={0.9}
                >
                  <Text style={[participatingCardStyles.ctaLabel, { color: "#fff" }]}>참여하기</Text>
                </TouchableOpacity>
                {onInviteFriend ? (
                  <TouchableOpacity
                    onPress={onInviteFriend}
                    style={[participatingCardStyles.cta, { flex: 1, backgroundColor: "rgba(255,255,255,0.12)" }]}
                    activeOpacity={0.9}
                  >
                    <Text style={[participatingCardStyles.ctaLabel, { color: "#fff" }]}>친구 초대하기</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => onOpenArtist(pickedArtist)} style={participatingCardStyles.cta} activeOpacity={0.9}>
              <Text style={participatingCardStyles.ctaLabel}>{ctaLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

function ExploreVenueCard({
  venue,
  onOpenVenue,
}: {
  venue: VenueCompetition;
  onOpenVenue: () => void;
}) {
  const sorted = sortedArtists(venue);
  const total = totalSupporters(venue);
  const g = genreTheme(venue.slotGenre);
  const { leader, cores } = getVenueOnecoreLeaderStats(venue);
  const discoverBadge = getVenueDiscoverBadge(venue);
  const progressPct = Math.min(100, Math.round((cores / ONECORE_SOLO_CORE_GOAL) * 100));
  return (
    <View
      style={{
        borderRadius: 18,
        marginBottom: SPACE.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: "#0c1016",
      }}
    >
      <View style={{ height: 2, backgroundColor: g.primary, opacity: 0.45 }} />
      <View style={{ padding: SPACE.md }}>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, lineHeight: 26, letterSpacing: -0.3 }}>
          {formatVenueLineupHeadline(sorted)}
        </Text>
        <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13, marginTop: 6, lineHeight: 18 }}>
          {formatVenueLineupMeta(venue, sorted.length)}
        </Text>

        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: SPACE.sm + 2,
            marginTop: SPACE.md,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: g.primary, fontWeight: "800", fontSize: 11, letterSpacing: 0.2 }}>
            {discoverBadge}
          </Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 19, lineHeight: 26, marginTop: 6, letterSpacing: -0.3 }}>
            1위 {leader.name} {cores} / {ONECORE_SOLO_CORE_GOAL}명
          </Text>
          <Text style={{ color: C.muted, marginTop: 5, fontSize: 12, fontWeight: "600", lineHeight: 17 }}>
            {venueOnecoreProgressLine(venue)}
          </Text>
          <View style={{ height: 8, backgroundColor: C.border, borderRadius: 999, marginTop: SPACE.sm, overflow: "hidden" }}>
            <View style={{ width: `${progressPct}%`, height: "100%", backgroundColor: g.primary }} />
          </View>
          <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 11, fontWeight: "600" }}>
            전체 참여 {total}명 · {sorted.length}팀 경쟁
          </Text>
        </View>

        <Text style={{ color: C.dim, marginTop: SPACE.md, fontSize: 12, fontWeight: "600" }}>
          {formatBookingDeadlineTension(venue.countdown)}
        </Text>
        <Text style={{ color: C.dim, marginTop: 2, fontSize: 12, fontWeight: "600" }}>{formatShowDateCompact(venue)}</Text>

        <Pressable
          onPress={onOpenVenue}
          style={({ pressed }) => [
            {
              marginTop: SPACE.md,
              backgroundColor: g.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: 0.92,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text style={{ color: C.ink, fontWeight: "900", fontSize: 14 }}>참여하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ClosedVenueCard({ venue, userPickId }: { venue: VenueCompetition; userPickId?: string }) {
  const sorted = sortedArtists(venue);
  const total = totalSupporters(venue);
  const phase = getVenueDemandPhase(venue, total);
  const winner = venue.winnerId ? sorted.find((a) => a.id === venue.winnerId) : undefined;
  const picked = userPickId ? sorted.find((a) => a.id === userPickId) : undefined;

  return (
    <View
      style={{
        borderRadius: 14,
        marginBottom: SPACE.sm,
        padding: SPACE.md,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        opacity: 0.92,
      }}
    >
      <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11 }}>
        {phase === "sold_out" ? "매진" : "공연 마감"}
      </Text>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15, marginTop: 4 }}>
        {venue.venueName} · {winner?.name ?? genreKo(venue.slotGenre)}
      </Text>
      {picked ? (
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>내 선택: {picked.name}</Text>
      ) : null}
      <Text style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{formatBookingDeadlineTension(venue.countdown)}</Text>
      <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{formatShowDateCompact(venue)}</Text>
    </View>
  );
}

function MyParticipatingSection({
  venues,
  venueBackings,
  wonTickets,
  onOpenArtist,
  onOpenTicketQr,
  onQrPending,
  onInviteFriend,
}: {
  venues: VenueCompetition[];
  venueBackings: Record<string, string>;
  wonTickets: Ticket[];
  onOpenArtist: (v: VenueCompetition, a: CompetingArtist) => void;
  onOpenTicketQr: (ticket: Ticket) => void;
  onQrPending: () => void;
  onInviteFriend: (venue: VenueCompetition, artist: CompetingArtist) => void;
}) {
  if (venues.length === 0) return null;

  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, lineHeight: 26 }}>진행 중</Text>
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: SPACE.md }}>
        아직 100코어를 향해 가는 공연만 · 내가 밀고 있는 무대
      </Text>
      {venues.map((venue) => {
        const pickId = venueBackings[venue.id];
        if (!pickId) return null;
        const artist = venue.artists.find((a) => a.id === pickId);
        if (!artist) return null;
        return (
          <ParticipatingVenueCard
            key={venue.id}
            venue={venue}
            userPickId={pickId}
            wonTickets={wonTickets}
            onOpenArtist={(a) => onOpenArtist(venue, a)}
            onOpenTicketQr={onOpenTicketQr}
            onQrPending={onQrPending}
            onInviteFriend={() => onInviteFriend(venue, artist)}
          />
        );
      })}
    </View>
  );
}

function DiscoverFeedHeading({ count }: { count: number }) {
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 22, lineHeight: 28 }}>진행 중</Text>
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
        아직 100코어를 향해 가는 공연만{count > 0 ? ` · ${count}개` : ""}
      </Text>
    </View>
  );
}

function VenueFeedScreen({
  district,
  onDistrictChange,
  genreFilter,
  onGenreFilterChange,
  statusFilter,
  onStatusFilterChange,
  venues,
  venueBackings,
  wonTickets,
  onOpenVenue,
  onOpenArtist,
  onBackArtist,
  onOpenTicketQr,
  onQrPending,
  onInviteFriend,
  onecoreRaces,
  onOpenOnecoreRace,
}: {
  district: DistrictFilter;
  onDistrictChange: (d: DistrictFilter) => void;
  genreFilter: GenreFilter;
  onGenreFilterChange: (g: GenreFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  venues: VenueCompetition[];
  venueBackings: Record<string, string>;
  wonTickets: Ticket[];
  onOpenVenue: (v: VenueCompetition) => void;
  onOpenArtist: (v: VenueCompetition, a: CompetingArtist) => void;
  onBackArtist: (v: VenueCompetition, a: CompetingArtist) => void;
  onOpenTicketQr: (ticket: Ticket) => void;
  onQrPending: () => void;
  onInviteFriend: (venue: VenueCompetition, artist: CompetingArtist) => void;
  onecoreRaces: { race: Race; artistName: string; artistGenre: string }[];
  onOpenOnecoreRace: (raceId: string) => void;
}) {
  const myActive = venues.filter((v) => {
    const pick = venueBackings[v.id];
    if (!pick) return false;
    return isVenueOnecoreInProgress(v);
  });
  const discoverActive = venues.filter((v) => {
    if (venueBackings[v.id]) return false;
    return isVenueOnecoreInProgress(v);
  });

  return (
    <>
      <LandingHero />

      {onecoreRaces.length > 0 ? (
        <View style={{ marginBottom: SPACE.lg }}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, lineHeight: 26 }}>ONECORE 제안</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: SPACE.md, lineHeight: 19 }}>
            100명의 코어가 모이면, 한 팀의 밤이 공연 준비 단계로 넘어갑니다
          </Text>
          {onecoreRaces.map(({ race, artistName, artistGenre }) => (
            <OnecoreRaceCard
              key={race.id}
              race={race}
              artist={{ id: race.artistId, name: artistName, genre: artistGenre, bio: "", tagline: "" }}
              onPress={() => onOpenOnecoreRace(race.id)}
            />
          ))}
        </View>
      ) : null}

      <MyParticipatingSection
        venues={myActive}
        venueBackings={venueBackings}
        wonTickets={wonTickets}
        onOpenArtist={onOpenArtist}
        onOpenTicketQr={onOpenTicketQr}
        onQrPending={onQrPending}
        onInviteFriend={onInviteFriend}
      />

      <UnfoldableFilters
        genreFilter={genreFilter}
        onGenreFilterChange={onGenreFilterChange}
        district={district}
        onDistrictChange={onDistrictChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />

      {venues.length === 0 ? (
        <Text style={{ color: C.muted, textAlign: "center", padding: SPACE.xl }}>필터에 맞는 공연이 없습니다.</Text>
      ) : (
        <>
            {discoverActive.length > 0 ? (
              <>
                <DiscoverFeedHeading count={discoverActive.length} />
                {discoverActive.map((venue) => (
                  <ExploreVenueCard key={venue.id} venue={venue} onOpenVenue={() => onOpenVenue(venue)} />
                ))}
              </>
            ) : myActive.length > 0 ? (
              <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: SPACE.lg }}>
                참여 중인 무대만 보입니다. 성사된 공연은 Tickets 탭에서 확인하세요.
              </Text>
            ) : null}
        </>
      )}
    </>
  );
}

function BattleVenueHero({ venue, total }: { venue: VenueCompetition; total: number }) {
  const g = genreTheme(venue.slotGenre);
  const leading = sortedArtists(venue)[0];
  return (
    <View style={{ marginBottom: SPACE.sm }}>
      <Text style={{ color: g.primary, fontWeight: "900", fontSize: 14, letterSpacing: 1.1 }}>{genreKo(venue.slotGenre).toUpperCase()}</Text>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 28, letterSpacing: -0.8, marginTop: 2 }}>
        누가 이 밤의 주인공이 될까요?
      </Text>
      <View
        style={{
          marginTop: SPACE.sm,
          backgroundColor: C.surface,
          borderRadius: 14,
          paddingHorizontal: SPACE.md,
          paddingVertical: SPACE.sm,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Text style={{ color: "#c8d1e0", fontSize: 15, lineHeight: 22, fontWeight: "700" }}>
          {formatBattleHeroStatus(venue, total)} · {venue.venueName} · 정원 {venue.capacity}
        </Text>
        {leading ? (
          <Text style={{ color: "#b6c0d0", marginTop: 4, fontSize: 15, lineHeight: 22, fontWeight: "600" }}>
            선두 {leading.name} · {leading.supporters}코어
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function OneCoreRaceProgressBar({ cores, goal, accent }: { cores: number; goal: number; accent: string }) {
  const pct = Math.min(100, Math.round((cores / Math.max(goal, 1)) * 100));
  return (
    <View style={{ marginTop: SPACE.md }}>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: C.border, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: accent, borderRadius: 999 }} />
      </View>
    </View>
  );
}

function CoreRaceCard({
  venue,
  leader,
  total,
  teamCount,
}: {
  venue: VenueCompetition;
  leader: CompetingArtist;
  total: number;
  teamCount: number;
}) {
  const g = genreTheme(venue.slotGenre);
  const goal = ONECORE_SOLO_CORE_GOAL;
  const cores = leader.supporters;
  const toGo = Math.max(0, goal - cores);
  const raceLine =
    toGo > 0 ? `${toGo}코어만 더 모이면 단독 공연 확정` : `${leader.name} 단독 공연 확정`;

  return (
    <ShowCard borderColor={g.primary + "44"}>
      <Text style={{ color: g.primary, fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>CORE RACE</Text>
      <Text style={{ color: C.text, marginTop: SPACE.xs, fontSize: 15, fontWeight: "800" }}>{leader.name}</Text>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 24, marginTop: 2, letterSpacing: -0.4 }}>
        {cores} / {goal}코어
      </Text>
      {toGo > 0 ? (
        <Text style={{ color: C.muted, marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "700" }}>
          {toGo}코어 남음
        </Text>
      ) : null}
      <OneCoreRaceProgressBar cores={cores} goal={goal} accent={g.primary} />
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "800", marginTop: SPACE.sm, lineHeight: 22 }}>{raceLine}</Text>
      <Text style={{ color: C.dim, marginTop: SPACE.xs, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>
        100코어를 먼저 채운 팀이 공연 준비 단계로 넘어갑니다
      </Text>
      <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 12, fontWeight: "600" }}>
        전체 참여 {total}코어 · {teamCount}팀 달리는 중
      </Text>
    </ShowCard>
  );
}

function BattleArtistPitchBlock({ artist, compact }: { artist: CompetingArtist; compact?: boolean }) {
  return (
    <View style={{ marginTop: compact ? SPACE.sm : SPACE.md }}>
      <Text style={{ color: C.dim, fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 4 }}>팬들이 응원할 이유</Text>
      <Text
        style={{ color: C.muted, fontSize: compact ? 13 : 14, lineHeight: compact ? 20 : 22, fontWeight: "600" }}
        numberOfLines={compact ? 2 : 3}
      >
        {artist.battlePitch}
      </Text>
      <BattleArtistSocialProof social={artist.social} compact={compact} sectionLabel="아티스트 확인하기" />
    </View>
  );
}

function BattleLineupSectionHeader({ teamCount }: { teamCount: number }) {
  return (
    <View style={{ marginBottom: SPACE.xs }}>
      <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 11, letterSpacing: 1.1 }}>LINEUP</Text>
      <Text style={{ color: C.gold, marginTop: 4, fontSize: 13, lineHeight: 20, fontWeight: "800" }}>
        {teamCount}팀이 이 밤을 두고 달리고 있어요
      </Text>
    </View>
  );
}

function BattleLeaderRaceCard({
  artist,
  isUserPick,
  blockedByOtherPick,
  isWinner,
  onOpenArtist,
  onPick,
}: {
  artist: CompetingArtist;
  isUserPick: boolean;
  blockedByOtherPick: boolean;
  isWinner: boolean;
  onOpenArtist: () => void;
  onPick: () => void;
}) {
  const goal = ONECORE_SOLO_CORE_GOAL;
  const cores = artist.supporters;
  const toGo = Math.max(0, goal - cores);

  return (
    <View
      style={{
        backgroundColor: isUserPick ? "#13231a" : C.card,
        borderRadius: 20,
        padding: SPACE.md,
        marginBottom: SPACE.sm,
        borderWidth: 1,
        borderColor: isUserPick ? ROLE.fan.border : C.border,
      }}
    >
      <Text style={{ color: C.gold, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 }}>1위 · 선두 팀</Text>
      <TouchableOpacity onPress={onOpenArtist} activeOpacity={0.85}>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 23, marginTop: 4, letterSpacing: -0.3 }}>{artist.name}</Text>
        <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 19, marginTop: 2 }}>{cores}코어</Text>
        <Text style={{ color: C.muted, marginTop: 2, fontSize: 14, fontWeight: "700" }}>
          {toGo > 0 ? `단독 공연까지 ${toGo}코어` : "단독 공연 조건 달성"}
        </Text>
        <Text style={{ color: C.dim, marginTop: 2, fontSize: 12, fontWeight: "600" }}>{artist.genre}</Text>
      </TouchableOpacity>

      <BattleArtistPitchBlock artist={artist} />

      <View style={{ marginTop: SPACE.md }}>
        {isUserPick ? (
          <Text style={{ color: ROLE.fan.soft, fontSize: 14, fontWeight: "800", textAlign: "center", paddingVertical: 14 }}>
            내가 밀고 있는 팀
          </Text>
        ) : blockedByOtherPick ? (
          <Text style={{ color: C.dim, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 20, paddingVertical: 12 }}>
            다른 팀을 밀려면 현재 선택을 취소하세요
          </Text>
        ) : isWinner ? null : (
          <TouchableOpacity
            onPress={onPick}
            style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>
              {artist.name} 밀어주기 · {BACKING_PRICE}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function BattleChaserRaceCard({
  artist,
  rank,
  isUserPick,
  blockedByOtherPick,
  isWinner,
  onOpenArtist,
  onPick,
}: {
  artist: CompetingArtist;
  rank: number;
  isUserPick: boolean;
  blockedByOtherPick: boolean;
  isWinner: boolean;
  onOpenArtist: () => void;
  onPick: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: isUserPick ? "#13231a" : C.surface,
        borderRadius: 14,
        paddingVertical: SPACE.sm,
        paddingHorizontal: SPACE.md,
        marginBottom: SPACE.xs,
        borderWidth: 1,
        borderColor: isUserPick ? ROLE.fan.border : C.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={onOpenArtist} activeOpacity={0.85}>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11 }}>{rank}위</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 2, flexWrap: "wrap" }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>{artist.name}</Text>
            <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 15, marginLeft: SPACE.sm }}>{artist.supporters}코어</Text>
          </View>
          <Text style={{ color: C.dim, fontSize: 12, marginTop: 2, lineHeight: 17 }} numberOfLines={1}>
            {artist.battlePitch}
          </Text>
        </TouchableOpacity>
        <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" showLabel={false} />
      </View>

      {isUserPick ? (
        <Text style={{ color: ROLE.fan.soft, fontSize: 11, fontWeight: "700", paddingTop: 4 }}>서포트 중</Text>
      ) : blockedByOtherPick ? (
        <Text style={{ color: C.dim, fontSize: 11, fontWeight: "600", paddingTop: 4 }}>선택됨</Text>
      ) : isWinner ? null : (
        <TouchableOpacity
          onPress={onPick}
          style={{
            backgroundColor: C.card,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderWidth: 1,
            borderColor: C.border,
            marginLeft: SPACE.sm,
            marginTop: 2,
          }}
        >
          <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 12 }}>밀어주기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BattleArtistSelection({
  venue,
  sorted,
  userPickId,
  onOpenArtist,
  onBackArtist,
}: {
  venue: VenueCompetition;
  sorted: CompetingArtist[];
  userPickId?: string;
  onOpenArtist: (a: CompetingArtist) => void;
  onBackArtist: (a: CompetingArtist) => void;
}) {
  const hasPick = !!userPickId;
  if (sorted.length === 0) return null;

  const [leader, ...chasers] = sorted;

  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <BattleLineupSectionHeader teamCount={sorted.length} />
      <BattleLeaderRaceCard
        artist={leader}
        isUserPick={userPickId === leader.id}
        blockedByOtherPick={hasPick && userPickId !== leader.id && !venue.winnerId}
        isWinner={venue.winnerId === leader.id}
        onOpenArtist={() => onOpenArtist(leader)}
        onPick={() => onBackArtist(leader)}
      />
      {chasers.map((artist, i) => (
        <BattleChaserRaceCard
          key={artist.id}
          artist={artist}
          rank={i + 2}
          isUserPick={userPickId === artist.id}
          blockedByOtherPick={hasPick && userPickId !== artist.id && !venue.winnerId}
          isWinner={venue.winnerId === artist.id}
          onOpenArtist={() => onOpenArtist(artist)}
          onPick={() => onBackArtist(artist)}
        />
      ))}
    </View>
  );
}

function BattleRulesExpandable() {
  const [open, setOpen] = useState(false);

  return (
    <ShowCard>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        activeOpacity={0.85}
      >
        <Text style={{ color: C.dim, fontWeight: "800", fontSize: 12, letterSpacing: 0.4 }}>RULE</Text>
        <Text style={{ color: C.muted, fontWeight: "800", fontSize: 12 }}>{open ? "접기" : "자세히"}</Text>
      </TouchableOpacity>
      <Text style={{ color: C.muted, marginTop: SPACE.sm, fontSize: 13, lineHeight: 20, fontWeight: "600" }}>{ONECORE_RULE_SUMMARY}</Text>
      {open ? (
        <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ color: C.dim, fontSize: 13, lineHeight: 22 }}>{ONECORE_TAGLINE_SHORT}</Text>
          <Text style={{ color: "#cbd5e1", lineHeight: 24, fontSize: 13, marginTop: SPACE.sm }}>
            · 네 팀이 달리지만, 이 밤을 여는 건 100코어를 먼저 채운 한 팀
          </Text>
          <Text style={{ color: ROLE.fan.soft, lineHeight: 24, fontSize: 13, fontWeight: "700", marginTop: SPACE.xs }}>
            · 내가 고른 팀이 1위가 아니어도 공연 성사 시 티켓 발급
          </Text>
          <Text style={{ color: ROLE.fan.soft, lineHeight: 24, fontSize: 13, fontWeight: "700" }}>· 공연 실패 시 전액 환불</Text>
        </View>
      ) : null}
    </ShowCard>
  );
}

function BattleVenueInfoExpandable({
  venue,
  onInvite,
  onApply,
}: {
  venue: VenueCompetition;
  onInvite: () => void;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const g = genreTheme(venue.slotGenre);

  return (
    <ShowCard>
      <TouchableOpacity onPress={() => setOpen((v) => !v)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: C.dim, fontWeight: "800", fontSize: 13 }}>공연장 정보</Text>
        <Text style={{ color: g.primary, fontWeight: "800", fontSize: 13 }}>{open ? "접기" : "펼쳐보기"}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 14, lineHeight: 22 }}>{venue.address}</Text>
          <Text style={{ color: C.muted, marginTop: SPACE.sm, fontSize: 14, lineHeight: 22 }}>
            정원 {venue.capacity} · {genreKo(venue.slotGenre)}
          </Text>
          <Text style={{ color: C.muted, marginTop: SPACE.xs, fontSize: 14 }}>홍대역 도보 8분 · 휠체어 접근 가능</Text>
          <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 13 }}>{venue.slotLabel}</Text>
          {venue.slotsOpen > 0 && !venue.winnerId ? (
            <View style={{ flexDirection: "row", marginTop: SPACE.md, gap: SPACE.sm }}>
              <TouchableOpacity
                onPress={onInvite}
                style={{ flex: 1, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.rival, fontWeight: "800", fontSize: 13 }}>아티스트 초대</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onApply}
                style={{ flex: 1, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 13 }}>배틀 지원</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </ShowCard>
  );
}

function VenueDetailScreen({
  venue,
  userPickId,
  venueInvites,
  venueApplications,
  onBack,
  onOpenArtist,
  onBackArtist,
  onCancelPick,
  onInvite,
  onApply,
}: {
  venue: VenueCompetition;
  userPickId?: string;
  venueInvites: FanInvite[];
  venueApplications: ArtistApplication[];
  onBack: () => void;
  onOpenArtist: (a: CompetingArtist) => void;
  onBackArtist: (a: CompetingArtist) => void;
  onCancelPick: () => void;
  onInvite: () => void;
  onApply: () => void;
}) {
  const sorted = sortedArtists(venue);
  const total = totalSupporters(venue);
  const hasPick = !!userPickId;

  const leader = sorted[0];

  return (
    <>
      <BattleVenueHero venue={venue} total={total} />
      {leader ? <CoreRaceCard venue={venue} total={total} leader={leader} teamCount={sorted.length} /> : null}

      <BattleArtistSelection
        venue={venue}
        sorted={sorted}
        userPickId={userPickId}
        onOpenArtist={onOpenArtist}
        onBackArtist={onBackArtist}
      />

      <BattleRulesExpandable />
      <BattleVenueInfoExpandable venue={venue} onInvite={onInvite} onApply={onApply} />

      {venueInvites.length > 0 ? (
        <View style={{ marginTop: SPACE.md, marginBottom: SPACE.sm }}>
          {venueInvites.map((inv) => (
            <Text key={inv.id} style={{ color: C.dim, fontSize: 12 }}>
              초대: {inv.profileId}
            </Text>
          ))}
        </View>
      ) : null}

      {hasPick && !venue.winnerId ? (
        <View style={{ alignItems: "center", marginTop: SPACE.md, marginBottom: SPACE.xl, paddingTop: SPACE.md }}>
          <TouchableOpacity onPress={onCancelPick} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={{ color: C.dim, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>선택 취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
}

function ArtistConfirmedScreen({
  artist,
  venue,
  isUserPick,
  hasTicket,
  onBack,
  onClaimTicket,
  onInviteFriends,
  onViewSupporterRecord,
}: {
  artist: CompetingArtist;
  venue: VenueCompetition;
  isUserPick: boolean;
  hasTicket: boolean;
  onBack: () => void;
  onClaimTicket: () => void;
  onInviteFriends: () => void;
  onViewSupporterRecord: () => void;
}) {
  const stage = getShowPageStage(venue, artist, hasTicket);
  const demand = buildDemandSurfaceCopy(stage, artist, venue, isUserPick);
  const primaryLabel = getDemandPrimaryAction(stage, artist, isUserPick, hasTicket);

  return (
    <ShowPageShell
      bottom={<ShowBottomActionBar primaryLabel={primaryLabel} onPrimary={onClaimTicket} />}
    >
      <Text style={{ color: C.rival, fontWeight: "800", fontSize: 11, marginBottom: SPACE.md }}>{artistConfirmedEyebrow(artist)}</Text>

      <DemandSurfaceBlock copy={demand} artist={artist} venue={venue} stage={stage} />
      <FanCreditCard artist={artist} isUserPick={isUserPick} />
      <ShowStoryCard artist={artist} venue={venue} />

      <TouchableOpacity onPress={onInviteFriends} style={{ alignItems: "center", paddingVertical: SPACE.sm }}>
        <Text style={{ color: C.dim, fontWeight: "700", fontSize: 13 }}>친구 초대하기</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onViewSupporterRecord} style={{ alignItems: "center", paddingBottom: SPACE.md }}>
        <Text style={{ color: C.dim, fontWeight: "700", fontSize: 13 }}>내 서포터 기록 보기</Text>
      </TouchableOpacity>
    </ShowPageShell>
  );
}

function ArtistDetailScreen({
  artist,
  venue,
  isUserPick,
  hasTicket,
  onBack,
  onBackArtist,
  onCancelPick,
  onClaimTicket,
  onInviteFriends,
  onViewSupporterRecord,
}: {
  artist: CompetingArtist;
  venue: VenueCompetition;
  isUserPick: boolean;
  hasTicket: boolean;
  onBack: () => void;
  onBackArtist: () => void;
  onCancelPick?: () => void;
  onClaimTicket?: () => void;
  onInviteFriends?: () => void;
  onViewSupporterRecord?: () => void;
}) {
  const isWinner = venue.winnerId === artist.id;
  if (isWinner && onClaimTicket && onInviteFriends && onViewSupporterRecord) {
    return (
      <ArtistConfirmedScreen
        artist={artist}
        venue={venue}
        isUserPick={isUserPick}
        hasTicket={hasTicket}
        onBack={onBack}
        onClaimTicket={onClaimTicket}
        onInviteFriends={onInviteFriends}
        onViewSupporterRecord={onViewSupporterRecord}
      />
    );
  }

  const stage = getShowPageStage(venue, artist, hasTicket);
  const demand = buildDemandSurfaceCopy(stage, artist, venue, isUserPick);
  const primaryLabel = getDemandPrimaryAction(stage, artist, isUserPick, hasTicket);
  const inviteAction = stage === "almost_there" || (isUserPick && stage === "recruiting");
  const onPrimary =
    inviteAction && onInviteFriends ? onInviteFriends : onBackArtist;
  const showBottomBar = !isUserPick || inviteAction || stage === "recruiting";

  return (
    <ShowPageShell
      bottom={
        showBottomBar ? (
          <ShowBottomActionBar
            primaryLabel={primaryLabel}
            onPrimary={onPrimary}
            hint={!inviteAction ? "성사되면 티켓으로 전환 · 실패하면 환불" : undefined}
          />
        ) : undefined
      }
    >
      <Text style={{ color: C.rival, fontWeight: "800", fontSize: 11, marginBottom: SPACE.md }}>{artistCampaignEyebrow(artist)}</Text>

      <DemandSurfaceBlock copy={demand} artist={artist} venue={venue} stage={stage} />

      <ShowCard>
        <BattleArtistPitchBlock artist={artist} />
      </ShowCard>

      {isUserPick && stage !== "almost_there" ? (
        <ShowCard>
          <Text style={{ color: ROLE.fan.soft, fontWeight: "700", fontSize: 14, lineHeight: 22 }}>
            예치 완료 · {Math.max(0, demand.goal - demand.current)}명만 더 모이면 무대가 열립니다
          </Text>
        </ShowCard>
      ) : null}

      <ShowStoryCard artist={artist} venue={venue} />

      {isUserPick && onCancelPick ? (
        <View style={{ alignItems: "center", paddingVertical: SPACE.md }}>
          <TouchableOpacity onPress={onCancelPick} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={{ color: C.dim, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>예치 취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ShowPageShell>
  );
}

function BackingFlowScreen({
  artist,
  venue,
  step,
  onBack,
  onConfirmReview,
}: {
  artist: CompetingArtist;
  venue: VenueCompetition;
  step: BackingStep;
  onBack: () => void;
  onConfirmReview: () => void;
}) {
  if (step === "confirmed") {
    return (
      <>
        <ScreenHeader title="Vote locked in" subtitle={`Your pick: ${artist.name} at ${venue.venueName}`} onBack={onBack} />
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.xl, alignItems: "center", marginBottom: SPACE.lg }}>
          <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>⚔️</Text>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "900", textAlign: "center" }}>
            You're in the fight for {artist.name}
          </Text>
          <Text style={{ color: C.muted, marginTop: SPACE.sm, textAlign: "center", lineHeight: 22 }}>
            {BACKING_PRICE} held until the battle ends — you're helping make the stage happen. Win = ticket.
          </Text>
        </View>
        <TouchableOpacity onPress={onConfirmReview} style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}>
          <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>Continue</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Back your pick" subtitle={`${artist.name} · ${venue.venueName}`} onBack={onBack} eyebrow="ONE PICK PER VENUE" />
      <View style={{ backgroundColor: "#2d1f4e", borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md }}>
        <Text style={{ color: C.rival, fontWeight: "800", lineHeight: 22 }}>
          You can only back one artist for this slot. Changing picks isn't allowed once confirmed.
        </Text>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.lg, marginBottom: SPACE.md }}>
        <Text style={{ color: C.muted, fontWeight: "700" }}>Deposit</Text>
        <Text style={{ color: C.text, fontSize: 44, fontWeight: "900" }}>{BACKING_PRICE}</Text>
        <Text style={{ color: C.accentSoft, marginTop: SPACE.sm, fontWeight: "700" }}>Refunded if {artist.name} doesn't win</Text>
      </View>
      <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md }}>
        <Text style={{ color: C.text, fontWeight: "900", marginBottom: SPACE.sm }}>Competition rules</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· Highest backer count wins the {venue.venueName} booking</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· Voting closes in {formatCountdown(venue.countdown)}</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· Winner's supporters → ticket holders</Text>
      </View>
      <TouchableOpacity onPress={onConfirmReview} style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}>
        <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>Confirm {BACKING_PRICE} for {artist.name}</Text>
      </TouchableOpacity>
    </>
  );
}

function BackingConfirmationScreen({
  artist,
  venue,
  onViewTickets,
  onFeed,
}: {
  artist: CompetingArtist;
  venue: VenueCompetition;
  onViewTickets: () => void;
  onFeed: () => void;
}) {
  const sorted = sortedArtists(venue);
  const rank = sorted.findIndex((a) => a.id === artist.id) + 1;
  const { remaining } = campaignPledgeStats(artist.supporters, venue.minGoal);
  const deadlineText = countdownEnded(venue.countdown) ? "마감됐어요." : `마감까지 ${formatCountdown(venue.countdown)} 남았어요.`;
  const backingContext =
    remaining > 0
      ? `#${rank} · ${venue.venueName}. ${remaining}명만 더 모이면 최소 성사 기준을 넘어요.`
      : `#${rank} · ${venue.venueName}. 최소 성사 기준을 넘었고, ${deadlineText}`;

  return (
    <>
      <View style={{ alignItems: "center", paddingTop: SPACE.xl, marginBottom: SPACE.lg }}>
        <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>🎯</Text>
        <Text style={{ color: C.accentSoft, fontWeight: "800" }}>픽 등록 완료</Text>
        <Text style={{ color: C.text, fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: SPACE.sm }}>
          {artist.name}를 밀고 있어요
        </Text>
        <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 24, paddingHorizontal: SPACE.md }}>
          {backingContext}
        </Text>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg }}>
        <Text style={{ color: C.muted, fontWeight: "700", lineHeight: 22 }}>{venueBattleSummary(venue)}</Text>
      </View>
      <TouchableOpacity onPress={onViewTickets} style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: SPACE.sm }}>
        <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>내 픽 보기</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onFeed} style={{ paddingVertical: SPACE.md, alignItems: "center" }}>
        <Text style={{ color: C.accentSoft, fontWeight: "800" }}>다른 공연장 배틀 보기</Text>
      </TouchableOpacity>
    </>
  );
}

function QrMock({ code }: { code: string }) {
  const cells = code.split("").map((ch, i) => (ch.charCodeAt(0) + i) % 2 === 0);
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, alignSelf: "center", marginVertical: SPACE.lg }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 168 }}>
        {cells.map((dark, i) => (
          <View key={i} style={{ width: 12, height: 12, margin: 1, backgroundColor: dark ? C.ink : "#e2e8f0" }} />
        ))}
      </View>
      <Text style={{ color: C.ink, textAlign: "center", marginTop: SPACE.sm, fontWeight: "800", fontSize: 11 }}>{code}</Text>
    </View>
  );
}

function TicketStatusPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${color}55` }}>
      <Text style={{ color, fontWeight: "900", fontSize: 10, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

function TicketLifecycleSummary({
  converting,
  ticket,
  past,
  refund,
}: {
  converting: number;
  ticket: number;
  past: number;
  refund: number;
}) {
  const steps = [
    { label: "전환 중", value: converting, color: C.gold },
    { label: "티켓 준비", value: ticket, color: C.accent },
    { label: "지난 공연", value: past, color: C.muted },
    { label: "환불", value: refund, color: "#94a3b8" },
  ];

  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>내 티켓 흐름</Text>
      <Text style={{ color: C.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>
        성사된 무대는 티켓으로, 진행 중인 무대는 Venues에서 계속 밀어 주세요.
      </Text>
      <View style={{ flexDirection: "row", marginTop: SPACE.md }}>
        {steps.map((step, index) => (
          <View key={step.label} style={{ flex: 1, marginRight: index === steps.length - 1 ? 0 : SPACE.xs }}>
            <View style={{ backgroundColor: C.card, borderRadius: 14, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: `${step.color}44` }}>
              <Text style={{ color: step.color, fontWeight: "900", fontSize: 20 }}>{step.value}</Text>
              <Text style={{ color: C.dim, fontWeight: "800", fontSize: 10, marginTop: 3 }}>{step.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TicketsScreen({
  venues,
  venueBackings,
  wonTickets,
  refunded,
  onOpenArtistFromTicket,
  onOpenArtistFromConverting,
  onOpenArtistFromRefund,
  onOpenTicketQr,
  onExploreBattles,
}: {
  venues: VenueCompetition[];
  venueBackings: Record<string, string>;
  wonTickets: Ticket[];
  refunded: RefundedPick[];
  onOpenArtistFromTicket: (t: Ticket) => void;
  onOpenArtistFromConverting: (venue: VenueCompetition, artist: CompetingArtist) => void;
  onOpenArtistFromRefund: (r: RefundedPick) => void;
  onOpenTicketQr: (t: Ticket) => void;
  onExploreBattles: () => void;
}) {
  const [filter, setFilter] = useState<TicketWalletFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const wallet = useMemo(
    () => buildTicketWalletEntries(venues, venueBackings, wonTickets),
    [venues, venueBackings, wonTickets]
  );

  const counts = {
    converting: wallet.converting.length,
    ticket: wallet.ready.length,
    past: wallet.past.length,
    refund: refunded.length,
  };
  const total = counts.converting + counts.ticket + counts.past + counts.refund;

  const filters: { id: TicketWalletFilter; label: string; count: number; color: string; bg: string }[] = [
    { id: "all", label: "전체", count: total, color: C.text, bg: C.surface },
    { id: "converting", label: "전환 중", count: counts.converting, color: C.gold, bg: "#422006" },
    { id: "ticket", label: "티켓 준비", count: counts.ticket, color: C.accent, bg: "#14532d" },
    { id: "past", label: "지난 공연", count: counts.past, color: C.muted, bg: "#1e293b" },
    { id: "refund", label: "환불", count: counts.refund, color: "#94a3b8", bg: "#1e293b" },
  ];

  const showConverting = filter === "all" || filter === "converting";
  const showTicket = filter === "all" || filter === "ticket";
  const showPast = filter === "all" || filter === "past";
  const showRefund = filter === "all" || filter === "refund";

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <>
      <ScreenHeader title="내 티켓" subtitle="성사된 무대와 입장권을 확인하세요" />

      <View style={{ flexDirection: "row", marginBottom: SPACE.md, gap: SPACE.xs }}>
        {[
          { label: "전환 중", value: counts.converting, color: C.gold },
          { label: "티켓 준비", value: counts.ticket, color: C.accent },
          { label: "지난 공연", value: counts.past, color: C.muted },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700" }}>{stat.label}</Text>
            <Text style={{ color: stat.color, fontWeight: "900", fontSize: 26, marginTop: 4 }}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <TicketLifecycleSummary
        converting={counts.converting}
        ticket={counts.ticket}
        past={counts.past}
        refund={counts.refund}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACE.lg, flexGrow: 0 }}>
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                backgroundColor: on ? f.bg : C.surface,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginRight: SPACE.sm,
                borderWidth: 1,
                borderColor: on ? `${f.color}66` : C.border,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ color: on ? f.color : C.dim, fontWeight: "900", fontSize: 13 }}>{f.label}</Text>
              <View style={{ marginLeft: 8, backgroundColor: on ? "#00000033" : C.card, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: on ? f.color : C.dim, fontWeight: "900", fontSize: 11 }}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {total === 0 ? (
        <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: SPACE.xl, alignItems: "center", borderWidth: 1, borderColor: C.border, borderStyle: "dashed" }}>
          <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 30, marginBottom: SPACE.md }}>FS</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>아직 참여한 무대가 없어요</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>{FANSTAGE_TAGLINE}</Text>
          <TouchableOpacity onPress={onExploreBattles} style={{ marginTop: SPACE.lg, backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: SPACE.lg, paddingVertical: 12 }}>
            <Text style={{ color: C.ink, fontWeight: "900" }}>무대 선택하러 가기</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showConverting && wallet.converting.length > 0 ? (
        <>
          <SectionLabel>성사 완료 · 티켓 전환 중</SectionLabel>
          <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 20, fontSize: 13 }}>
            무대는 확정됐어요. 예치금이 입장권으로 바뀌는 중입니다.
          </Text>
          {wallet.converting.map((entry) => {
            const open = expandedId === entry.id;
            const { venue, artist } = entry;
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => toggleExpand(entry.id)}
                activeOpacity={0.92}
                style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.gold + "44" }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <TicketStatusPill label="티켓 전환 중" color={C.gold} bg="#422006" />
                  <Text style={{ color: C.rival, fontWeight: "900", fontSize: 13 }}>{formatCountdown(venue.countdown)}</Text>
                </View>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: "900", marginTop: SPACE.sm }}>{artist.name}</Text>
                <Text style={{ color: C.muted }}>{venue.venueName} · {venue.district}</Text>
                <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 12, lineHeight: 18 }}>
                  {ticketOpenStatusLabel(venue.countdown, true)}
                </Text>
                {open ? (
                  <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ color: C.muted, lineHeight: 20, marginBottom: SPACE.sm }}>
                      성사가 끝났어요. 티켓이 열리면 알림과 함께 QR 입장권을 받을 수 있어요.
                    </Text>
                    <TouchableOpacity
                      onPress={() => onOpenArtistFromConverting(venue, artist)}
                      style={{ backgroundColor: ROLE.fan.bg, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: ROLE.fan.border }}
                    >
                      <Text style={{ color: ROLE.fan.primary, fontWeight: "900" }}>내 티켓 받기 →</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 12 }}>눌러서 전환 상태 보기</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {showConverting && wallet.converting.length === 0 && filter === "converting" ? (
        <Text style={{ color: C.dim, marginBottom: SPACE.lg }}>티켓 전환 중인 무대가 없어요.</Text>
      ) : null}

      {showTicket && wallet.ready.length > 0 ? (
        <>
          <SectionLabel>티켓 준비</SectionLabel>
          <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 20, fontSize: 13 }}>
            입장권이 준비됐어요. 공연 당일 QR을 보여주세요.
          </Text>
          {wallet.ready.map((t) => {
            const open = expandedId === `ticket-${t.id}`;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => toggleExpand(`ticket-${t.id}`)}
                activeOpacity={0.92}
                style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 2, borderColor: C.accent }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <TicketStatusPill label="티켓 준비 완료" color={C.accent} bg="#14532d" />
                  <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 16 }}>QR</Text>
                </View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "900", marginTop: SPACE.sm }}>{t.artist}</Text>
                <Text style={{ color: C.muted }}>{t.venue}</Text>
                <Text style={{ color: C.accentSoft, marginTop: SPACE.xs, fontWeight: "700", fontSize: 12 }}>{t.date}</Text>
                {open ? (
                  <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: "#22c55e33" }}>
                    <Text style={{ color: C.dim, fontSize: 12, marginBottom: SPACE.sm }}>Code · {t.code}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      <TouchableOpacity
                        onPress={() => onOpenTicketQr(t)}
                        style={{ flex: 1, minWidth: 140, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginRight: SPACE.xs, marginBottom: SPACE.xs }}
                      >
                        <Text style={{ color: C.ink, fontWeight: "900" }}>QR 입장권 보기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onOpenArtistFromTicket(t)}
                        style={{ flex: 1, minWidth: 140, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border, marginBottom: SPACE.xs }}
                      >
                        <Text style={{ color: C.accentSoft, fontWeight: "900" }}>아티스트 보기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: C.accentSoft, marginTop: SPACE.md, fontWeight: "800" }}>눌러서 입장권 열기</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {showTicket && wallet.ready.length === 0 && filter === "ticket" ? (
        <Text style={{ color: C.dim, marginBottom: SPACE.lg }}>준비된 티켓이 없어요. 성사된 무대는 전환 후 여기에 나타납니다.</Text>
      ) : null}

      {showPast && wallet.past.length > 0 ? (
        <>
          <SectionLabel>입장 완료 · 지난 공연</SectionLabel>
          <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 20, fontSize: 13 }}>
            이미 끝난 무대 기록이에요. Profile에서도 다시 볼 수 있어요.
          </Text>
          {wallet.past.map((t) => {
            const open = expandedId === `past-${t.id}`;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => toggleExpand(`past-${t.id}`)}
                activeOpacity={0.92}
                style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border, opacity: 0.92 }}
              >
                <TicketStatusPill label="지난 공연" color={C.muted} bg="#1e293b" />
                <Text style={{ color: C.text, fontSize: 18, fontWeight: "900", marginTop: SPACE.sm }}>{t.artist}</Text>
                <Text style={{ color: C.muted }}>{t.venue}</Text>
                <Text style={{ color: C.dim, marginTop: SPACE.xs, fontSize: 12 }}>{t.date}</Text>
                {open ? (
                  <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
                    <TouchableOpacity onPress={() => onOpenArtistFromTicket(t)} style={{ paddingVertical: 10, alignItems: "center" }}>
                      <Text style={{ color: C.muted, fontWeight: "800" }}>공연 기록 보기 →</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {showPast && wallet.past.length === 0 && filter === "past" ? (
        <Text style={{ color: C.dim, marginBottom: SPACE.lg }}>지난 공연 기록이 없어요.</Text>
      ) : null}

      {showRefund && refunded.length > 0 ? (
        <>
          <SectionLabel>REFUNDED · PER VENUE</SectionLabel>
          <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 20, fontSize: 13 }}>Battle ended. Your pick didn't win — {BACKING_PRICE} returned for that venue only.</Text>
          {refunded.map((r) => {
            const open = expandedId === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => toggleExpand(r.id)}
                activeOpacity={0.92}
                style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: "#64748b55" }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <TicketStatusPill label="REFUNDED" color="#94a3b8" bg="#1e293b" />
                  <Text style={{ color: C.accent, fontWeight: "900", fontSize: 14 }}>{r.refundedAmount}</Text>
                </View>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: "900", marginTop: SPACE.sm }}>{r.artist}</Text>
                <Text style={{ color: C.muted }}>{r.venue}</Text>
                <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 13 }}>Won by {r.winnerName}</Text>
                {open ? (
                  <View style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.border }}>
                    <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: SPACE.md, marginBottom: SPACE.sm }}>
                      <Text style={{ color: "#94a3b8", fontWeight: "800", fontSize: 11 }}>REFUND RECEIPT</Text>
                      <Text style={{ color: C.text, fontWeight: "900", marginTop: 4 }}>{r.refundedAmount} returned</Text>
                      <Text style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Venue battle closed · pick did not win slot</Text>
                    </View>
                    <TouchableOpacity onPress={() => onOpenArtistFromRefund(r)} style={{ paddingVertical: 10, alignItems: "center" }}>
                      <Text style={{ color: C.muted, fontWeight: "800" }}>View final results →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onExploreBattles} style={{ marginTop: SPACE.xs, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                      <Text style={{ color: ROLE.fan.primary, fontWeight: "900" }}>Pick another battle</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ color: C.dim, marginTop: SPACE.sm, fontSize: 12 }}>Tap for refund details</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {showRefund && refunded.length === 0 && filter === "refund" ? (
        <Text style={{ color: C.dim, marginBottom: SPACE.lg }}>No refunds. You only get refunded when your pick loses a finished battle.</Text>
      ) : null}

      {total > 0 ? (
        <TouchableOpacity onPress={onExploreBattles} style={{ marginTop: SPACE.sm, paddingVertical: SPACE.md, alignItems: "center" }}>
          <Text style={{ color: C.accentSoft, fontWeight: "800" }}>Explore more venue battles →</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function TicketQrScreen({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  return (
    <>
      <ScreenHeader title="Entry pass" subtitle={ticket.artist} onBack={onBack} eyebrow="VENUE WINNER" />
      <View style={{ backgroundColor: C.card, borderRadius: 32, padding: SPACE.lg, alignItems: "center" }}>
        <QrMock code={ticket.code} />
        <Text style={{ color: C.text, fontSize: 20, fontWeight: "900" }}>{ticket.venue}</Text>
        <Text style={{ color: C.muted, marginTop: SPACE.xs }}>{ticket.date}</Text>
      </View>
    </>
  );
}

function InviteArtistFlow({
  venues,
  preselectedVenue,
  onBack,
  onSubmit,
  onViewVenue,
}: {
  venues: VenueCompetition[];
  preselectedVenue: VenueCompetition | null;
  onBack: () => void;
  onSubmit: (invite: FanInvite) => void;
  onViewVenue: (venueId: string) => void;
}) {
  const initialGenre = preselectedVenue?.slotGenre ?? venues.find((v) => !v.winnerId)?.slotGenre ?? "Indie";
  const [artistGenre, setArtistGenre] = useState<SlotGenre>(initialGenre);
  const matchingVenues = venues.filter((v) => !v.winnerId && v.slotGenre === artistGenre);
  const [venueId, setVenueId] = useState(() => {
    if (preselectedVenue && preselectedVenue.slotGenre === initialGenre && !preselectedVenue.winnerId) {
      return preselectedVenue.id;
    }
    return matchingVenues[0]?.id ?? "";
  });
  const [profileId, setProfileId] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const venue = matchingVenues.find((v) => v.id === venueId) ?? preselectedVenue;
  const genreMatch = venue?.slotGenre === artistGenre;
  const profileLabel = profileId.trim() ? (profileId.trim().startsWith("@") ? profileId.trim() : `@${profileId.trim()}`) : "";

  const selectGenre = (genre: SlotGenre) => {
    setArtistGenre(genre);
    const nextVenues = venues.filter((v) => !v.winnerId && v.slotGenre === genre);
    setVenueId(nextVenues[0]?.id ?? "");
  };

  if (done && venue && genreMatch) {
    return (
      <>
        <ScreenHeader title="Invite sent" subtitle={`${profileLabel} nominated for ${venue.venueName} — fans make the stage happen.`} onBack={onBack} eyebrow="SCENE BUILDER" />
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.xl, alignItems: "center", marginBottom: SPACE.lg }}>
          <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>📣</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>You put them on the radar</Text>
          <View style={{ marginTop: SPACE.md }}><GenrePill genre={artistGenre} large /></View>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>+15 reputation · {artistGenre} slot at {venue.venueName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onViewVenue(venue.id)}
          style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: SPACE.sm }}
        >
          <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>View venue battle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ paddingVertical: SPACE.md, alignItems: "center" }}>
          <Text style={{ color: C.accentSoft, fontWeight: "800" }}>Back to feed</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Invite an artist" subtitle={`${FANSTAGE_TAGLINE} Match genre to venue slot.`} onBack={onBack} eyebrow="FAN ONBOARDING" />
      <SectionLabel>ARTIST GENRE</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.md }}>
        {SLOT_GENRES.map((g) => (
          <FilterChip key={g} label={genreKo(g)} active={artistGenre === g} accent={genreTheme(g).primary} onPress={() => selectGenre(g)} />
        ))}
      </View>
      <SectionLabel>SELECT VENUE BATTLE · {artistGenre.toUpperCase()}</SectionLabel>
      {matchingVenues.length === 0 ? (
        <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 22 }}>No open {artistGenre} battles right now. Try another genre.</Text>
      ) : (
        matchingVenues.map((v) => (
          <TouchableOpacity key={v.id} onPress={() => setVenueId(v.id)} style={{ backgroundColor: venueId === v.id ? "#2d1f4e" : C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.sm, borderWidth: 1, borderColor: venueId === v.id ? C.rival : C.border }}>
            <Text style={{ color: C.text, fontWeight: "900" }}>{v.venueName}</Text>
            <View style={{ marginTop: SPACE.xs }}><GenrePill genre={v.slotGenre} /></View>
          </TouchableOpacity>
        ))
      )}
      {venue && genreMatch ? (
        <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 22 }}>{artistGenre} artist · {venue.venueName} slot only.</Text>
      ) : null}
      {venue && !genreMatch ? (
        <Text style={{ color: C.rival, marginBottom: SPACE.md, lineHeight: 22, fontWeight: "700" }}>Genre must match the venue slot ({venue.slotGenre}).</Text>
      ) : null}
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Social or music profile ID</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.xs, borderWidth: 1, borderColor: C.border }}>
        <TextInput
          placeholder="@artist · open.spotify.com/artist/…"
          placeholderTextColor={C.dim}
          value={profileId}
          onChangeText={setProfileId}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ color: C.text, fontWeight: "600" }}
        />
      </View>
      <Text style={{ color: C.dim, fontSize: 12, marginBottom: SPACE.md, lineHeight: 18 }}>
        Instagram, TikTok, Spotify, SoundCloud, or any link we can verify.
      </Text>
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Invite friends</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border }}>
        <TextInput
          placeholder="@friend1 @friend2 · who should back them?"
          placeholderTextColor={C.dim}
          value={note}
          onChangeText={setNote}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={{ color: C.text, fontWeight: "600", minHeight: 80 }}
        />
      </View>
      <TouchableOpacity
        onPress={() => {
          if (!venue || !profileId.trim() || !genreMatch) return;
          const handle = profileId.trim().startsWith("@") ? profileId.trim() : `@${profileId.trim()}`;
          onSubmit({
            id: `inv-${Date.now()}`,
            venueId: venue.id,
            profileId: handle,
            genre: artistGenre,
            note: note.trim() || `Invited friends to back ${handle} · ${artistGenre}`,
          });
          setDone(true);
        }}
        disabled={!venue || !profileId.trim() || !genreMatch}
        style={{
          backgroundColor: !venue || !profileId.trim() || !genreMatch ? C.border : C.rival,
          borderRadius: 18,
          paddingVertical: 18,
          alignItems: "center",
        }}
      >
        <Text style={{ color: !venue || !profileId.trim() || !genreMatch ? C.dim : C.ink, fontWeight: "900" }}>Send invite</Text>
      </TouchableOpacity>
    </>
  );
}

function scrollFormAnchorIntoView(
  scrollRef: React.RefObject<ScrollView | null>,
  contentRef: React.RefObject<View | null>,
  anchorRef: React.RefObject<View | null>,
  extraOffset = 48
) {
  const content = contentRef.current;
  const anchor = anchorRef.current;
  if (!content || !anchor) return;
  anchor.measureLayout(
    content,
    (_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - extraOffset), animated: true });
    },
    () => {}
  );
}

function ArtistOnboardingKeyboardScroll({
  children,
  scrollRef,
  contentRef,
}: {
  children: React.ReactNode;
  scrollRef: React.RefObject<ScrollView | null>;
  contentRef: React.RefObject<View | null>;
}) {
  const insets = useSafeAreaInsets();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardInset(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPad = Math.max(140, keyboardInset + insets.bottom + 72);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SPACE.md,
          paddingTop: SPACE.sm,
          paddingBottom: bottomPad,
        }}
      >
        <View ref={contentRef} collapsable={false}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ApplyBattleFlow({
  venues,
  preselectedVenue,
  onBack,
  onSubmit,
  onArtistRolePending,
  onViewVenue,
}: {
  venues: VenueCompetition[];
  preselectedVenue: VenueCompetition | null;
  onBack: () => void;
  onSubmit: (app: ArtistApplication) => void;
  onArtistRolePending: (stageName: string, slotGenre: SlotGenre, battlePitch?: string, social?: ArtistSocialProof) => void;
  onViewVenue: (venueId: string) => void;
}) {
  const openVenues = venues.filter((v) => !v.winnerId && v.slotsOpen > 0);
  const [venueId, setVenueId] = useState(preselectedVenue?.id ?? openVenues[0]?.id ?? "");
  const [artistName, setArtistName] = useState("");
  const [proofPlatform, setProofPlatform] = useState<SocialPlatform>("instagram");
  const [proofInput, setProofInput] = useState("");
  const [battlePitch, setBattlePitch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const venue = openVenues.find((v) => v.id === venueId) ?? preselectedVenue;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const proofAnchorRef = useRef<View>(null);
  const pitchAnchorRef = useRef<View>(null);
  const nameAnchorRef = useRef<View>(null);

  const scrollAnchor = useCallback(
    (anchorRef: React.RefObject<View | null>, offset = 48) => {
      scrollFormAnchorIntoView(scrollRef, contentRef, anchorRef, offset);
      if (Platform.OS === "ios") {
        setTimeout(() => scrollFormAnchorIntoView(scrollRef, contentRef, anchorRef, offset), 280);
      }
    },
    []
  );

  if (done && venue) {
    return (
      <ArtistOnboardingKeyboardScroll scrollRef={scrollRef} contentRef={contentRef}>
        <ScreenHeader title="Application in" subtitle={`${artistName} is queued for ${venue.venueName}.`} onBack={onBack} eyebrow="ARTIST ONBOARDING" />
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.xl, alignItems: "center", marginBottom: SPACE.lg }}>
          <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>🎤</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>You're in the queue</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>
            Venue reviews {venue.slotGenre} applications. Fans can start backing once you're approved.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onViewVenue(venue.id)}
          style={{ backgroundColor: ROLE.artist.primary, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: SPACE.sm }}
        >
          <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>View venue battle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ paddingVertical: SPACE.md, alignItems: "center" }}>
          <Text style={{ color: C.accentSoft, fontWeight: "800" }}>Back to feed</Text>
        </TouchableOpacity>
      </ArtistOnboardingKeyboardScroll>
    );
  }

  return (
    <ArtistOnboardingKeyboardScroll scrollRef={scrollRef} contentRef={contentRef}>
      <ScreenHeader title="Apply to battle" subtitle={`${FANSTAGE_TAGLINE} Compete within the venue's genre.`} onBack={onBack} eyebrow="ARTIST ONBOARDING" />
      <SectionLabel>OPEN GENRE SLOTS</SectionLabel>
      {openVenues.map((v) => (
        <TouchableOpacity key={v.id} onPress={() => setVenueId(v.id)} style={{ backgroundColor: venueId === v.id ? "#1f2f4a" : C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.sm, borderWidth: 1, borderColor: venueId === v.id ? C.accent : C.border }}>
          <Text style={{ color: C.text, fontWeight: "900" }}>{v.venueName}</Text>
          <Text style={{ color: C.muted, marginTop: 4 }}>{v.slotsOpen} spots · {v.slotGenre} only</Text>
        </TouchableOpacity>
      ))}
      {venue ? (
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md }}>
          <Text style={{ color: C.dim, fontWeight: "700" }}>GENRE LOCK</Text>
          <View style={{ marginTop: SPACE.xs }}><GenrePill genre={venue.slotGenre} large /></View>
          <Text style={{ color: C.muted, marginTop: SPACE.sm }}>Your act must be {venue.slotGenre}. Mixed-genre applications are rejected.</Text>
        </View>
      ) : null}
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Artist / act name</Text>
      <View ref={nameAnchorRef} collapsable={false}>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
          <TextInput
            placeholder="Stage name"
            placeholderTextColor={C.dim}
            value={artistName}
            onChangeText={setArtistName}
            onFocus={() => scrollAnchor(nameAnchorRef, 56)}
            style={{ color: C.text, fontWeight: "600" }}
          />
        </View>
      </View>
      <BattleProofPitchFields
        proofPlatform={proofPlatform}
        proofInput={proofInput}
        battlePitch={battlePitch}
        onProofPlatformChange={setProofPlatform}
        onProofInputChange={setProofInput}
        onBattlePitchChange={setBattlePitch}
        labelsKo={false}
        proofAnchorRef={proofAnchorRef}
        pitchAnchorRef={pitchAnchorRef}
        onProofInputFocus={() => scrollAnchor(proofAnchorRef, 56)}
        onBattlePitchFocus={() => scrollAnchor(pitchAnchorRef, 72)}
      />
      {formError ? (
        <Text style={{ color: C.rival, marginBottom: SPACE.md, fontWeight: "700", fontSize: 13 }}>{formError}</Text>
      ) : null}
      <TouchableOpacity
        onPress={() => {
          if (!venue || !artistName.trim()) return;
          const validation = validateBattleProofPitch(proofPlatform, proofInput, battlePitch);
          if (!validation.ok) {
            setFormError(validation.message ?? "입력을 확인해 주세요.");
            scrollAnchor(pitchAnchorRef, 72);
            return;
          }
          setFormError(null);
          const name = artistName.trim();
          const built = buildBattleProofPitchValue(proofPlatform, proofInput, battlePitch);
          onArtistRolePending(name, venue.slotGenre, built.battlePitch, built.social);
          onSubmit({
            id: `app-${Date.now()}`,
            venueId: venue.id,
            artistName: name,
            battlePitch: built.battlePitch,
            social: built.social,
          });
          setDone(true);
        }}
        style={{ backgroundColor: ROLE.artist.primary, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}
      >
        <Text style={{ color: C.ink, fontWeight: "900" }}>Submit application</Text>
      </TouchableOpacity>
    </ArtistOnboardingKeyboardScroll>
  );
}

function ProfileScreen({
  handle,
  profileMode,
  onProfileModeChange,
  reputation,
  picksCount,
  invites,
  battleApplications,
  artistRoleStatus,
  artistStageName,
  onApplyForArtist,
  onExploreBattles,
  onOpenVenueAdmin,
  onOpenCuratorTools,
  onOpenOnecoreAdmin,
  isCurator,
}: {
  handle: string;
  profileMode: ProfileMode;
  onProfileModeChange: (m: ProfileMode) => void;
  reputation: number;
  picksCount: number;
  invites: number;
  battleApplications: number;
  artistRoleStatus: ArtistApprovalStatus;
  artistStageName: string;
  onApplyForArtist: () => void;
  onExploreBattles: () => void;
  onOpenVenueAdmin: () => void;
  onOpenCuratorTools: () => void;
  onOpenOnecoreAdmin: () => void;
  isCurator: boolean;
}) {
  const level = getFanLevel(reputation);
  const nextLevel = FAN_LEVELS.find((l) => l.min > reputation);
  const repToNext = nextLevel ? nextLevel.min - reputation : 0;
  const isArtistApproved = artistRoleStatus === "approved";
  const isArtistView = profileMode === "artist" && isArtistApproved;
  const activeRole = isArtistView ? ROLE.artist : ROLE.fan;
  const displayName = artistStageName || `@${handle}`;

  const fanStats = [
    { label: "Venue picks", value: String(picksCount), hint: "Artists you've backed" },
    { label: "Invites sent", value: String(invites), hint: "Talent you've nominated" },
    { label: "Reputation", value: String(reputation), hint: "Unlocks fan levels" },
    { label: "Battles joined", value: String(battleApplications), hint: "As fan or applicant" },
  ];

  const artistMetrics = [
    { label: "Live applications", value: String(battleApplications), hint: "Battles you're competing in" },
    { label: "Total backers", value: "127", hint: "Fans backing you across battles" },
    { label: "Slots won", value: "1", hint: "Venues where you took the stage" },
    { label: "Active campaigns", value: "2", hint: "Battles still accepting backers" },
  ];

  return (
    <>
      <ScreenHeader
        title="Your profile"
        subtitle={
          isArtistView
            ? "Find battles, grow backers, win the slot"
            : profileMode === "fan"
              ? FANSTAGE_TAGLINE
              : "Complete artist verification to unlock"
        }
        eyebrow={activeRole.label.toUpperCase()}
      />

      <RoleSwitcher
        mode={profileMode}
        canUseArtist={isArtistApproved}
        artistRoleStatus={artistRoleStatus}
        onChange={onProfileModeChange}
      />

      {isArtistView ? (
        <>
          <View
            style={{
              backgroundColor: ROLE.artist.bg,
              borderRadius: 28,
              padding: SPACE.lg,
              marginBottom: SPACE.md,
              borderWidth: 2,
              borderColor: ROLE.artist.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACE.sm }}>
              <View
                style={{
                  backgroundColor: ROLE.artist.primary + "33",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: SPACE.sm,
                }}
              >
                <Text style={{ color: ROLE.artist.soft, fontWeight: "800", fontSize: 10, letterSpacing: 0.8 }}>VERIFIED</Text>
              </View>
              <Text style={{ color: ROLE.artist.soft, fontSize: 11, fontWeight: "600" }}>Competing for venue slots</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: "900" }}>{displayName}</Text>
            <Text style={{ color: C.muted, fontWeight: "700", marginTop: SPACE.xs }}>@{handle}</Text>
            <Text style={{ color: ROLE.artist.soft, marginTop: SPACE.md, lineHeight: 22, fontSize: 13 }}>
              Fans back you in open battles. Win the leaderboard and the venue books your slot.
            </Text>
          </View>

          <SectionLabel>WHAT TO DO NEXT</SectionLabel>
          <ProfileActionRow
            title="Browse open battles"
            subtitle="Find genre-matched slots and apply before the lineup fills"
            onPress={onExploreBattles}
            accent={ROLE.artist}
          />
          <ProfileActionRow
            title={`Your applications (${battleApplications})`}
            subtitle="Track battles you've entered and how close you are to the lead"
            onPress={onExploreBattles}
            accent={ROLE.artist}
          />

          <SectionLabel>YOUR MOMENTUM</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.lg }}>
            {artistMetrics.map((s) => (
              <View
                key={s.label}
                style={{
                  width: "48%",
                  backgroundColor: C.card,
                  borderRadius: 18,
                  padding: SPACE.md,
                  marginBottom: SPACE.sm,
                  marginRight: "2%",
                  borderWidth: 1,
                  borderColor: ROLE.artist.border,
                }}
              >
                <Text style={{ color: ROLE.artist.primary, fontSize: 24, fontWeight: "900" }}>{s.value}</Text>
                <Text style={{ color: C.text, fontSize: 11, fontWeight: "800", marginTop: SPACE.xs }}>{s.label}</Text>
                <Text style={{ color: C.dim, fontSize: 10, marginTop: 4, lineHeight: 14 }}>{s.hint}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 28,
              padding: SPACE.lg,
              marginBottom: SPACE.md,
              borderWidth: 2,
              borderColor: activeRole.border,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: SPACE.sm }}>
              <Text style={{ color: ROLE.fan.soft, fontSize: 11, fontWeight: "700", marginRight: SPACE.sm }}>
                FAN PROFILE
              </Text>
              <FanLevelBadge reputation={reputation} />
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: "900" }}>@{handle}</Text>
            <Text style={{ color: level.color, fontWeight: "900", fontSize: 18, marginTop: SPACE.xs }}>
              {level.title}
            </Text>
            {nextLevel ? (
              <View style={{ marginTop: SPACE.md }}>
                <Text style={{ color: C.dim, fontSize: 12, marginBottom: SPACE.xs }}>
                  {repToNext} rep to {nextLevel.title}
                </Text>
                <View style={{ height: 6, backgroundColor: C.border, borderRadius: 999, overflow: "hidden" }}>
                  <View
                    style={{
                      width: `${Math.min((reputation / nextLevel.min) * 100, 100)}%`,
                      height: "100%",
                      backgroundColor: ROLE.fan.primary,
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {!isArtistApproved ? (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 20,
                padding: SPACE.md,
                marginBottom: SPACE.lg,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>WANT TO COMPETE ON STAGE?</Text>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 15, marginTop: SPACE.xs, lineHeight: 22 }}>
                Apply as an artist to enter venue battles. Fans still back you — you just compete for the slot.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: SPACE.md,
                  paddingTop: SPACE.sm,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}
              >
                <Text style={{ color: artistStatusColor(artistRoleStatus), fontWeight: "900", fontSize: 15 }}>
                  {artistStatusLabel(artistRoleStatus)}
                </Text>
              </View>
              {artistRoleStatus === "not_applied" ? (
                <TouchableOpacity
                  onPress={onApplyForArtist}
                  style={{
                    marginTop: SPACE.md,
                    backgroundColor: ROLE.artist.bg,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: ROLE.artist.border,
                  }}
                >
                  <Text style={{ color: ROLE.artist.primary, fontWeight: "900" }}>Apply for artist role</Text>
                </TouchableOpacity>
              ) : null}
              {artistRoleStatus === "pending" ? (
                <Text style={{ color: C.muted, marginTop: SPACE.sm, lineHeight: 22 }}>
                  We're reviewing your application. You'll be able to switch to Artist view once approved.
                </Text>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onProfileModeChange("artist")}
              style={{
                backgroundColor: ROLE.artist.bg,
                borderRadius: 18,
                padding: SPACE.md,
                marginBottom: SPACE.lg,
                borderWidth: 1,
                borderColor: ROLE.artist.border,
              }}
            >
              <Text style={{ color: ROLE.artist.primary, fontWeight: "900" }}>Switch to Artist view →</Text>
              <Text style={{ color: ROLE.artist.soft, marginTop: 4, fontSize: 12 }}>
                Manage battles, backers, and slot progress
              </Text>
            </TouchableOpacity>
          )}

          <SectionLabel>YOUR ACTIVITY</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.lg }}>
            {fanStats.map((s) => (
              <View
                key={s.label}
                style={{
                  width: "48%",
                  backgroundColor: ROLE.fan.bg + "99",
                  borderRadius: 18,
                  padding: SPACE.md,
                  marginBottom: SPACE.sm,
                  marginRight: "2%",
                  borderWidth: 1,
                  borderColor: ROLE.fan.border,
                }}
              >
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>{s.value}</Text>
                <Text style={{ color: C.text, fontSize: 11, fontWeight: "800", marginTop: SPACE.xs }}>{s.label}</Text>
                <Text style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>{s.hint}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {isCurator ? (
        <>
          <SectionLabel>CURATOR TOOLS</SectionLabel>
          <TouchableOpacity
            onPress={onOpenVenueAdmin}
            style={{
              backgroundColor: ROLE.venue.bg,
              borderRadius: 20,
              padding: SPACE.md,
              borderWidth: 1,
              borderColor: ROLE.venue.border,
              marginBottom: SPACE.sm,
            }}
          >
            <Text style={{ color: ROLE.venue.primary, fontWeight: "800", textAlign: "center" }}>
              Venue admin · Lineups & slots
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenCuratorTools}
            style={{ backgroundColor: ROLE.curator.bg, borderRadius: 20, padding: SPACE.md, borderWidth: 1, borderColor: ROLE.curator.border, marginBottom: SPACE.sm }}
          >
            <Text style={{ color: ROLE.curator.primary, fontWeight: "800", textAlign: "center" }}>
              Demand scout · 수요 캠페인 기획
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenOnecoreAdmin}
            style={{ backgroundColor: "#422006", borderRadius: 20, padding: SPACE.md, borderWidth: 1, borderColor: C.gold + "66" }}
          >
            <Text style={{ color: C.gold, fontWeight: "800", textAlign: "center" }}>ONECORE Admin · Race & logs</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </>
  );
}

type ArtistApprovalFilter = "pending" | "approved" | "rejected" | "all";

function artistRequestStatusColor(status: ArtistRoleRequestStatus) {
  if (status === "approved") return ROLE.artist.primary;
  if (status === "rejected") return C.dim;
  return ROLE.venue.primary;
}

function ArtistApprovalReviewPanel({
  request,
  onApprove,
  onReject,
}: {
  request: ArtistRoleRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const socialLinks = listSocialLinks(request.social);

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 18, padding: SPACE.md, marginTop: SPACE.xs, borderWidth: 1, borderColor: ROLE.curator.border }}>
      <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>REVIEWING</Text>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{request.stageName}</Text>
      <Text style={{ color: C.muted, marginTop: 2 }}>
        @{request.handle} · via {request.source === "profile" ? "Profile apply" : "Battle apply"}
      </Text>

      {request.note ? (
        <Text style={{ color: "#cbd5e1", marginTop: SPACE.sm, lineHeight: 22, fontSize: 14 }}>{request.note}</Text>
      ) : null}

      {request.battlePitch ? (
        <View style={{ marginTop: SPACE.md }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 4 }}>
            팬들이 응원할 이유
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 22 }}>{request.battlePitch}</Text>
        </View>
      ) : null}

      {socialLinks.length > 0 ? (
        <View style={{ marginTop: SPACE.md }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 8 }}>
            확인 링크
          </Text>
          {socialLinks.map((link: SocialLinkItem, idx: number) => {
            const isPrimary = idx === 0;
            const rawValue = request.social ? (request.social as Record<string, string | undefined>)[link.platform] : undefined;
            return (
              <TouchableOpacity
                key={link.platform}
                onPress={() => openArtistSocialUrl(link.url)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isPrimary ? "#1e293b" : C.surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: isPrimary ? "#475569" : C.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: C.dim, fontWeight: "800", fontSize: 10, width: 28 }}>{link.shortLabel}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>
                    {rawValue ?? link.url}
                  </Text>
                </View>
                <Text style={{ color: ROLE.artist.soft, fontWeight: "900", fontSize: 11 }}>열기</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {request.status === "pending" ? (
        <View style={{ flexDirection: "row", marginTop: SPACE.md }}>
          <TouchableOpacity
            onPress={onReject}
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginRight: SPACE.xs,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.muted, fontWeight: "900" }}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            style={{
              flex: 1,
              backgroundColor: ROLE.artist.bg,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginLeft: SPACE.xs,
              borderWidth: 1,
              borderColor: ROLE.artist.border,
            }}
          >
            <Text style={{ color: ROLE.artist.primary, fontWeight: "900" }}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ color: artistRequestStatusColor(request.status), fontWeight: "800", marginTop: SPACE.md }}>
          {request.status === "approved" ? "Artist mode unlocked for this user." : "Application denied."}
        </Text>
      )}
    </View>
  );
}

function ArtistApprovalQueue({
  requests,
  onApprove,
  onReject,
}: {
  requests: ArtistRoleRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ArtistApprovalFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      const matchFilter = filter === "all" || r.status === filter;
      const matchQuery =
        !q || r.handle.toLowerCase().includes(q) || r.stageName.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [requests, filter, query]);

  const selected = filtered.find((r) => r.id === selectedId) ?? requests.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const filters: { id: ArtistApprovalFilter; label: string; count?: number }[] = [
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "rejected", label: "Rejected", count: counts.rejected },
    { id: "all", label: "All" },
  ];

  return (
    <View style={{ backgroundColor: ROLE.curator.bg, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: ROLE.curator.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACE.md }}>
        <View>
          <Text style={{ color: ROLE.curator.soft, fontSize: 11, fontWeight: "700" }}>ARTIST APPROVALS</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, marginTop: 4 }}>{counts.pending} in queue</Text>
        </View>
        <View style={{ backgroundColor: counts.pending > 0 ? ROLE.venue.bg : C.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: counts.pending > 0 ? ROLE.venue.border : C.border }}>
          <Text style={{ color: counts.pending > 0 ? ROLE.venue.primary : C.dim, fontWeight: "900", fontSize: 11 }}>
            {counts.pending > 0 ? "Needs review" : "Clear"}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: SPACE.md, paddingVertical: 12, marginBottom: SPACE.sm, borderWidth: 1, borderColor: C.border }}>
        <TextInput
          placeholder="Search handle or stage name…"
          placeholderTextColor={C.dim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ color: C.text, fontWeight: "600", fontSize: 14 }}
        />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.md }}>
        {filters.map((f) => (
          <FilterChip
            key={f.id}
            label={f.count !== undefined ? `${f.label} · ${f.count}` : f.label}
            active={filter === f.id}
            accent={f.id === "pending" ? ROLE.venue.primary : f.id === "approved" ? ROLE.artist.primary : ROLE.curator.primary}
            onPress={() => setFilter(f.id)}
          />
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, alignItems: "center" }}>
          <Text style={{ color: C.muted, textAlign: "center", lineHeight: 22 }}>
            {filter === "pending" ? "No pending artist applications." : `No ${filter === "all" ? "" : filter + " "}requests match.`}
          </Text>
        </View>
      ) : (
        filtered.map((req) => {
          const on = selectedId === req.id;
          return (
            <TouchableOpacity
              key={req.id}
              onPress={() => setSelectedId(req.id)}
              activeOpacity={0.9}
              style={{
                backgroundColor: on ? C.card : C.surface,
                borderRadius: 16,
                padding: SPACE.md,
                marginBottom: SPACE.sm,
                borderWidth: 1,
                borderColor: on ? ROLE.curator.border : C.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: C.border,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: SPACE.sm,
                  }}
                >
                  <Text style={{ color: C.muted, fontWeight: "900", fontSize: 12 }}>
                    {req.stageName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>{req.stageName}</Text>
                  <Text style={{ color: C.dim, marginTop: 2, fontSize: 12 }}>@{req.handle}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      backgroundColor:
                        req.status === "approved" ? ROLE.artist.bg : req.status === "rejected" ? C.card : ROLE.venue.bg,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor:
                        req.status === "approved" ? ROLE.artist.border : req.status === "rejected" ? C.border : ROLE.venue.border,
                    }}
                  >
                    <Text style={{ color: artistRequestStatusColor(req.status), fontWeight: "900", fontSize: 10 }}>
                      {req.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: C.dim, fontSize: 10, marginTop: 4, fontWeight: "600" }}>{req.submittedLabel}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {selected ? (
        <ArtistApprovalReviewPanel
          request={selected}
          onApprove={() => onApprove(selected.id)}
          onReject={() => onReject(selected.id)}
        />
      ) : null}
    </View>
  );
}

function CuratorToolsScreen({
  onBack,
  artistRoleRequests,
  approvedArtists,
  onApproveArtistRequest,
  onRejectArtistRequest,
}: {
  onBack: () => void;
  artistRoleRequests: ArtistRoleRequest[];
  approvedArtists: ApprovedArtist[];
  onApproveArtistRequest: (id: string) => void;
  onRejectArtistRequest: (id: string) => void;
}) {
  const approvedCount = artistRoleRequests.filter((r) => r.status === "approved").length;

  return (
    <>
      <ScreenHeader
        title="Curator tools"
        subtitle={`${FANSTAGE_TAGLINE} Curators verify artists before they enter battles.`}
        onBack={onBack}
        eyebrow="CURATOR"
      />
      <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>ROSTER READY FOR VENUES</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 22, marginTop: 4 }}>{approvedArtists.length} verified artists</Text>
        <Text style={{ color: C.muted, marginTop: 4, lineHeight: 20 }}>{approvedCount} approvals logged · assign them in Venue admin</Text>
      </View>
      <ArtistApprovalQueue requests={artistRoleRequests} onApprove={onApproveArtistRequest} onReject={onRejectArtistRequest} />
    </>
  );
}

type VenuePublishDraft = {
  venueName: string;
  capacity: number;
  slotGenre: SlotGenre;
  district: DistrictFilter;
};

function VenueAdminScreen({
  onBack,
  venues,
  approvedArtists,
  battleApplications,
  onPublish,
  onViewOnDiscover,
  onAddArtistToVenue,
  onRemoveArtistFromVenue,
  onAcceptBattleApplication,
}: {
  onBack: () => void;
  venues: VenueCompetition[];
  approvedArtists: ApprovedArtist[];
  battleApplications: ArtistApplication[];
  onPublish: (draft: VenuePublishDraft) => string;
  onViewOnDiscover: (venueId: string) => void;
  onAddArtistToVenue: (venueId: string, artistId: string) => void;
  onRemoveArtistFromVenue: (venueId: string, artistId: string) => void;
  onAcceptBattleApplication: (appId: string) => void;
}) {
  const openVenues = venues.filter((v) => !v.winnerId);
  const [mode, setMode] = useState<"lineups" | "publish">("lineups");
  const [selectedVenueId, setSelectedVenueId] = useState(openVenues[0]?.id ?? "");
  const [justPublishedId, setJustPublishedId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState("300");
  const [slotGenre, setSlotGenre] = useState<SlotGenre>("Indie");
  const [district, setDistrict] = useState<DistrictFilter>("홍대");
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (openVenues.length === 0) {
      if (selectedVenueId) setSelectedVenueId("");
      return;
    }
    if (!openVenues.some((v) => v.id === selectedVenueId)) {
      setSelectedVenueId(justPublishedId && openVenues.some((v) => v.id === justPublishedId) ? justPublishedId : openVenues[0].id);
    }
  }, [openVenues, selectedVenueId, justPublishedId]);

  const selectedVenue = openVenues.find((v) => v.id === selectedVenueId) ?? openVenues[0];
  const isJustPublished = justPublishedId !== null && selectedVenue?.id === justPublishedId;

  const handlePublishSlot = () => {
    const name = venueName.trim();
    if (!name) {
      setPublishError("Enter a venue name to publish.");
      return;
    }
    setPublishError(null);
    const newId = onPublish({
      venueName: name,
      capacity: parseInt(capacity, 10) || 300,
      slotGenre,
      district,
    });
    setJustPublishedId(newId);
    setSelectedVenueId(newId);
    setMode("lineups");
    setVenueName("");
    setCapacity("300");
  };
  const venueApps = selectedVenue ? battleApplications.filter((a) => a.venueId === selectedVenue.id) : [];

  const rosterForVenue = selectedVenue
    ? approvedArtists.filter(
        (a) =>
          a.slotGenre === selectedVenue.slotGenre &&
          !selectedVenue.artists.some((v) => v.id === a.id || v.name === a.stageName)
      )
    : [];

  return (
    <>
      <ScreenHeader
        title="Venue admin"
        subtitle={`${FANSTAGE_TAGLINE} Open slots and build genre-locked lineups.`}
        onBack={onBack}
        eyebrow={ROLE.venue.label.toUpperCase()}
      />

      <View style={{ flexDirection: "row", backgroundColor: C.surface, borderRadius: 14, padding: 4, marginBottom: SPACE.lg }}>
        {(["lineups", "publish"] as const).map((tab) => {
          const on = mode === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setMode(tab)}
              style={{
                flex: 1,
                backgroundColor: on ? ROLE.venue.bg : "transparent",
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                borderWidth: on ? 1 : 0,
                borderColor: ROLE.venue.border,
              }}
            >
              <Text style={{ color: on ? ROLE.venue.primary : C.dim, fontWeight: "900", fontSize: 13 }}>
                {tab === "lineups" ? "Manage lineups" : "Publish slot"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === "publish" ? (
        <>
          <SectionLabel>ADD OPEN SLOT</SectionLabel>
          <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 22 }}>
            Publish a new venue battle. It appears on Discover and opens here for lineup setup.
          </Text>

          <View style={{ flexDirection: "row", marginBottom: SPACE.lg, alignItems: "center" }}>
            {(["publish", "lineups"] as const).map((step, i) => {
              const labels = ["1 · Publish", "2 · Lineup"];
              const active = step === "publish" || (step === "lineups" && openVenues.length > 0);
              return (
                <React.Fragment key={step}>
                  {i > 0 ? <View style={{ flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: SPACE.xs }} /> : null}
                  <View style={{ alignItems: "center", minWidth: 72 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: active ? ROLE.venue.primary : C.card,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: active ? ROLE.venue.border : C.border,
                      }}
                    >
                      <Text style={{ color: active ? C.ink : C.dim, fontWeight: "900", fontSize: 12 }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: active ? ROLE.venue.primary : C.dim, fontSize: 10, fontWeight: "700", marginTop: 4 }}>{labels[i]}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          <SectionLabel>DISTRICT</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.md }}>
            {DISTRICT_CHIPS.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDistrict(d)}
                style={{
                  backgroundColor: district === d ? ROLE.venue.primary : C.card,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginRight: SPACE.xs,
                  marginBottom: SPACE.xs,
                }}
              >
                <Text style={{ color: district === d ? C.ink : C.muted, fontWeight: "800" }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionLabel>SLOT GENRE</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.md }}>
            {SLOT_GENRES.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setSlotGenre(g)}
                style={{
                  backgroundColor: slotGenre === g ? genreTheme(g).bg : C.card,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginRight: SPACE.xs,
                  marginBottom: SPACE.xs,
                  borderWidth: 1,
                  borderColor: slotGenre === g ? genreTheme(g).border : C.border,
                }}
              >
                <Text style={{ color: slotGenre === g ? genreTheme(g).primary : C.muted, fontWeight: "800" }}>{genreKo(g)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {[
            { label: "Venue name", value: venueName, set: setVenueName, ph: "e.g. Rolling Hall" },
            { label: "Capacity", value: capacity, set: setCapacity, ph: "450" },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: SPACE.md }}>
              <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>{f.label}</Text>
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, borderWidth: 1, borderColor: C.border }}>
                <TextInput placeholder={f.ph} placeholderTextColor={C.dim} value={f.value} onChangeText={f.set} style={{ color: C.text, fontWeight: "600" }} keyboardType={f.label === "Capacity" ? "number-pad" : "default"} />
              </View>
            </View>
          ))}

          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>PREVIEW</Text>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{venueName.trim() || "New venue"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACE.sm, flexWrap: "wrap" }}>
              <GenrePill genre={slotGenre} />
              <Text style={{ color: C.muted, marginLeft: SPACE.sm, fontSize: 12 }}>
                {district} · {parseInt(capacity, 10) || 300} cap · 3 lineup spots
              </Text>
            </View>
          </View>

          {publishError ? (
            <Text style={{ color: "#f87171", marginBottom: SPACE.sm, fontWeight: "700" }}>{publishError}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handlePublishSlot}
            style={{ backgroundColor: ROLE.venue.primary, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: SPACE.sm }}
          >
            <Text style={{ color: C.ink, fontWeight: "900" }}>Add venue & open slot</Text>
          </TouchableOpacity>
          <Text style={{ color: C.dim, textAlign: "center", fontSize: 12, lineHeight: 18 }}>Next: Manage lineups to place approved artists into this battle.</Text>
        </>
      ) : (
        <>
          <SectionLabel>SELECT VENUE BATTLE</SectionLabel>
          {openVenues.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: SPACE.lg, marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 17, textAlign: "center" }}>No open venues yet</Text>
              <Text style={{ color: C.muted, marginTop: SPACE.sm, textAlign: "center", lineHeight: 22 }}>Publish your first slot to start adding artists.</Text>
              <TouchableOpacity
                onPress={() => setMode("publish")}
                style={{ marginTop: SPACE.md, backgroundColor: ROLE.venue.primary, borderRadius: 14, paddingHorizontal: SPACE.lg, paddingVertical: 14 }}
              >
                <Text style={{ color: C.ink, fontWeight: "900" }}>Publish open slot →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            openVenues.map((v) => {
              const isNew = v.id === justPublishedId;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => {
                    setSelectedVenueId(v.id);
                    if (v.id !== justPublishedId) setJustPublishedId(null);
                  }}
                  style={{
                    backgroundColor: selectedVenue?.id === v.id ? ROLE.venue.bg : C.card,
                    borderRadius: 16,
                    padding: SPACE.md,
                    marginBottom: SPACE.sm,
                    borderWidth: 1,
                    borderColor: selectedVenue?.id === v.id ? ROLE.venue.border : isNew ? ROLE.venue.primary : C.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                    <Text style={{ color: C.text, fontWeight: "900" }}>{v.venueName}</Text>
                    {isNew ? (
                      <View style={{ marginLeft: SPACE.sm, backgroundColor: ROLE.venue.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: C.ink, fontSize: 10, fontWeight: "900" }}>NEW</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACE.xs, flexWrap: "wrap" }}>
                    <GenrePill genre={v.slotGenre} />
                    <Text style={{ color: C.muted, marginLeft: SPACE.sm, fontSize: 12 }}>
                      {v.district} · {v.artists.length} in lineup · {v.slotsOpen} spots open
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {isJustPublished && selectedVenue ? (
            <View style={{ backgroundColor: "#14532d", borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.accent }}>
              <Text style={{ color: C.accent, fontWeight: "900" }}>✓ {selectedVenue.venueName} added</Text>
              <Text style={{ color: C.muted, marginTop: 4, lineHeight: 20 }}>Live on Discover. Add approved {selectedVenue.slotGenre} artists below.</Text>
              <View style={{ flexDirection: "row", marginTop: SPACE.sm, flexWrap: "wrap" }}>
                <TouchableOpacity
                  onPress={() => onViewOnDiscover(selectedVenue.id)}
                  style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: SPACE.sm, marginBottom: SPACE.xs }}
                >
                  <Text style={{ color: C.ink, fontWeight: "900", fontSize: 12 }}>View on Discover</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setJustPublishedId(null)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: C.dim, fontWeight: "700", fontSize: 12 }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {selectedVenue ? (
            <>
              <View style={{ backgroundColor: ROLE.venue.bg, borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: ROLE.venue.border }}>
                <Text style={{ color: ROLE.venue.soft, fontSize: 11, fontWeight: "700" }}>LINEUP · {selectedVenue.slotGenre.toUpperCase()}</Text>
                <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{selectedVenue.venueName}</Text>
                <Text style={{ color: C.muted, marginTop: 4 }}>{selectedVenue.artists.length} artists competing · {selectedVenue.slotsOpen} slots left</Text>
              </View>

              <SectionLabel>CURRENT LINEUP</SectionLabel>
              {selectedVenue.artists.length === 0 ? (
                <Text style={{ color: C.dim, marginBottom: SPACE.md }}>No artists yet. Add from roster or accept applications.</Text>
              ) : (
                selectedVenue.artists.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: C.surface,
                      borderRadius: 14,
                      padding: SPACE.md,
                      marginBottom: SPACE.sm,
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontWeight: "800" }}>{a.name}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{a.supporters} supporters · {a.genre}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onRemoveArtistFromVenue(selectedVenue.id, a.id)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: C.dim, fontWeight: "800", fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <SectionLabel>ADD APPROVED ARTIST</SectionLabel>
              {rosterForVenue.length === 0 ? (
                <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 20 }}>
                  No matching verified {selectedVenue.slotGenre} artists available. Approve more in Curator tools.
                </Text>
              ) : (
                rosterForVenue.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => onAddArtistToVenue(selectedVenue.id, a.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: C.card,
                      borderRadius: 14,
                      padding: SPACE.md,
                      marginBottom: SPACE.sm,
                      borderWidth: 1,
                      borderColor: ROLE.artist.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontWeight: "800" }}>{a.stageName}</Text>
                      <Text style={{ color: C.dim, fontSize: 12 }}>@{a.handle} · {a.genre}</Text>
                    </View>
                    <Text style={{ color: ROLE.artist.primary, fontWeight: "900", fontSize: 12 }}>Add to battle</Text>
                  </TouchableOpacity>
                ))
              )}

              {venueApps.length > 0 ? (
                <>
                  <SectionLabel>BATTLE APPLICATIONS</SectionLabel>
                  {venueApps.map((app) => (
                    <View
                      key={app.id}
                      style={{
                        backgroundColor: C.surface,
                        borderRadius: 14,
                        padding: SPACE.md,
                        marginBottom: SPACE.sm,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <Text style={{ color: C.text, fontWeight: "800" }}>{app.artistName}</Text>
                      <Text style={{ color: C.dim, fontSize: 11, fontWeight: "800", marginTop: 8 }}>팬들이 응원할 이유</Text>
                      <Text style={{ color: C.muted, marginTop: 4, lineHeight: 20, fontSize: 13 }}>{app.battlePitch}</Text>
                      <Text style={{ color: C.dim, fontSize: 11, fontWeight: "800", marginTop: 8 }}>소셜 증거</Text>
                      <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{formatSocialProofSummary(app.social)}</Text>
                      <BattleArtistSocialProof social={app.social} compact sectionLabel="아티스트 확인하기" />
                      <TouchableOpacity onPress={() => onAcceptBattleApplication(app.id)} style={{ marginTop: SPACE.sm, alignSelf: "flex-start" }}>
                        <Text style={{ color: ROLE.venue.primary, fontWeight: "900" }}>Accept into lineup →</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : null}

              <TouchableOpacity
                onPress={() => setMode("publish")}
                style={{ marginTop: SPACE.lg, paddingVertical: SPACE.md, alignItems: "center", borderWidth: 1, borderColor: ROLE.venue.border, borderRadius: 14, borderStyle: "dashed" }}
              >
                <Text style={{ color: ROLE.venue.primary, fontWeight: "800" }}>+ Publish another open slot</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </>
      )}
    </>
  );
}

function ProtoToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: SPACE.md,
        right: SPACE.md,
        bottom: 96,
        zIndex: 200,
        backgroundColor: "#0f172a",
        borderRadius: 16,
        paddingHorizontal: SPACE.md,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: ROLE.fan.border,
      }}
    >
      <Text style={{ color: C.text, fontWeight: "700", lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

function BottomNav({ activeTab, onTabChange, visible }: { activeTab: Tab; onTabChange: (t: Tab) => void; visible: boolean }) {
  if (!visible) return null;
  const tabs: { id: Tab; label: string }[] = [
    { id: "discover", label: "Venues" },
    { id: "tickets", label: "Tickets" },
    { id: "profile", label: "Profile" },
  ];
  return (
    <View style={{ position: "absolute", left: SPACE.md, right: SPACE.md, bottom: 24, backgroundColor: "#0f172a", borderRadius: 28, paddingVertical: SPACE.md, flexDirection: "row", justifyContent: "space-around", borderWidth: 1, borderColor: C.border }}>
      {tabs.map((tab) => {
        const on = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} onPress={() => onTabChange(tab.id)}>
            <Text style={{ color: on ? C.accent : C.dim, fontWeight: "900", fontSize: 13 }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppContent() {
  const walletSeed = useMemo(() => seedTicketWalletState(), []);
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [venues, setVenues] = useState<VenueCompetition[]>(() => walletSeed.venues);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueCompetition | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<CompetingArtist | null>(null);
  const [backingStep, setBackingStep] = useState<BackingStep>("review");
  const [district, setDistrict] = useState<DistrictFilter>("전체");
  const [genreFilter, setGenreFilter] = useState<GenreFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [venueBackings, setVenueBackings] = useState<Record<string, string>>(() => walletSeed.venueBackings);
  const [wonTickets, setWonTickets] = useState<Ticket[]>(() => walletSeed.wonTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reputation, setReputation] = useState(185);
  const [fanInvites, setFanInvites] = useState<FanInvite[]>([]);
  const [artistApplications, setArtistApplications] = useState<ArtistApplication[]>([]);
  const [profileMode, setProfileMode] = useState<ProfileMode>("fan");
  const [artistRoleStatus, setArtistRoleStatus] = useState<ArtistApprovalStatus>("not_applied");
  const [artistStageName, setArtistStageName] = useState("");
  const [artistRoleRequests, setArtistRoleRequests] = useState<ArtistRoleRequest[]>(SEED_ARTIST_ROLE_REQUESTS);
  const [approvedArtists, setApprovedArtists] = useState<ApprovedArtist[]>(SEED_APPROVED_ARTISTS);
  const [artistDetailReturn, setArtistDetailReturn] = useState<ArtistDetailReturn>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flowEpoch, setFlowEpoch] = useState(0);
  const fanHandle = "mike_seoul";
  const isCurator = true;
  const onecoreUserId = "user-mike";
  const onecoreAdminId = "admin@fanstage";

  const [onecoreState, setOnecoreState] = useState<OnecoreState>(() => seedOnecoreState());
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [coreCommitError, setCoreCommitError] = useState<string | undefined>();
  const [artistInviteRaceId, setArtistInviteRaceId] = useState<string | null>(null);
  const [artistInviteSubmitted, setArtistInviteSubmitted] = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((msg: string) => setToast(msg), []);

  const handleApproveArtistRequest = (id: string) => {
    const req = artistRoleRequests.find((r) => r.id === id);
    if (!req) return;
    setArtistRoleRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)));
    const rosterEntry = requestToApprovedArtist(req);
    setApprovedArtists((prev) => (prev.some((a) => a.handle === rosterEntry.handle) ? prev : [rosterEntry, ...prev]));
    if (req.handle === fanHandle) {
      setArtistRoleStatus("approved");
      setArtistStageName(req.stageName);
    }
    showToast(`Approved ${req.stageName} · ready for venue lineups`);
  };

  const handleAddArtistToVenue = (venueId: string, artistId: string) => {
    const roster = approvedArtists.find((a) => a.id === artistId);
    if (!roster) return;
    setVenues((prev) => {
      const next = prev.map((v) => {
        if (v.id !== venueId) return v;
        return addArtistToVenueLineup(v, roster) ?? v;
      });
      const updated = next.find((v) => v.id === venueId);
      if (updated && updated.artists.some((a) => a.id === roster.id)) {
        showToast(`${roster.stageName} added to ${updated.venueName}`);
      }
      return next;
    });
  };

  const handleRemoveArtistFromVenue = (venueId: string, artistId: string) => {
    setVenues((prev) =>
      prev.map((v) => {
        if (v.id !== venueId || v.winnerId) return v;
        if (!v.artists.some((a) => a.id === artistId)) return v;
        return {
          ...v,
          artists: v.artists.filter((a) => a.id !== artistId),
          slotsOpen: v.slotsOpen + 1,
        };
      })
    );
    showToast("Removed from lineup");
  };

  const handleAcceptBattleApplication = (appId: string) => {
    const app = artistApplications.find((a) => a.id === appId);
    if (!app) return;
    const venue = venues.find((v) => v.id === app.venueId);
    if (!venue || venue.winnerId) return;
    const entrant = applicationToCompetingArtist(app, venue);
    if (venue.artists.some((a) => a.name === entrant.name)) {
      setArtistApplications((prev) => prev.filter((a) => a.id !== appId));
      showToast(`${entrant.name} is already in this battle`);
      return;
    }
    setVenues((prev) =>
      prev.map((v) =>
        v.id === venue.id
          ? { ...v, artists: [...v.artists, entrant], slotsOpen: Math.max(0, v.slotsOpen - 1) }
          : v
      )
    );
    setArtistApplications((prev) => prev.filter((a) => a.id !== appId));
    showToast(`${entrant.name} accepted into ${venue.venueName}`);
  };

  const handleRejectArtistRequest = (id: string) => {
    const req = artistRoleRequests.find((r) => r.id === id);
    if (!req) return;
    setArtistRoleRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r)));
    if (req.handle === fanHandle) {
      setArtistRoleStatus("not_applied");
    }
    showToast(`Denied @${req.handle}`);
  };

  const queueArtistRoleApplication = (
    stageName: string,
    source: ArtistRoleRequest["source"],
    note?: string,
    slotGenre?: SlotGenre,
    battlePitch?: string,
    social?: ArtistSocialProof
  ) => {
    if (artistRoleStatus === "approved") return;
    setArtistRoleStatus("pending");
    setArtistStageName(stageName);
    setArtistRoleRequests((prev) =>
      enqueueArtistRoleRequest(prev, { handle: fanHandle, stageName, source, note, slotGenre, battlePitch, social })
    );
  };

  const refundedPicks = useMemo(() => buildRefundedPicks(venues, venueBackings), [venues, venueBackings]);

  const discoverOnecoreRaces = useMemo(() => {
    return onecoreState.races
      .filter((r) => r.status !== "draft")
      .map((race) => {
        const artist = artistById(onecoreState, race.artistId);
        return {
          race,
          artistName: artist?.name ?? "아티스트",
          artistGenre: artist?.genre ?? "",
        };
      });
  }, [onecoreState]);

  const openOnecoreRace = (raceId: string) => {
    setSelectedRaceId(raceId);
    setCoreCommitError(undefined);
    setOverlay("raceProposal");
  };

  const liveVenue = useMemo(() => findLiveVenue(venues, selectedVenue), [venues, selectedVenue]);
  const liveArtist = useMemo(() => findLiveArtist(liveVenue, selectedArtist), [liveVenue, selectedArtist]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVenues((prev) => tickVenueCountdowns(prev));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasEnded = venues.some((v) => !v.winnerId && countdownEnded(v.countdown));
    if (!hasEnded) return;
    const { venues: resolved, tickets, toast: battleToast } = resolveEndedBattles(venues, venueBackings, wonTickets);
    setVenues(resolved);
    if (tickets.length !== wonTickets.length) setWonTickets(tickets);
    if (battleToast) showToast(battleToast);
  }, [venues, venueBackings, wonTickets, showToast]);

  const catalogVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchDistrict = district === "전체" || v.district === district;
      const matchGenre = genreFilter === "All" || v.slotGenre === genreFilter;
      return matchDistrict && matchGenre;
    });
  }, [district, genreFilter, venues]);

  const filteredVenues = useMemo(() => {
    if (statusFilter === "All") return catalogVenues;
    return catalogVenues.filter((v) => getVenueMomentum(v) === statusFilter);
  }, [catalogVenues, statusFilter]);

  const openVenueById = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    setSelectedVenue(venue);
    setOverlay("venueDetail");
  };

  const openInvite = (venue?: VenueCompetition) => {
    if (venue) setSelectedVenue(venue);
    setFlowEpoch((n) => n + 1);
    setOverlay("inviteArtist");
  };

  const openApply = (venue?: VenueCompetition) => {
    if (venue) setSelectedVenue(venue);
    setFlowEpoch((n) => n + 1);
    setOverlay("applyBattle");
  };

  const openVenue = (v: VenueCompetition) => {
    setSelectedVenue(venues.find((x) => x.id === v.id) ?? v);
    setOverlay("venueDetail");
  };

  const openArtist = (v: VenueCompetition, a: CompetingArtist, returnTo: ArtistDetailReturn = "discover") => {
    const venue = venues.find((x) => x.id === v.id) ?? v;
    const artist = venue.artists.find((x) => x.id === a.id) ?? a;
    setSelectedVenue(venue);
    setSelectedArtist(artist);
    setArtistDetailReturn(returnTo);
    setOverlay("artistDetail");
  };

  const openArtistFromTicket = (ticket: Ticket) => {
    const ctx = resolveArtist(venues, {
      venueId: ticket.venueId,
      artistId: ticket.artistId,
      artistName: ticket.artist,
      venueName: ticket.venue,
    });
    if (ctx) openArtist(ctx.venue, ctx.artist, "tickets");
  };

  const openArtistFromPick = (pick: PendingPick) => {
    const ctx = resolveArtist(venues, { venueId: pick.venueId, artistId: pick.artistId, artistName: pick.artist, venueName: pick.venue });
    if (ctx) openArtist(ctx.venue, ctx.artist, "tickets");
  };

  const openArtistFromRefund = (refund: RefundedPick) => {
    const ctx = resolveArtist(venues, {
      venueId: refund.venueId,
      artistId: refund.artistId,
      artistName: refund.artist,
      venueName: refund.venue,
    });
    if (ctx) openArtist(ctx.venue, ctx.artist, "tickets");
  };

  const openTicketQr = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setOverlay("ticketQr");
  };

  const closeArtistDetail = () => {
    const returnTo = artistDetailReturn;
    setArtistDetailReturn(null);
    if (returnTo === "venueDetail" && selectedVenue) {
      setSelectedArtist(null);
      setOverlay("venueDetail");
      return;
    }
    setOverlay(null);
    setSelectedArtist(null);
    setSelectedVenue(null);
  };

  const cancelVenuePick = (v: VenueCompetition) => {
    if (v.winnerId) {
      showToast("이미 확정된 공연입니다.");
      return;
    }
    const pickId = venueBackings[v.id];
    if (!pickId) return;
    const artist = v.artists.find((a) => a.id === pickId);
    setVenueBackings((prev) => {
      const next = { ...prev };
      delete next[v.id];
      return next;
    });
    setVenues((prev) =>
      prev.map((venue) => {
        if (venue.id !== v.id) return venue;
        return {
          ...venue,
          artists: venue.artists.map((a) =>
            a.id === pickId ? { ...a, supporters: Math.max(0, a.supporters - 1) } : a
          ),
        };
      })
    );
    showToast(`${artist?.name ?? "선택"} — 이 무대 선택을 취소했어요.`);
  };

  const tryBackArtist = (v: VenueCompetition, a: CompetingArtist) => {
    if (v.winnerId) {
      showToast("이미 확정된 공연입니다.");
      return;
    }
    const existing = venueBackings[v.id];
    if (existing === a.id) {
      showToast(`${a.name} — 내가 선택한 팀이에요.`);
      return;
    }
    if (existing && existing !== a.id) {
      const locked = v.artists.find((x) => x.id === existing);
      showToast(`다른 팀을 선택하려면 ${locked?.name ?? "현재"} 선택을 먼저 취소하세요.`);
      return;
    }
    setSelectedVenue(v);
    setSelectedArtist(a);
    setBackingStep("review");
    setOverlay("backingFlow");
  };

  const completeBacking = () => {
    if (!liveVenue || !liveArtist) return;
    setVenueBackings((prev) => ({ ...prev, [liveVenue.id]: liveArtist.id }));
    setVenues((prev) => bumpArtistSupport(prev, liveVenue.id, liveArtist.id));
    setOverlay("backingConfirmation");
    setReputation((r) => r + 25);
    showToast(`${liveArtist.name}와 함께 이 무대를 만들고 있어요.`);
  };

  const closeOverlay = () => {
    setOverlay(null);
    setSelectedArtist(null);
    setSelectedVenue(null);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    closeOverlay();
    setSelectedTicket(null);
  };

  const renderOverlayContent = () => {
    if (overlay === "ticketQr" && selectedTicket) {
      return (
        <TicketQrScreen
          ticket={selectedTicket}
          onBack={() => {
            if (selectedVenue && selectedArtist) setOverlay("artistDetail");
            else setOverlay(null);
          }}
        />
      );
    }
    if (overlay === "inviteArtist") {
      return (
        <InviteArtistFlow
          key={`invite-${flowEpoch}`}
          venues={filteredVenues.length ? filteredVenues : venues}
          preselectedVenue={liveVenue}
          onBack={closeOverlay}
          onSubmit={(inv) => {
            setFanInvites((prev) => [...prev, inv]);
            setReputation((r) => r + 15);
            showToast(`Invite sent for ${inv.profileId} · ${inv.genre}.`);
          }}
          onViewVenue={openVenueById}
        />
      );
    }
    if (overlay === "applyBattle") {
      return (
        <ApplyBattleFlow
          key={`apply-${flowEpoch}`}
          venues={venues}
          preselectedVenue={liveVenue}
          onBack={closeOverlay}
          onSubmit={(app) => {
            setArtistApplications((prev) => [...prev, app]);
            setReputation((r) => r + 10);
            showToast(`Application submitted for ${app.artistName}.`);
          }}
          onArtistRolePending={(name, slotGenre, battlePitch, social) => {
            queueArtistRoleApplication(name, "battle", `${name} — battle application`, slotGenre, battlePitch, social);
          }}
          onViewVenue={openVenueById}
        />
      );
    }
    if (overlay === "raceProposal" && selectedRaceId) {
      const race = onecoreState.races.find((r) => r.id === selectedRaceId);
      const artist = race ? artistById(onecoreState, race.artistId) : undefined;
      const policy = race ? refundPolicyById(onecoreState, race.refundPolicyId) : undefined;
      if (!race || !artist || !policy) return null;
      const venues = onecoreState.venueCandidates.filter((v) => race.venueCandidateIds.includes(v.id));
      return (
        <RaceProposalScreen
          race={race}
          artist={artist}
          refundPolicy={policy}
          venues={venues}
          foundingFans={getPublicFoundingFans(onecoreState, race.id)}
          currentUserDisplayName="Mike"
          onBack={closeOverlay}
          commitError={coreCommitError}
          onCommit={(opts) => {
            const { state: next, error } = commitCore(onecoreState, race.id, onecoreUserId, opts);
            if (error) {
              setCoreCommitError(error);
              return;
            }
            setOnecoreState(next);
            setCoreCommitError(undefined);
            showToast("core 참여가 반영되었습니다.");
          }}
        />
      );
    }
    if (overlay === "adminRace") {
      return (
        <AdminRaceScreen
          state={onecoreState}
          adminId={onecoreAdminId}
          onBack={closeOverlay}
          onCreate={(draft, publishActive) => {
            setOnecoreState((prev) => createRaceFromDraft(prev, draft, onecoreAdminId, publishActive));
            showToast(publishActive ? "Race 게시됨" : "Race 초안 저장됨");
          }}
          onUpdate={(raceId, partial) => {
            setOnecoreState((prev) => updateRaceDraft(prev, raceId, partial, onecoreAdminId));
            showToast("Race 수정됨");
          }}
          onUpdateOperations={(raceId, operations) => {
            setOnecoreState((prev) => updateRaceOperations(prev, raceId, operations, onecoreAdminId));
            showToast("운영 플로우 저장됨");
          }}
          onStatusChange={(raceId, toStatus, reason, visibleToPublic, failureKind) => {
            setOnecoreState((prev) =>
              applyRaceStatusChange(prev, raceId, toStatus, onecoreAdminId, reason, {
                visibleToPublic,
                failureKind,
              })
            );
            showToast(`상태 → ${toStatus}`);
          }}
          onSendArtistInvite={(raceId) => {
            setOnecoreState((prev) => sendArtistPrivateInvite(prev, raceId, onecoreAdminId));
            showToast("비공개 아티스트 초대 발송");
          }}
          onPreviewArtistInvite={(raceId) => {
            setArtistInviteRaceId(raceId);
            setArtistInviteSubmitted(false);
            setOverlay("artistInvite");
          }}
        />
      );
    }
    if (overlay === "artistInvite" && artistInviteRaceId) {
      const race = onecoreState.races.find((r) => r.id === artistInviteRaceId);
      const artist = race ? artistById(onecoreState, race.artistId) : undefined;
      if (!race || !artist) return null;
      const venues = inviteVenuesForRace(onecoreState, race);
      return (
        <ArtistInviteScreen
          race={race}
          artist={artist}
          venues={venues}
          backerCount={Math.max(backerCount(onecoreState, race.id), race.currentCount)}
          fanNotes={race.fanNoteSamples ?? []}
          inviteToken={race.artistInviteToken ?? "preview"}
          submitted={artistInviteSubmitted || !!race.artistInvite}
          onBack={() => setOverlay("adminRace")}
          onSubmit={(draft) => {
            const { state: next, error } = submitArtistInvite(
              onecoreState,
              race.id,
              race.artistInviteToken ?? "preview",
              draft
            );
            if (error) {
              showToast(error);
              return;
            }
            const nextAfterResponse =
              draft.response === "interested"
                ? applyRaceStatusChange(
                    next,
                    race.id,
                    "venue_matching",
                    `artist:${race.artistId}`,
                    "아티스트 관심 확인 · 공연장 후보 검토 시작",
                    { visibleToPublic: true }
                  )
                : draft.response === "adjust_terms"
                  ? applyRaceStatusChange(
                      next,
                      race.id,
                      "confirming_terms",
                      `artist:${race.artistId}`,
                      "아티스트 조건 조정 요청 · 조건 확인",
                      { visibleToPublic: true }
                    )
                  : applyRaceStatusChange(
                      next,
                      race.id,
                      "failed",
                      `artist:${race.artistId}`,
                      "아티스트 일정 불가 · 환불 또는 대안 검토",
                      {
                        visibleToPublic: true,
                        failureKind: "artist_unavailable",
                        failureMessage: "아티스트가 이번 일정에는 참여하기 어렵다고 응답했습니다.",
                      }
                    );
            setOnecoreState(nextAfterResponse);
            setArtistInviteSubmitted(true);
            showToast("아티스트 응답이 저장되었습니다.");
          }}
        />
      );
    }
    if (overlay === "curatorTools") {
      return (
        <DemandScoutScreen
          state={onecoreState}
          scoutId={onecoreUserId}
          onBack={closeOverlay}
          onCreateCampaign={(draft) => {
            setOnecoreState((prev) => createScoutCampaign(prev, onecoreUserId, draft));
            showToast("수요 캠페인 초안 저장됨");
          }}
          onHandoff={(campaignId) => {
            setOnecoreState((prev) => handoffScoutToAdmin(prev, campaignId, onecoreAdminId));
            showToast("Admin handoff 기록됨");
          }}
          artistApprovalsSlot={
            <ArtistApprovalQueue
              requests={artistRoleRequests}
              onApprove={handleApproveArtistRequest}
              onReject={handleRejectArtistRequest}
            />
          }
        />
      );
    }
    if (overlay === "venueAdmin") {
      return (
        <VenueAdminScreen
          onBack={closeOverlay}
          venues={venues}
          approvedArtists={approvedArtists}
          battleApplications={artistApplications}
          onPublish={(draft) => {
            const id = `venue-${Date.now()}`;
            const newVenue: VenueCompetition = {
              id,
              venueName: draft.venueName,
              district: draft.district,
              address: `${draft.district} · Fanstage open slot`,
              capacity: draft.capacity,
              slotLabel: "Opening weekend · 8PM",
              slotDate: "TBA",
              bookingCloseDate: "TBA",
              bookingCloseTime: "23:59",
              countdown: { days: 5, hours: 0, minutes: 0 },
              minGoal: 80,
              slotGenre: draft.slotGenre,
              slotsOpen: 3,
              artists: [],
            };
            setVenues((prev) => [newVenue, ...prev]);
            showToast(`${draft.venueName} added · ${draft.district} ${draft.slotGenre}`);
            return id;
          }}
          onViewOnDiscover={(venueId) => {
            const v = venues.find((x) => x.id === venueId);
            if (v) {
              setSelectedVenue(v);
              closeOverlay();
              setActiveTab("discover");
            }
          }}
          onAddArtistToVenue={handleAddArtistToVenue}
          onRemoveArtistFromVenue={handleRemoveArtistFromVenue}
          onAcceptBattleApplication={handleAcceptBattleApplication}
        />
      );
    }
    if (overlay === "backingConfirmation" && liveVenue && liveArtist) {
      return (
        <BackingConfirmationScreen
          artist={liveArtist}
          venue={liveVenue}
          onViewTickets={() => {
            setOverlay(null);
            setSelectedArtist(null);
            setActiveTab("tickets");
          }}
          onFeed={() => {
            closeOverlay();
            setActiveTab("discover");
          }}
        />
      );
    }
    if (overlay === "backingFlow" && liveVenue && liveArtist) {
      return (
        <BackingFlowScreen
          artist={liveArtist}
          venue={liveVenue}
          step={backingStep}
          onBack={() => {
            if (backingStep === "confirmed") setBackingStep("review");
            else setOverlay(selectedArtist ? "artistDetail" : "venueDetail");
          }}
          onConfirmReview={() => {
            if (backingStep === "review") setBackingStep("confirmed");
            else completeBacking();
          }}
        />
      );
    }
    if (overlay === "artistDetail" && liveVenue && liveArtist) {
      const matchedTicket = wonTickets.find(
        (t) =>
          (t.artistId && t.artistId === liveArtist.id) ||
          (t.artist === liveArtist.name && t.venue === liveVenue.venueName)
      );
      const isUserPick = venueBackings[liveVenue.id] === liveArtist.id;
      const openTicketQr = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setOverlay("ticketQr");
      };
      return (
        <ArtistDetailScreen
          artist={liveArtist}
          venue={liveVenue}
          isUserPick={isUserPick}
          hasTicket={!!matchedTicket}
          onBack={closeArtistDetail}
          onBackArtist={() => tryBackArtist(liveVenue, liveArtist)}
          onCancelPick={isUserPick && !liveVenue.winnerId ? () => cancelVenuePick(liveVenue) : undefined}
          onClaimTicket={() => {
            if (matchedTicket) {
              openTicketQr(matchedTicket);
              return;
            }
            if (isUserPick) {
              const ticket = createWinnerTicket(liveVenue, liveArtist);
              setWonTickets((prev) => (prev.some((t) => t.id === ticket.id) ? prev : [...prev, ticket]));
              openTicketQr(ticket);
              return;
            }
            showToast(`${ticketOpenStatusLabel(liveVenue.countdown, false)} · founding fan 예약을 준비 중이에요`);
          }}
          onInviteFriends={() => {
            showToast(`친구 초대 링크 복사됨 · ${liveArtist.name} @ ${liveVenue.venueName} — 우리가 만든 공연이에요`);
          }}
          onViewSupporterRecord={() => {
            showToast(`서포터 월에 @${fanHandle} 기록됨 · ${liveArtist.name} founding fan`);
          }}
        />
      );
    }
    if (overlay === "venueDetail" && liveVenue) {
      return (
        <VenueDetailScreen
          venue={liveVenue}
          userPickId={venueBackings[liveVenue.id]}
          venueInvites={fanInvites.filter((i) => i.venueId === liveVenue.id)}
          venueApplications={artistApplications.filter((a) => a.venueId === liveVenue.id)}
          onBack={closeOverlay}
          onOpenArtist={(a) => openArtist(liveVenue, a, "venueDetail")}
          onBackArtist={(a) => tryBackArtist(liveVenue, a)}
          onCancelPick={() => cancelVenuePick(liveVenue)}
          onInvite={() => openInvite(liveVenue)}
          onApply={() => openApply(liveVenue)}
        />
      );
    }

    return null;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "tickets":
        return (
          <TicketsScreen
            venues={venues}
            venueBackings={venueBackings}
            wonTickets={wonTickets}
            refunded={refundedPicks}
            onOpenArtistFromTicket={openArtistFromTicket}
            onOpenArtistFromConverting={(v, a) => openArtist(v, a, "tickets")}
            onOpenArtistFromRefund={openArtistFromRefund}
            onOpenTicketQr={openTicketQr}
            onExploreBattles={() => setActiveTab("discover")}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            handle={fanHandle}
            profileMode={profileMode}
            onProfileModeChange={(m) => {
              if (m === "artist" && artistRoleStatus !== "approved") return;
              setProfileMode(m);
            }}
            reputation={reputation}
            picksCount={Object.keys(venueBackings).length}
            invites={fanInvites.length}
            battleApplications={artistApplications.length}
            artistRoleStatus={artistRoleStatus}
            artistStageName={artistStageName}
            onApplyForArtist={() => {
              queueArtistRoleApplication(artistStageName || "Mike Seoul", "profile", "Profile artist role application");
              openApply();
            }}
            onExploreBattles={() => setActiveTab("discover")}
            onOpenVenueAdmin={() => setOverlay("venueAdmin")}
            onOpenCuratorTools={() => setOverlay("curatorTools")}
            onOpenOnecoreAdmin={() => setOverlay("adminRace")}
            isCurator={isCurator}
          />
        );
      default:
        return (
          <VenueFeedScreen
            district={district}
            onDistrictChange={setDistrict}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            venues={filteredVenues}
            venueBackings={venueBackings}
            wonTickets={wonTickets}
            onOpenVenue={openVenue}
            onOpenArtist={(v, a) => openArtist(v, a, "discover")}
            onBackArtist={tryBackArtist}
            onOpenTicketQr={openTicketQr}
            onQrPending={() => showToast("티켓이 발급되면 입장 QR이 열려요")}
            onInviteFriend={(v, a) =>
              showToast(`친구 초대 링크 복사됨 · ${a.name} @ ${v.venueName} — 우리가 만든 공연이에요`)
            }
            onecoreRaces={discoverOnecoreRaces}
            onOpenOnecoreRace={openOnecoreRace}
          />
        );
    }
  };

  const hideNav = overlay !== null;

  const overlayContent = renderOverlayContent();
  const overlayUsesSafeBack = overlay === "venueDetail" || overlay === "artistDetail";
  const overlayOwnsScroll =
    overlay === "raceProposal" ||
    overlay === "adminRace" ||
    overlay === "artistInvite" ||
    overlay === "curatorTools" ||
    overlay === "applyBattle";

  const handleOverlaySafeBack = () => {
    if (overlay === "artistDetail") closeArtistDetail();
    else closeOverlay();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingTop: SPACE.sm, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
      {overlayContent ? (
        <View style={SCREEN_OVERLAY}>
          {overlayUsesSafeBack ? <OverlayBackHeader onPress={handleOverlaySafeBack} /> : null}
          {overlay === "artistDetail" || overlayOwnsScroll ? (
            <View style={{ flex: 1 }}>{overlayContent}</View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: SPACE.md,
                paddingTop: overlayUsesSafeBack ? 32 : SPACE.sm,
                paddingBottom: 120,
              }}
              showsVerticalScrollIndicator={false}
            >
              {overlayContent}
            </ScrollView>
          )}
        </View>
      ) : null}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} visible={!hideNav} />
      <ProtoToast message={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
