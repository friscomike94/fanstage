import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";

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
const BACKING_PRICE = "₩5,000";

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
  | "admin"
  | "inviteArtist"
  | "applyBattle";
type BackingStep = "review" | "confirmed";
type VenueMomentum = "Heating up" | "Almost unlocked" | "Slot won";
type DistrictFilter = "All" | "Hongdae" | "Mapo" | "Itaewon" | "Seongsu";
type SlotGenre = "Indie" | "Electronic" | "Hip-hop" | "Jazz";
type GenreFilter = "All" | SlotGenre;
type StatusFilter = "All" | VenueMomentum;

type CompetingArtist = {
  id: string;
  name: string;
  genre: string;
  supporters: number;
  tagline: string;
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
  countdown: { days: number; hours: number; minutes: number };
  unlockGoal: number;
  slotGenre: SlotGenre;
  slotsOpen: number;
  artists: CompetingArtist[];
  winnerId?: string;
};

const DISTRICT_CHIPS: DistrictFilter[] = ["Hongdae", "Mapo", "Itaewon", "Seongsu"];
const GENRE_CHIPS: GenreFilter[] = ["All", "Indie", "Electronic", "Hip-hop", "Jazz"];

const VENUE_COMPETITIONS: VenueCompetition[] = [
  {
    id: "rolling",
    venueName: "Rolling Hall",
    district: "Mapo",
    address: "19 Wausan-ro, Mapo-gu",
    capacity: 450,
    slotLabel: "Friday headline · 8PM",
    slotDate: "Fri, Jun 20",
    countdown: { days: 2, hours: 14, minutes: 32 },
    unlockGoal: 200,
    slotGenre: "Indie",
    slotsOpen: 2,
    artists: [
      {
        id: "minu",
        name: "Minu & The Satellites",
        genre: "Indie rock",
        supporters: 94,
        tagline: "Mapo grit, singalong choruses",
        story: "Minu writes songs about last-call diners. Rolling Hall is the room they've chased for two years.",
        latestTrack: { title: "Satellite Prayer", duration: "4:08" },
      },
      {
        id: "luna",
        name: "Luna Archive",
        genre: "Dream pop",
        supporters: 78,
        tagline: "Tape-delay vocals, basement hymns",
        story: "Luna Archive turns small rooms into suspended moments — perfect for Rolling's main stage.",
        latestTrack: { title: "Glass Orchard", duration: "3:42" },
      },
      {
        id: "river",
        name: "Riverlight",
        genre: "Indie folk",
        supporters: 41,
        tagline: "Acoustic pulse, crowd hush",
        story: "Riverlight sold out two Fanstage pop-ups. They're betting Mapo wants something quieter and louder at once.",
        latestTrack: { title: "Tidal Room", duration: "3:55" },
      },
    ],
  },
  {
    id: "modeci",
    venueName: "Modeci",
    district: "Itaewon",
    address: "54 Itaewon-ro, Yongsan-gu",
    capacity: 280,
    slotLabel: "Saturday late · 11PM",
    slotDate: "Sat, Jun 21",
    countdown: { days: 0, hours: 9, minutes: 18 },
    unlockGoal: 120,
    slotGenre: "Electronic",
    slotsOpen: 1,
    artists: [
      {
        id: "neon",
        name: "Neon Room",
        genre: "Electronic",
        supporters: 68,
        tagline: "Warehouse subs, pop hooks",
        story: "Neon Room blends Itaewon energy with headline-ready production. Modeci is the crown.",
        latestTrack: { title: "Midnight Relay", duration: "5:11" },
      },
      {
        id: "yuna",
        name: "DJ Yuna Flux",
        genre: "House · K-electronic",
        supporters: 61,
        tagline: "Peak-time pressure, zero filler",
        story: "Yuna Flux has residency heat across Seoul. This slot is seven backers from a photo finish.",
        latestTrack: { title: "Flux State", duration: "4:44" },
      },
    ],
  },
  {
    id: "velvet",
    venueName: "Velvet Hall",
    district: "Seongsu",
    address: "12 Seongsui-ro, Seongdong-gu",
    capacity: 320,
    slotLabel: "Thursday rap showcase · 9PM",
    slotDate: "Thu, Jun 12",
    countdown: { days: 0, hours: 0, minutes: 0 },
    unlockGoal: 100,
    slotGenre: "Hip-hop",
    slotsOpen: 0,
    winnerId: "kontra",
    artists: [
      {
        id: "kontra",
        name: "KONTRA",
        genre: "K-rap",
        supporters: 112,
        tagline: "Seongsu rap, live-band power",
        story: "KONTRA won the Velvet slot with a late surge — 112 backers sealed the booking.",
        latestTrack: { title: "BACKSTAGE PASS", duration: "2:56" },
      },
      {
        id: "sable",
        name: "SABLE CREW",
        genre: "Hip-hop",
        supporters: 89,
        tagline: "Cipher energy, mosh-ready hooks",
        story: "SABLE CREW pushed KONTRA to the wire. Fans still talk about the final 48 hours.",
        latestTrack: { title: "CREW CALL", duration: "3:12" },
      },
    ],
  },
  {
    id: "clubff",
    venueName: "Hongdae Club FF",
    district: "Hongdae",
    address: "33 Eoulmadang-ro, Mapo-gu",
    capacity: 180,
    slotLabel: "Wednesday emerging night · 7:30PM",
    slotDate: "Wed, Jun 18",
    countdown: { days: 4, hours: 6, minutes: 5 },
    unlockGoal: 80,
    slotGenre: "Jazz",
    slotsOpen: 3,
    artists: [
      {
        id: "han",
        name: "Han River Jazz Collective",
        genre: "Modern jazz",
        supporters: 34,
        tagline: "Improv-led, room-commanding",
        story: "The collective brings Yongsan polish to Hongdae intimacy — a jazz slot made for them.",
        latestTrack: { title: "Riverlight Suite", duration: "6:20" },
      },
      {
        id: "noir",
        name: "Blue Hour Trio",
        genre: "Jazz fusion",
        supporters: 28,
        tagline: "Late-set smoke, brass heat",
        story: "Blue Hour Trio lives in the after-midnight pocket Club FF wants to own.",
        latestTrack: { title: "Smoke Signal", duration: "5:02" },
      },
    ],
  },
];

type PendingPick = {
  id: string;
  venueId: string;
  artistId: string;
  artist: string;
  venue: string;
  countdown: string;
  rank: string;
};

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

type FanInvite = { id: string; venueId: string; artistName: string; note: string };
type ArtistApplication = { id: string; venueId: string; artistName: string; pitch: string };

const PROFILE_BADGES = [
  { label: "Founding Fan", detail: "Backed a winner before slot closed" },
  { label: "Tastemaker", detail: "Picked the leader in 2 active battles" },
  { label: "Seoul Backer", detail: "Voted in 4 district competitions" },
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
  if (total / venue.unlockGoal >= 0.75) return "Almost unlocked";
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
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "ENDED";
  if (c.days > 0) return `${c.days}d ${c.hours}h ${c.minutes}m`;
  return `${c.hours}h ${c.minutes}m`;
}

function resolveArtist(opts: {
  venueId?: string;
  artistId?: string;
  artistName?: string;
  venueName?: string;
}): { venue: VenueCompetition; artist: CompetingArtist } | null {
  for (const venue of VENUE_COMPETITIONS) {
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
  if (venue.winnerId === artist.id) return "Winner · Slot booked";
  if (userPickId === artist.id) return "Your pick · Active";
  const sorted = sortedArtists(venue);
  const rank = sorted.findIndex((a) => a.id === artist.id) + 1;
  if (rank === 1) return "Leading the battle";
  return `#${rank} in battle · ${getVenueMomentum(venue)}`;
}

function rivalryCopy(venue: VenueCompetition) {
  const sorted = sortedArtists(venue);
  const leader = sorted[0];
  const chaser = sorted[1];
  if (!chaser || venue.winnerId) {
    return venue.winnerId
      ? `${leader.name} won the booking · supporters become ticket holders`
      : `${leader.name} leads the pack`;
  }
  const gap = leader.supporters - chaser.supporters;
  if (gap <= 3) return `⚡ Dead heat: ${leader.name} vs ${chaser.name} — only ${gap} backers apart`;
  if (gap <= 10) return `🔥 ${chaser.name} closing fast — ${gap} backers behind ${leader.name}`;
  return `${leader.name} leads by ${gap} backers · ${chaser.name} hunting`;
}

// ——— Primitives ———

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 11, letterSpacing: 1.4, marginBottom: SPACE.sm }}>
      {children}
    </Text>
  );
}

function ScreenHeader({ title, subtitle, onBack, eyebrow }: { title: string; subtitle?: string; onBack?: () => void; eyebrow?: string }) {
  return (
    <View style={{ marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: SPACE.md }}>
          <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
      ) : null}
      {eyebrow ? <Text style={{ color: C.rival, fontWeight: "800", fontSize: 11, marginBottom: SPACE.xs }}>{eyebrow}</Text> : null}
      <Text style={{ color: C.text, fontSize: 32, fontWeight: "900", lineHeight: 38 }}>{title}</Text>
      {subtitle ? <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24, marginTop: SPACE.sm }}>{subtitle}</Text> : null}
    </View>
  );
}

function MomentumBadge({ momentum }: { momentum: VenueMomentum }) {
  const s = momentumStyle(momentum);
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: s.color, fontWeight: "800", fontSize: 11 }}>{momentum.toUpperCase()}</Text>
    </View>
  );
}

function GenrePill({ genre, large }: { genre: SlotGenre; large?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: "#2d1f4e",
        borderRadius: 999,
        paddingHorizontal: large ? 14 : 12,
        paddingVertical: large ? 8 : 6,
        borderWidth: 1,
        borderColor: C.rival + "55",
      }}
    >
      <Text style={{ color: C.rival, fontWeight: "900", fontSize: large ? 13 : 11 }}>{genre.toUpperCase()} SLOT</Text>
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

function ArtistVerifiedBadge() {
  return (
    <View style={{ backgroundColor: ROLE.artist.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: ROLE.artist.border, flexDirection: "row", alignItems: "center" }}>
      <Text style={{ color: ROLE.artist.soft, marginRight: 4 }}>✓</Text>
      <Text style={{ color: ROLE.artist.primary, fontWeight: "900", fontSize: 11 }}>VERIFIED ARTIST</Text>
    </View>
  );
}

function RoleSwitcher({
  mode,
  canUseArtist,
  onChange,
}: {
  mode: ProfileMode;
  canUseArtist: boolean;
  onChange: (m: ProfileMode) => void;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, padding: 4, marginBottom: SPACE.lg }}>
      {(["fan", "artist"] as ProfileMode[]).map((r) => {
        const active = mode === r;
        const role = r === "fan" ? ROLE.fan : ROLE.artist;
        const disabled = r === "artist" && !canUseArtist;
        return (
          <TouchableOpacity
            key={r}
            onPress={() => !disabled && onChange(r)}
            style={{
              flex: 1,
              backgroundColor: active ? role.bg : "transparent",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              borderWidth: active ? 1 : 0,
              borderColor: role.border,
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <Text style={{ color: active ? role.primary : C.dim, fontWeight: "900", fontSize: 13 }}>
              {role.label} mode
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FanIdentityBar({
  handle,
  reputation,
  invites,
  onInvite,
  onApply,
}: {
  handle: string;
  reputation: number;
  invites: number;
  onInvite: () => void;
  onApply: () => void;
}) {
  const level = getFanLevel(reputation);
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.xl, borderWidth: 1, borderColor: ROLE.fan.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: SPACE.xs }}>
            <Text style={{ color: ROLE.fan.soft, fontSize: 11, fontWeight: "700", marginRight: SPACE.sm }}>FAN IDENTITY</Text>
            <FanLevelBadge reputation={reputation} />
          </View>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: "900" }}>@{handle}</Text>
          <Text style={{ color: level.color, fontWeight: "800", marginTop: 4 }}>{reputation} rep</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 22 }}>{invites}</Text>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>invites sent</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity onPress={onInvite} style={{ flex: 1, backgroundColor: ROLE.fan.bg, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginRight: SPACE.xs, borderWidth: 1, borderColor: ROLE.fan.border }}>
          <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 13 }}>Invite artist</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onApply} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginLeft: SPACE.xs, borderWidth: 1, borderColor: ROLE.artist.border }}>
          <Text style={{ color: ROLE.artist.soft, fontWeight: "900", fontSize: 13 }}>Apply to battle</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>LIVE</Text>
    </View>
  );
}

function LandingHero() {
  return (
    <View style={{ borderRadius: 24, overflow: "hidden", marginBottom: SPACE.xl }}>
      <View style={{ backgroundColor: "#070d18", paddingHorizontal: SPACE.lg, paddingTop: 40, paddingBottom: 40, minHeight: 268 }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, backgroundColor: "#0f172a" }} />
        <View style={{ position: "absolute", top: 60, left: 0, right: 0, height: 120, backgroundColor: "#a855f708" }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, backgroundColor: "#22c55e06" }} />
        <View style={{ position: "absolute", top: 20, right: 20, opacity: 0.09 }}>
          <Text style={{ color: C.text, fontSize: 88, fontWeight: "200" }}>♫</Text>
        </View>
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
        <Text style={{ color: C.dim, fontWeight: "700", fontSize: 10, letterSpacing: 3.2 }}>FANSTAGE · SEOUL</Text>
        <Text style={{ color: C.text, fontSize: 44, fontWeight: "900", lineHeight: 48, marginTop: 16, letterSpacing: -1.2 }}>
          The room{"\n"}decides.
        </Text>
        <Text style={{ color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 18, maxWidth: 320, fontWeight: "500" }}>
          Genre-locked venue battles. One pick. Highest support wins the slot.
        </Text>
        <View style={{ flexDirection: "row", marginTop: 28, alignItems: "center" }}>
          <LiveBadgeStatic />
          <Text style={{ color: C.dim, marginLeft: 14, fontWeight: "600", fontSize: 12, letterSpacing: 0.3 }}>♪ Live culture · Seoul</Text>
        </View>
      </View>
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
  const activeCount = [genreFilter !== "All", district !== "All", statusFilter !== "All"].filter(Boolean).length;

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
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Filters</Text>
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
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, letterSpacing: 1 }}>GENRE</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {GENRE_CHIPS.map((chip) => (
              <FilterChip key={chip} label={chip} active={genreFilter === chip} accent={C.rival} onPress={() => onGenreFilterChange(chip)} />
            ))}
          </View>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, marginTop: SPACE.xs, letterSpacing: 1 }}>AREA</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(["All", ...DISTRICT_CHIPS] as DistrictFilter[]).map((chip) => (
              <FilterChip key={chip} label={chip} active={district === chip} accent={ROLE.fan.primary} onPress={() => onDistrictChange(chip)} />
            ))}
          </View>
          <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, marginBottom: SPACE.sm, marginTop: SPACE.xs, letterSpacing: 1 }}>STATUS</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(["All", "Heating up", "Almost unlocked", "Slot won"] as StatusFilter[]).map((chip) => (
              <FilterChip
                key={chip}
                label={chip === "All" ? "All" : chip}
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

function FeaturedGenreBattle({
  venues,
  onOpenVenue,
}: {
  venues: VenueCompetition[];
  onOpenVenue: (v: VenueCompetition) => void;
}) {
  const active = venues.filter((v) => !v.winnerId);
  const featured =
    active.find((v) => v.slotGenre === "Electronic") ?? active.find((v) => v.slotGenre === "Indie") ?? active[0];
  if (!featured) return null;

  const leader = sortedArtists(featured)[0];
  const momentum = getVenueMomentum(featured);

  return (
    <View style={{ marginBottom: SPACE.xl }}>
      <Text style={{ color: C.dim, fontWeight: "700", fontSize: 10, letterSpacing: 2.4, marginBottom: 12 }}>FEATURED GENRE BATTLE</Text>
      <TouchableOpacity
        onPress={() => onOpenVenue(featured)}
        activeOpacity={0.92}
        style={{
          backgroundColor: "#0c121f",
          borderRadius: 20,
          padding: SPACE.lg,
          borderWidth: 1,
          borderColor: "#ffffff12",
          borderLeftWidth: 4,
          borderLeftColor: ROLE.artist.primary,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: SPACE.md }}>
            <Text style={{ color: ROLE.artist.soft, fontWeight: "800", fontSize: 11, letterSpacing: 1.8 }}>{featured.slotGenre.toUpperCase()}</Text>
            <Text style={{ color: C.text, fontSize: 24, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 }}>{featured.venueName}</Text>
            <Text style={{ color: C.muted, marginTop: 6, fontSize: 14, fontWeight: "500" }}>{featured.district} · {featured.artists.length} artists</Text>
          </View>
          <Text style={{ color: C.dim, fontSize: 28, opacity: 0.35 }}>♪</Text>
        </View>
        <View style={{ height: 1, backgroundColor: "#ffffff10", marginVertical: 18 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 }}>LEADING ACT</Text>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 15, marginTop: 4 }}>{leader.name}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700" }}>MOMENTUM</Text>
            <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 4 }}>{momentum}</Text>
          </View>
        </View>
        <Text style={{ color: ROLE.fan.soft, fontWeight: "700", fontSize: 12, marginTop: 16 }}>Open battle →</Text>
      </TouchableOpacity>
    </View>
  );
}

function CountdownPill({ venue }: { venue: VenueCompetition }) {
  const ended = venue.winnerId;
  return (
    <View style={{ backgroundColor: ended ? C.border : "#2d1f4e", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ color: ended ? C.dim : C.rival, fontWeight: "900", fontSize: 13 }}>
        {ended ? "BOOKED" : formatCountdown(venue.countdown)}
      </Text>
      <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700", marginTop: 2 }}>{ended ? "Winner locked" : "until voting closes"}</Text>
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
  lockedOut,
  onPress,
  onBack,
}: {
  artist: CompetingArtist;
  rank: number;
  maxSupporters: number;
  isWinner: boolean;
  isLeading: boolean;
  isUserPick: boolean;
  lockedOut: boolean;
  onPress: () => void;
  onBack: () => void;
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
                  <Text style={{ color: C.accent, fontWeight: "800", fontSize: 10 }}>WINNER</Text>
                </View>
              ) : isLeading ? (
                <View style={{ backgroundColor: "#422006", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: SPACE.xs }}>
                  <Text style={{ color: C.gold, fontWeight: "800", fontSize: 10 }}>LEADING</Text>
                </View>
              ) : null}
              {isUserPick ? (
                <View style={{ backgroundColor: "#1e3a5f", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: SPACE.xs }}>
                  <Text style={{ color: "#7dd3fc", fontWeight: "800", fontSize: 10 }}>YOUR PICK</Text>
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
        <Text style={{ color: C.dim, fontSize: 12, fontWeight: "700" }}>{artist.supporters} backers</Text>
      </TouchableOpacity>

      {!isWinner ? (
        <TouchableOpacity
          onPress={onBack}
          disabled={lockedOut}
          style={{
            marginTop: SPACE.sm,
            backgroundColor: lockedOut ? C.border : isUserPick ? C.surface : C.accent,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            borderWidth: lockedOut ? 0 : isUserPick ? 1 : 0,
            borderColor: C.accent,
          }}
        >
          <Text style={{ color: lockedOut ? C.dim : isUserPick ? C.accentSoft : C.ink, fontWeight: "900", fontSize: 14 }}>
            {lockedOut ? "Already backing another artist here" : isUserPick ? `Your pick · ${BACKING_PRICE}` : `Back ${artist.name.split(" ")[0]} · ${BACKING_PRICE}`}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return <WinnerGlow active={isWinner}>{row}</WinnerGlow>;
}

// ——— Venue feed ———

function posterAccent(genre: SlotGenre) {
  if (genre === "Electronic") return { stripe: ROLE.artist.primary, wash: "#3b076433" };
  if (genre === "Hip-hop") return { stripe: ROLE.venue.primary, wash: "#42200633" };
  if (genre === "Jazz") return { stripe: "#93c5fd", wash: "#1e3a5f33" };
  return { stripe: ROLE.fan.primary, wash: "#14532d33" };
}

function VenueCard({
  venue,
  userPickId,
  onOpenVenue,
  onOpenArtist,
  onBackArtist,
}: {
  venue: VenueCompetition;
  userPickId?: string;
  onOpenVenue: () => void;
  onOpenArtist: (artist: CompetingArtist) => void;
  onBackArtist: (artist: CompetingArtist) => void;
}) {
  const momentum = getVenueMomentum(venue);
  const sorted = sortedArtists(venue);
  const leader = sorted[0];
  const total = totalSupporters(venue);
  const progress = Math.min(total / venue.unlockGoal, 1);
  const accent = posterAccent(venue.slotGenre);

  return (
    <View
      style={{
        borderRadius: 24,
        marginBottom: SPACE.xl,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: "#0d1526",
      }}
    >
      <View style={{ height: 6, backgroundColor: accent.stripe }} />
      <View style={{ position: "absolute", top: 20, right: 12, opacity: 0.07 }}>
        <Text style={{ color: C.text, fontSize: 56, fontWeight: "900" }}>♫</Text>
      </View>
      <View style={{ backgroundColor: accent.wash, padding: SPACE.md, paddingTop: SPACE.lg }}>
        <TouchableOpacity onPress={onOpenVenue} activeOpacity={0.92}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACE.md }}>
            <View style={{ flex: 1, paddingRight: SPACE.sm }}>
              <Text style={{ color: accent.stripe, fontWeight: "900", fontSize: 10, letterSpacing: 2 }}>GIG POSTER · BATTLE</Text>
              <Text style={{ color: C.text, fontSize: 28, fontWeight: "900", marginTop: 6, letterSpacing: -0.5 }}>{venue.venueName}</Text>
              <Text style={{ color: C.muted, marginTop: 6, fontWeight: "600" }}>{venue.district} · {venue.capacity} cap · ♪</Text>
            </View>
            <CountdownPill venue={venue} />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: SPACE.md }}>
            {!venue.winnerId ? <View style={{ marginRight: SPACE.sm }}><LiveBadgeStatic /></View> : null}
            <MomentumBadge momentum={momentum} />
            <View style={{ marginLeft: SPACE.xs }}><GenrePill genre={venue.slotGenre} /></View>
          </View>

          <View style={{ backgroundColor: "#080f1c", borderRadius: 14, padding: SPACE.md, marginBottom: SPACE.md, borderLeftWidth: 3, borderLeftColor: accent.stripe }}>
            <Text style={{ color: C.dim, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>ON STAGE TONIGHT</Text>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, marginTop: 6 }}>{venue.slotLabel}</Text>
            <Text style={{ color: C.muted, marginTop: 4 }}>{venue.slotDate}</Text>
          </View>

          <View style={{ backgroundColor: "#2d1f4e", borderRadius: 14, padding: SPACE.md, marginBottom: SPACE.md }}>
            <Text style={{ color: C.rival, fontWeight: "800", fontSize: 13, lineHeight: 20 }}>{rivalryCopy(venue)}</Text>
          </View>

          <View style={{ marginBottom: SPACE.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: SPACE.xs }}>
              <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12 }}>Crowd momentum</Text>
              <Text style={{ color: accent.stripe, fontWeight: "900" }}>{total}/{venue.unlockGoal}</Text>
            </View>
            <View style={{ height: 10, backgroundColor: C.border, borderRadius: 999, overflow: "hidden" }}>
              <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: momentum === "Almost unlocked" ? C.gold : accent.stripe }} />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11, letterSpacing: 1, marginBottom: SPACE.sm }}>LINEUP BATTLE</Text>
      {sorted.slice(0, 3).map((artist, i) => {
        const rank = i + 1;
        const isWinner = venue.winnerId === artist.id;
        const isLeading = !venue.winnerId && rank === 1;
        const isUserPick = userPickId === artist.id;
        const lockedOut = !!userPickId && userPickId !== artist.id && !venue.winnerId;

        return (
          <LeaderboardRow
            key={artist.id}
            artist={artist}
            rank={rank}
            maxSupporters={leader.supporters}
            isWinner={isWinner}
            isLeading={isLeading}
            isUserPick={isUserPick}
            lockedOut={lockedOut}
            onPress={() => onOpenArtist(artist)}
            onBack={() => onBackArtist(artist)}
          />
        );
      })}

      {sorted.length > 3 ? (
        <TouchableOpacity onPress={onOpenVenue} style={{ paddingVertical: SPACE.sm, alignItems: "center" }}>
          <Text style={{ color: accent.stripe, fontWeight: "800" }}>Full poster & battle →</Text>
        </TouchableOpacity>
      ) : null}
      </View>
    </View>
  );
}

function VenueFeedScreen({
  fanHandle,
  reputation,
  inviteCount,
  search,
  onSearchChange,
  district,
  onDistrictChange,
  genreFilter,
  onGenreFilterChange,
  statusFilter,
  onStatusFilterChange,
  allVenues,
  venues,
  venueBackings,
  onOpenVenue,
  onOpenArtist,
  onBackArtist,
  onInvite,
  onApply,
}: {
  fanHandle: string;
  reputation: number;
  inviteCount: number;
  search: string;
  onSearchChange: (t: string) => void;
  district: DistrictFilter;
  onDistrictChange: (d: DistrictFilter) => void;
  genreFilter: GenreFilter;
  onGenreFilterChange: (g: GenreFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  allVenues: VenueCompetition[];
  venues: VenueCompetition[];
  venueBackings: Record<string, string>;
  onOpenVenue: (v: VenueCompetition) => void;
  onOpenArtist: (v: VenueCompetition, a: CompetingArtist) => void;
  onBackArtist: (v: VenueCompetition, a: CompetingArtist) => void;
  onInvite: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <LandingHero />

      <FanIdentityBar handle={fanHandle} reputation={reputation} invites={inviteCount} onInvite={onInvite} onApply={onApply} />

      <View style={{ backgroundColor: "#0c121f", borderRadius: 14, paddingHorizontal: SPACE.md, paddingVertical: 16, marginBottom: SPACE.lg, borderWidth: 1, borderColor: "#ffffff0d" }}>
        <TextInput
          placeholder="Venues, artists, districts…"
          placeholderTextColor={C.dim}
          value={search}
          onChangeText={onSearchChange}
          style={{ color: C.text, fontSize: 15, fontWeight: "500" }}
        />
      </View>

      <UnfoldableFilters
        genreFilter={genreFilter}
        onGenreFilterChange={onGenreFilterChange}
        district={district}
        onDistrictChange={onDistrictChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />

      <FeaturedGenreBattle venues={allVenues} onOpenVenue={onOpenVenue} />

      <View style={{ marginBottom: 28 }}>
        <Text style={{ color: C.dim, fontWeight: "700", fontSize: 10, letterSpacing: 2.4 }}>ACTIVE VENUE BATTLES</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 26, letterSpacing: -0.6 }}>{venues.length}</Text>
          <Text style={{ color: C.dim, fontWeight: "600", fontSize: 13 }}>open slots</Text>
        </View>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 8, fontWeight: "500" }}>One backing per venue · genre-locked lineups</Text>
      </View>

      {venues.length === 0 ? (
        <Text style={{ color: C.muted, textAlign: "center", padding: SPACE.xl }}>No slots match your filters.</Text>
      ) : (
        venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            userPickId={venueBackings[venue.id]}
            onOpenVenue={() => onOpenVenue(venue)}
            onOpenArtist={(a) => onOpenArtist(venue, a)}
            onBackArtist={(a) => onBackArtist(venue, a)}
          />
        ))
      )}
    </>
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
  onInvite: () => void;
  onApply: () => void;
}) {
  const sorted = sortedArtists(venue);
  const leader = sorted[0];
  const momentum = getVenueMomentum(venue);
  const total = totalSupporters(venue);

  return (
    <>
      <ScreenHeader title={venue.venueName} subtitle={`${venue.district} · ${venue.capacity} capacity`} onBack={onBack} eyebrow="VENUE BATTLE" />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACE.md, flexWrap: "wrap" }}>
        <GenrePill genre={venue.slotGenre} large />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACE.xs }}>
          {!venue.winnerId ? <View style={{ marginRight: SPACE.sm }}><LiveBadgeStatic /></View> : null}
          <MomentumBadge momentum={momentum} />
          <View style={{ marginLeft: SPACE.sm }}><CountdownPill venue={venue} /></View>
        </View>
      </View>

      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md }}>
        <Text style={{ color: C.dim, fontWeight: "700", fontSize: 11 }}>VENUE DETAILS</Text>
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 17, marginTop: SPACE.xs }}>{venue.address}</Text>
        <Text style={{ color: C.muted, marginTop: SPACE.sm }}>Capacity {venue.capacity} · {venue.slotGenre} battle only</Text>
        <Text style={{ color: C.muted, marginTop: SPACE.xs }}>{venue.slotLabel} · {venue.slotDate}</Text>
        {venue.slotsOpen > 0 ? (
          <Text style={{ color: C.accentSoft, marginTop: SPACE.sm, fontWeight: "800" }}>{venue.slotsOpen} artist spots still open for applications</Text>
        ) : null}
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: SPACE.md }} />
        <Text style={{ color: C.rival, fontWeight: "800", lineHeight: 22 }}>{rivalryCopy(venue)}</Text>
        <Text style={{ color: C.muted, marginTop: SPACE.sm, lineHeight: 22 }}>
          {total} backers · {venue.unlockGoal} to confirm booking. Highest-supported {venue.slotGenre} artist wins;
          their supporters receive tickets.
        </Text>
      </View>

      {!venue.winnerId ? (
        <View style={{ flexDirection: "row", marginBottom: SPACE.md }}>
          <TouchableOpacity onPress={onInvite} style={{ flex: 1, backgroundColor: C.rival + "22", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginRight: SPACE.xs, borderWidth: 1, borderColor: C.rival + "44" }}>
            <Text style={{ color: C.rival, fontWeight: "900" }}>Invite artist</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onApply} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginLeft: SPACE.xs, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.accentSoft, fontWeight: "900" }}>Apply to battle</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {venueInvites.length > 0 ? (
        <View style={{ marginBottom: SPACE.md }}>
          <SectionLabel>FAN INVITES</SectionLabel>
          {venueInvites.map((inv) => (
            <View key={inv.id} style={{ backgroundColor: C.surface, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.xs }}>
              <Text style={{ color: C.text, fontWeight: "800" }}>{inv.artistName}</Text>
              <Text style={{ color: C.muted, marginTop: 4 }}>{inv.note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {venueApplications.length > 0 ? (
        <View style={{ marginBottom: SPACE.md }}>
          <SectionLabel>APPLICATIONS</SectionLabel>
          {venueApplications.map((app) => (
            <View key={app.id} style={{ backgroundColor: C.surface, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.xs }}>
              <Text style={{ color: C.text, fontWeight: "800" }}>{app.artistName}</Text>
              <Text style={{ color: C.muted, marginTop: 4 }}>{app.pitch}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <SectionLabel>FULL LEADERBOARD</SectionLabel>
      {sorted.map((artist, i) => (
        <LeaderboardRow
          key={artist.id}
          artist={artist}
          rank={i + 1}
          maxSupporters={leader.supporters}
          isWinner={venue.winnerId === artist.id}
          isLeading={!venue.winnerId && i === 0}
          isUserPick={userPickId === artist.id}
          lockedOut={!!userPickId && userPickId !== artist.id && !venue.winnerId}
          onPress={() => onOpenArtist(artist)}
          onBack={() => onBackArtist(artist)}
        />
      ))}
    </>
  );
}

function ArtistDetailScreen({
  artist,
  venue,
  isUserPick,
  statusLabel,
  onBack,
  onBackArtist,
  onViewTicket,
}: {
  artist: CompetingArtist;
  venue: VenueCompetition;
  isUserPick: boolean;
  statusLabel: string;
  onBack: () => void;
  onBackArtist: () => void;
  onViewTicket?: () => void;
}) {
  const sorted = sortedArtists(venue);
  const rank = sorted.findIndex((a) => a.id === artist.id) + 1;
  const leader = sorted[0];
  const gap = leader.supporters - artist.supporters;
  const isWinner = venue.winnerId === artist.id;

  return (
    <>
      <ScreenHeader title={artist.name} subtitle={`${artist.genre} · ${venue.venueName}`} onBack={onBack} eyebrow={`#${rank} IN BATTLE`} />

      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.sm }}>
          <View style={{ backgroundColor: isWinner ? ROLE.fan.bg : "#2d1f4e", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: SPACE.sm, marginBottom: SPACE.xs, borderWidth: 1, borderColor: isWinner ? ROLE.fan.border : C.rival + "44" }}>
            <Text style={{ color: isWinner ? ROLE.fan.primary : C.rival, fontWeight: "900", fontSize: 11 }}>{statusLabel.toUpperCase()}</Text>
          </View>
          {isUserPick ? (
            <View style={{ backgroundColor: "#1e3a5f", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: SPACE.xs }}>
              <Text style={{ color: "#7dd3fc", fontWeight: "900", fontSize: 11 }}>YOUR PICK</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: SPACE.sm }}>
          <View>
            <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>GENRE</Text>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>{artist.genre}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>SUPPORTERS</Text>
            <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 22 }}>{artist.supporters}</Text>
          </View>
        </View>
        <View style={{ marginTop: SPACE.md }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>VENUE</Text>
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>{venue.venueName}</Text>
          <Text style={{ color: C.muted, marginTop: 4 }}>{venue.district} · {venue.slotLabel}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#2d1f4e", borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: C.rival, fontWeight: "800", flex: 1 }}>
          {rank === 1 ? "Leading the " + venue.slotGenre + " battle" : `${gap} backers behind ${leader.name}`}
        </Text>
        <GenrePill genre={venue.slotGenre} />
      </View>

      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md }}>
        <SectionLabel>THE STORY</SectionLabel>
        <Text style={{ color: "#cbd5e1", lineHeight: 26 }}>{artist.story}</Text>
      </View>

      <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.border, alignItems: "center", justifyContent: "center", marginRight: SPACE.md }}>
          <Text style={{ fontSize: 20 }}>▶</Text>
        </View>
        <View>
          <SectionLabel>LATEST TRACK</SectionLabel>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 17 }}>{artist.latestTrack.title}</Text>
          <Text style={{ color: C.muted }}>{artist.latestTrack.duration}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg }}>
        <SectionLabel>IF THEY WIN</SectionLabel>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· {venue.venueName} books {artist.name}</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· Your {BACKING_PRICE} becomes a GA ticket</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· Full refund if another artist wins</Text>
        <Text style={{ color: "#cbd5e1", lineHeight: 24 }}>· One backing per venue — {venue.slotGenre} battle only</Text>
      </View>

      {!venue.winnerId ? (
        <TouchableOpacity onPress={onBackArtist} style={{ backgroundColor: isUserPick ? C.surface : C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", borderWidth: isUserPick ? 1 : 0, borderColor: C.accent }}>
          <Text style={{ color: isUserPick ? C.accentSoft : C.ink, fontWeight: "900", fontSize: 17 }}>
            {isUserPick ? `Your pick at ${venue.venueName}` : `Back ${artist.name} · ${BACKING_PRICE}`}
          </Text>
        </TouchableOpacity>
      ) : null}
      {onViewTicket ? (
        <TouchableOpacity onPress={onViewTicket} style={{ marginTop: SPACE.sm, paddingVertical: SPACE.md, alignItems: "center" }}>
          <Text style={{ color: C.accentSoft, fontWeight: "800" }}>View entry pass (QR) →</Text>
        </TouchableOpacity>
      ) : null}
    </>
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
            {BACKING_PRICE} held until the venue battle ends. If they win, you get the ticket.
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

  return (
    <>
      <View style={{ alignItems: "center", paddingTop: SPACE.xl, marginBottom: SPACE.lg }}>
        <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>🎯</Text>
        <Text style={{ color: C.accentSoft, fontWeight: "800" }}>PICK REGISTERED</Text>
        <Text style={{ color: C.text, fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: SPACE.sm }}>
          You're backing {artist.name}
        </Text>
        <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 24, paddingHorizontal: SPACE.md }}>
          #{rank} at {venue.venueName}. Rally more backers before {formatCountdown(venue.countdown)}.
        </Text>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg }}>
        <Text style={{ color: C.rival, fontWeight: "800" }}>{rivalryCopy(venue)}</Text>
      </View>
      <TouchableOpacity onPress={onViewTickets} style={{ backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginBottom: SPACE.sm }}>
        <Text style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>Track my picks</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onFeed} style={{ paddingVertical: SPACE.md, alignItems: "center" }}>
        <Text style={{ color: C.accentSoft, fontWeight: "800" }}>Browse more venue battles</Text>
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

function TicketsScreen({
  unlocked,
  pending,
  onOpenArtistFromTicket,
  onOpenArtistFromPick,
}: {
  unlocked: Ticket[];
  pending: PendingPick[];
  onOpenArtistFromTicket: (t: Ticket) => void;
  onOpenArtistFromPick: (p: PendingPick) => void;
}) {
  return (
    <>
      <ScreenHeader title="My tickets" subtitle="Tap a ticket or active battle to view the artist." />
      <SectionLabel>WINNER TICKETS</SectionLabel>
      {unlocked.length === 0 ? (
        <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: SPACE.xl, alignItems: "center", marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border, borderStyle: "dashed" }}>
          <Text style={{ fontSize: 36, marginBottom: SPACE.md }}>🎫</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>No winner tickets yet</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>
            When your backed artist wins a venue battle, your deposit converts to a ticket here.
          </Text>
        </View>
      ) : (
        unlocked.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => onOpenArtistFromTicket(t)} activeOpacity={0.9} style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: "#22c55e44" }}>
            <Text style={{ color: C.accent, fontWeight: "800" }}>Won the slot</Text>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: "900", marginTop: SPACE.xs }}>{t.artist}</Text>
            <Text style={{ color: C.muted }}>{t.venue}</Text>
            <Text style={{ color: C.accentSoft, marginTop: SPACE.md, fontWeight: "800" }}>View artist →</Text>
          </TouchableOpacity>
        ))
      )}
      <SectionLabel>ACTIVE BATTLES</SectionLabel>
      {pending.length === 0 ? (
        <Text style={{ color: C.dim }}>No active picks. Back an artist in a venue battle.</Text>
      ) : (
        pending.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => onOpenArtistFromPick(p)} activeOpacity={0.9} style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.gold, fontWeight: "800" }}>Your pick · {p.rank}</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "900", marginTop: SPACE.xs }}>{p.artist}</Text>
            <Text style={{ color: C.muted }}>{p.venue}</Text>
            <Text style={{ color: C.rival, marginTop: SPACE.sm, fontWeight: "700" }}>{p.countdown} left</Text>
            <Text style={{ color: C.accentSoft, marginTop: SPACE.md, fontWeight: "800" }}>View artist →</Text>
          </TouchableOpacity>
        ))
      )}
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
}: {
  venues: VenueCompetition[];
  preselectedVenue: VenueCompetition | null;
  onBack: () => void;
  onSubmit: (invite: FanInvite) => void;
}) {
  const [venueId, setVenueId] = useState(preselectedVenue?.id ?? venues[0]?.id ?? "");
  const [artistName, setArtistName] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const venue = venues.find((v) => v.id === venueId) ?? preselectedVenue;

  if (done && venue) {
    return (
      <>
        <ScreenHeader title="Invite sent" subtitle={`${artistName} has been nominated for ${venue.venueName}.`} onBack={onBack} eyebrow="SCENE BUILDER" />
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.xl, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>📣</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>You put them on the radar</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>+15 reputation · Artists can accept and enter the {venue.slotGenre} battle</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Invite an artist" subtitle="Bring someone you believe in. They must match the venue's genre slot." onBack={onBack} eyebrow="FAN ONBOARDING" />
      <SectionLabel>SELECT VENUE BATTLE</SectionLabel>
      {venues.filter((v) => !v.winnerId).map((v) => (
        <TouchableOpacity key={v.id} onPress={() => setVenueId(v.id)} style={{ backgroundColor: venueId === v.id ? "#2d1f4e" : C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.sm, borderWidth: 1, borderColor: venueId === v.id ? C.rival : C.border }}>
          <Text style={{ color: C.text, fontWeight: "900" }}>{v.venueName}</Text>
          <View style={{ marginTop: SPACE.xs }}><GenrePill genre={v.slotGenre} /></View>
        </TouchableOpacity>
      ))}
      {venue ? (
        <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 22 }}>Only {venue.slotGenre} artists can join this battle.</Text>
      ) : null}
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Artist name</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
        <TextInput placeholder="Who should compete?" placeholderTextColor={C.dim} value={artistName} onChangeText={setArtistName} style={{ color: C.text, fontWeight: "600" }} />
      </View>
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Why they'll win the room</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border }}>
        <TextInput placeholder="Your pitch to the scene…" placeholderTextColor={C.dim} value={note} onChangeText={setNote} multiline style={{ color: C.text, fontWeight: "600", minHeight: 80 }} />
      </View>
      <TouchableOpacity
        onPress={() => {
          if (!venue || !artistName.trim()) return;
          onSubmit({ id: `inv-${Date.now()}`, venueId: venue.id, artistName: artistName.trim(), note: note.trim() || "Fan invite — ready to battle" });
          setDone(true);
        }}
        style={{ backgroundColor: C.rival, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}
      >
        <Text style={{ color: C.ink, fontWeight: "900" }}>Send invite</Text>
      </TouchableOpacity>
    </>
  );
}

function ApplyBattleFlow({
  venues,
  preselectedVenue,
  onBack,
  onSubmit,
  onArtistRolePending,
}: {
  venues: VenueCompetition[];
  preselectedVenue: VenueCompetition | null;
  onBack: () => void;
  onSubmit: (app: ArtistApplication) => void;
  onArtistRolePending: (stageName: string) => void;
}) {
  const openVenues = venues.filter((v) => !v.winnerId && v.slotsOpen > 0);
  const [venueId, setVenueId] = useState(preselectedVenue?.id ?? openVenues[0]?.id ?? "");
  const [artistName, setArtistName] = useState("");
  const [pitch, setPitch] = useState("");
  const [done, setDone] = useState(false);
  const venue = openVenues.find((v) => v.id === venueId) ?? preselectedVenue;

  if (done && venue) {
    return (
      <>
        <ScreenHeader title="Application in" subtitle={`${artistName} is queued for ${venue.venueName}.`} onBack={onBack} eyebrow="ARTIST ONBOARDING" />
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: SPACE.xl, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: SPACE.md }}>🎤</Text>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>You're in the queue</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: SPACE.sm, lineHeight: 22 }}>
            Venue reviews {venue.slotGenre} applications. Fans can start backing once you're approved.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Apply to battle" subtitle="Artists compete within the venue's genre only." onBack={onBack} eyebrow="ARTIST ONBOARDING" />
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
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.border }}>
        <TextInput placeholder="Stage name" placeholderTextColor={C.dim} value={artistName} onChangeText={setArtistName} style={{ color: C.text, fontWeight: "600" }} />
      </View>
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: SPACE.xs }}>Battle pitch</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border }}>
        <TextInput placeholder="Why you deserve this slot…" placeholderTextColor={C.dim} value={pitch} onChangeText={setPitch} multiline style={{ color: C.text, fontWeight: "600", minHeight: 80 }} />
      </View>
      <TouchableOpacity
        onPress={() => {
          if (!venue || !artistName.trim()) return;
          const name = artistName.trim();
          onArtistRolePending(name);
          onSubmit({ id: `app-${Date.now()}`, venueId: venue.id, artistName: name, pitch: pitch.trim() || `${name} — ${venue.slotGenre} ready` });
          setDone(true);
        }}
        style={{ backgroundColor: ROLE.artist.primary, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}
      >
        <Text style={{ color: C.ink, fontWeight: "900" }}>Submit application</Text>
      </TouchableOpacity>
    </>
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
  onOpenAdmin,
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
  onOpenAdmin: () => void;
  isCurator: boolean;
}) {
  const level = getFanLevel(reputation);
  const nextLevel = FAN_LEVELS.find((l) => l.min > reputation);
  const repToNext = nextLevel ? nextLevel.min - reputation : 0;
  const isArtistApproved = artistRoleStatus === "approved";
  const activeRole = profileMode === "artist" && isArtistApproved ? ROLE.artist : ROLE.fan;

  const fanStats = [
    { label: "Venue picks", value: String(picksCount) },
    { label: "Invites sent", value: String(invites) },
    { label: "Reputation", value: String(reputation) },
    { label: "Battles joined", value: String(battleApplications) },
  ];

  const artistStats = [
    { label: "Battles applied", value: String(battleApplications) },
    { label: "Backers received", value: isArtistApproved ? "127" : "—" },
    { label: "Slots won", value: isArtistApproved ? "1" : "0" },
    { label: "Active campaigns", value: isArtistApproved ? "2" : "0" },
  ];

  return (
    <>
      <ScreenHeader
        title="Your profile"
        subtitle={profileMode === "artist" ? "Artist identity · compete for venue slots" : "Fan identity · shape the Seoul live scene"}
        eyebrow={activeRole.label.toUpperCase()}
      />

      <RoleSwitcher mode={profileMode} canUseArtist={isArtistApproved} onChange={onProfileModeChange} />

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
          <Text style={{ color: activeRole.soft, fontSize: 11, fontWeight: "700", marginRight: SPACE.sm }}>
            {profileMode === "artist" ? "ARTIST PROFILE" : "FAN PROFILE"}
          </Text>
          {profileMode === "fan" ? <FanLevelBadge reputation={reputation} /> : null}
          {isArtistApproved && profileMode === "artist" ? <ArtistVerifiedBadge /> : null}
        </View>
        <Text style={{ color: C.text, fontSize: 26, fontWeight: "900" }}>@{handle}</Text>
        {profileMode === "artist" && artistStageName ? (
          <Text style={{ color: ROLE.artist.soft, fontWeight: "800", fontSize: 18, marginTop: SPACE.xs }}>{artistStageName}</Text>
        ) : (
          <Text style={{ color: level.color, fontWeight: "900", fontSize: 18, marginTop: SPACE.xs }}>{level.title}</Text>
        )}
        {profileMode === "fan" && nextLevel ? (
          <View style={{ marginTop: SPACE.md }}>
            <Text style={{ color: C.dim, fontSize: 12, marginBottom: SPACE.xs }}>{repToNext} rep to {nextLevel.title}</Text>
            <View style={{ height: 6, backgroundColor: C.border, borderRadius: 999, overflow: "hidden" }}>
              <View style={{ width: `${Math.min((reputation / nextLevel.min) * 100, 100)}%`, height: "100%", backgroundColor: ROLE.fan.primary }} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700" }}>ARTIST VERIFICATION</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACE.sm }}>
          <Text style={{ color: artistStatusColor(artistRoleStatus), fontWeight: "900", fontSize: 16 }}>
            {artistStatusLabel(artistRoleStatus)}
          </Text>
          {artistRoleStatus === "approved" ? <ArtistVerifiedBadge /> : null}
        </View>
        {artistRoleStatus === "not_applied" ? (
          <TouchableOpacity
            onPress={onApplyForArtist}
            style={{ marginTop: SPACE.md, backgroundColor: ROLE.artist.bg, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: ROLE.artist.border }}
          >
            <Text style={{ color: ROLE.artist.primary, fontWeight: "900" }}>Apply for Artist role</Text>
          </TouchableOpacity>
        ) : null}
        {artistRoleStatus === "pending" ? (
          <Text style={{ color: C.muted, marginTop: SPACE.sm, lineHeight: 22 }}>
            Curators are reviewing your application. Once approved, you can switch to Artist mode.
          </Text>
        ) : null}
        {artistRoleStatus === "approved" ? (
          <Text style={{ color: ROLE.artist.soft, marginTop: SPACE.sm, lineHeight: 22 }}>
            You're verified. Switch to Artist mode to manage battles and track backer momentum.
          </Text>
        ) : null}
      </View>

      <SectionLabel>{profileMode === "artist" ? "ARTIST STATS" : "FAN STATS"}</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.lg }}>
        {(profileMode === "artist" ? artistStats : fanStats).map((s) => (
          <View
            key={s.label}
            style={{
              width: "48%",
              backgroundColor: profileMode === "artist" ? ROLE.artist.bg + "99" : ROLE.fan.bg + "99",
              borderRadius: 18,
              padding: SPACE.md,
              marginBottom: SPACE.sm,
              marginRight: "2%",
              borderWidth: 1,
              borderColor: profileMode === "artist" ? ROLE.artist.border : ROLE.fan.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>{s.value}</Text>
            <Text style={{ color: C.dim, fontSize: 11, fontWeight: "700", marginTop: SPACE.xs }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>ROLES YOU HOLD</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.lg }}>
        <View style={{ backgroundColor: ROLE.fan.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: SPACE.sm, marginBottom: SPACE.sm, borderWidth: 1, borderColor: ROLE.fan.border }}>
          <Text style={{ color: ROLE.fan.primary, fontWeight: "900", fontSize: 12 }}>Fan · Active</Text>
        </View>
        {isArtistApproved ? (
          <View style={{ backgroundColor: ROLE.artist.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: SPACE.sm, borderWidth: 1, borderColor: ROLE.artist.border }}>
            <Text style={{ color: ROLE.artist.primary, fontWeight: "900", fontSize: 12 }}>Artist · Verified</Text>
          </View>
        ) : null}
        {isCurator ? (
          <View style={{ backgroundColor: ROLE.curator.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: SPACE.sm, borderWidth: 1, borderColor: ROLE.curator.border }}>
            <Text style={{ color: ROLE.curator.primary, fontWeight: "900", fontSize: 12 }}>Curator</Text>
          </View>
        ) : null}
      </View>

      <SectionLabel>BADGES</SectionLabel>
      {PROFILE_BADGES.map((b) => (
        <View key={b.label} style={{ backgroundColor: C.card, borderRadius: 22, padding: SPACE.md, marginBottom: SPACE.sm, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: ROLE.fan.bg, alignItems: "center", justifyContent: "center", marginRight: SPACE.md, borderWidth: 1, borderColor: ROLE.fan.border }}>
            <Text style={{ color: ROLE.fan.primary, fontWeight: "900" }}>★</Text>
          </View>
          <View>
            <Text style={{ color: C.text, fontWeight: "900" }}>{b.label}</Text>
            <Text style={{ color: C.muted, marginTop: 4 }}>{b.detail}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={onOpenAdmin} style={{ marginTop: SPACE.md, backgroundColor: ROLE.venue.bg, borderRadius: 20, padding: SPACE.md, borderWidth: 1, borderColor: ROLE.venue.border, marginBottom: SPACE.sm }}>
        <Text style={{ color: ROLE.venue.primary, fontWeight: "800", textAlign: "center" }}>Venue admin · Open new slot</Text>
      </TouchableOpacity>
      {isCurator ? (
        <TouchableOpacity onPress={onOpenAdmin} style={{ backgroundColor: ROLE.curator.bg, borderRadius: 20, padding: SPACE.md, borderWidth: 1, borderColor: ROLE.curator.border }}>
          <Text style={{ color: ROLE.curator.primary, fontWeight: "800", textAlign: "center" }}>Curator tools · Review artists</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function AdminScreen({
  onBack,
  onPublish,
  artistRoleStatus,
  pendingHandle,
  onApproveArtist,
}: {
  onBack: () => void;
  onPublish: () => void;
  artistRoleStatus: ArtistApprovalStatus;
  pendingHandle: string;
  onApproveArtist: () => void;
}) {
  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState("300");
  const [slotGenre, setSlotGenre] = useState<SlotGenre>("Indie");

  return (
    <>
      <ScreenHeader title="Curator & venue tools" subtitle="Manage slots and approve artist identities." onBack={onBack} eyebrow="CURATOR" />

      <View style={{ backgroundColor: ROLE.curator.bg, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: ROLE.curator.border }}>
        <Text style={{ color: ROLE.curator.soft, fontSize: 11, fontWeight: "700" }}>ARTIST APPROVAL</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 17, marginTop: SPACE.xs }}>@{pendingHandle}</Text>
        <Text style={{ color: artistStatusColor(artistRoleStatus), fontWeight: "800", marginTop: SPACE.xs }}>
          Status: {artistStatusLabel(artistRoleStatus)}
        </Text>
        {artistRoleStatus === "pending" ? (
          <TouchableOpacity
            onPress={onApproveArtist}
            style={{ marginTop: SPACE.md, backgroundColor: ROLE.artist.bg, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: ROLE.artist.border }}
          >
            <Text style={{ color: ROLE.artist.primary, fontWeight: "900" }}>Approve as Artist</Text>
          </TouchableOpacity>
        ) : artistRoleStatus === "approved" ? (
          <Text style={{ color: ROLE.artist.soft, marginTop: SPACE.sm }}>Artist role granted · user can switch modes</Text>
        ) : (
          <Text style={{ color: C.muted, marginTop: SPACE.sm }}>No pending artist application</Text>
        )}
      </View>

      <SectionLabel>OPEN VENUE SLOT · {ROLE.venue.label.toUpperCase()}</SectionLabel>
      <Text style={{ color: C.muted, marginBottom: SPACE.md, lineHeight: 22 }}>Publish a genre-specific gig slot for artists to battle over.</Text>
      <SectionLabel>SLOT GENRE</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACE.md }}>
        {(["Indie", "Electronic", "Hip-hop", "Jazz"] as SlotGenre[]).map((g) => (
          <TouchableOpacity key={g} onPress={() => setSlotGenre(g)} style={{ backgroundColor: slotGenre === g ? ROLE.venue.primary : C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: SPACE.xs, marginBottom: SPACE.xs }}>
            <Text style={{ color: slotGenre === g ? C.ink : C.muted, fontWeight: "800" }}>{g}</Text>
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
      <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: SPACE.md, marginBottom: SPACE.lg }}>
        <GenrePill genre={slotGenre} large />
        <Text style={{ color: C.muted, lineHeight: 22, marginTop: SPACE.sm }}>Only {slotGenre} artists can apply or be invited. Fans back one pick; highest support wins the booking.</Text>
      </View>
      <TouchableOpacity onPress={onPublish} style={{ backgroundColor: ROLE.venue.primary, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}>
        <Text style={{ color: C.ink, fontWeight: "900" }}>Publish open slot</Text>
      </TouchableOpacity>
    </>
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

const DEMO_TICKET: Ticket = {
  id: "kontra-velvet",
  artist: "KONTRA",
  artistId: "kontra",
  venue: "Velvet Hall",
  venueId: "velvet",
  date: "Thu, Jun 12 · 9:00 PM",
  seat: "GA · Fanstage winner pick",
  code: "FS-KONTRA-VELVET-2026",
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueCompetition | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<CompetingArtist | null>(null);
  const [backingStep, setBackingStep] = useState<BackingStep>("review");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState<DistrictFilter>("All");
  const [genreFilter, setGenreFilter] = useState<GenreFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [venueBackings, setVenueBackings] = useState<Record<string, string>>({});
  const [userPending, setUserPending] = useState<PendingPick[]>([]);
  const [showDemoTicket, setShowDemoTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reputation, setReputation] = useState(185);
  const [fanInvites, setFanInvites] = useState<FanInvite[]>([]);
  const [artistApplications, setArtistApplications] = useState<ArtistApplication[]>([]);
  const [profileMode, setProfileMode] = useState<ProfileMode>("fan");
  const [artistRoleStatus, setArtistRoleStatus] = useState<ArtistApprovalStatus>("not_applied");
  const [artistStageName, setArtistStageName] = useState("");
  const [artistDetailReturn, setArtistDetailReturn] = useState<ArtistDetailReturn>(null);
  const fanHandle = "mike_seoul";
  const isCurator = true;

  const catalogVenues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VENUE_COMPETITIONS.filter((v) => {
      const matchDistrict = district === "All" || v.district === district;
      const matchGenre = genreFilter === "All" || v.slotGenre === genreFilter;
      const matchSearch =
        !q ||
        v.venueName.toLowerCase().includes(q) ||
        v.district.toLowerCase().includes(q) ||
        v.slotGenre.toLowerCase().includes(q) ||
        v.artists.some((a) => a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q));
      return matchDistrict && matchGenre && matchSearch;
    });
  }, [search, district, genreFilter]);

  const filteredVenues = useMemo(() => {
    if (statusFilter === "All") return catalogVenues;
    return catalogVenues.filter((v) => getVenueMomentum(v) === statusFilter);
  }, [catalogVenues, statusFilter]);

  const openInvite = (venue?: VenueCompetition) => {
    if (venue) setSelectedVenue(venue);
    setOverlay("inviteArtist");
  };

  const openApply = (venue?: VenueCompetition) => {
    if (venue) setSelectedVenue(venue);
    setOverlay("applyBattle");
  };

  const unlockedTickets = showDemoTicket ? [DEMO_TICKET] : [];

  const openVenue = (v: VenueCompetition) => {
    setSelectedVenue(v);
    setOverlay("venueDetail");
  };

  const openArtist = (v: VenueCompetition, a: CompetingArtist, returnTo: ArtistDetailReturn = "discover") => {
    setSelectedVenue(v);
    setSelectedArtist(a);
    setArtistDetailReturn(returnTo);
    setOverlay("artistDetail");
  };

  const openArtistFromTicket = (ticket: Ticket) => {
    const ctx = resolveArtist({
      venueId: ticket.venueId,
      artistId: ticket.artistId,
      artistName: ticket.artist,
      venueName: ticket.venue,
    });
    if (ctx) openArtist(ctx.venue, ctx.artist, "tickets");
  };

  const openArtistFromPick = (pick: PendingPick) => {
    const ctx = resolveArtist({ venueId: pick.venueId, artistId: pick.artistId, artistName: pick.artist, venueName: pick.venue });
    if (ctx) openArtist(ctx.venue, ctx.artist, "tickets");
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

  const tryBackArtist = (v: VenueCompetition, a: CompetingArtist) => {
    if (v.winnerId) return;
    const existing = venueBackings[v.id];
    if (existing && existing !== a.id) return;
    setSelectedVenue(v);
    setSelectedArtist(a);
    setBackingStep("review");
    setOverlay("backingFlow");
  };

  const completeBacking = () => {
    if (!selectedVenue || !selectedArtist) return;
    setVenueBackings((prev) => ({ ...prev, [selectedVenue.id]: selectedArtist.id }));
    const sorted = sortedArtists(selectedVenue);
    const rank = sorted.findIndex((x) => x.id === selectedArtist.id) + 1;
    setUserPending((prev) => {
      if (prev.some((p) => p.venueId === selectedVenue.id)) return prev;
      return [
        ...prev,
        {
          id: `${selectedVenue.id}-${selectedArtist.id}`,
          venueId: selectedVenue.id,
          artistId: selectedArtist.id,
          artist: selectedArtist.name,
          venue: selectedVenue.venueName,
          countdown: formatCountdown(selectedVenue.countdown),
          rank: `#${rank} of ${sorted.length}`,
        },
      ];
    });
    setOverlay("backingConfirmation");
    setReputation((r) => r + 25);
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

  const renderContent = () => {
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
          venues={filteredVenues.length ? filteredVenues : VENUE_COMPETITIONS}
          preselectedVenue={selectedVenue}
          onBack={closeOverlay}
          onSubmit={(inv) => {
            setFanInvites((prev) => [...prev, inv]);
            setReputation((r) => r + 15);
          }}
        />
      );
    }
    if (overlay === "applyBattle") {
      return (
        <ApplyBattleFlow
          venues={VENUE_COMPETITIONS}
          preselectedVenue={selectedVenue}
          onBack={closeOverlay}
          onSubmit={(app) => {
            setArtistApplications((prev) => [...prev, app]);
            setReputation((r) => r + 10);
          }}
          onArtistRolePending={(name) => {
            if (artistRoleStatus === "not_applied") {
              setArtistRoleStatus("pending");
              setArtistStageName(name);
            }
          }}
        />
      );
    }
    if (overlay === "admin") {
      return (
        <AdminScreen
          onBack={closeOverlay}
          onPublish={() => { closeOverlay(); setActiveTab("discover"); }}
          artistRoleStatus={artistRoleStatus}
          pendingHandle={fanHandle}
          onApproveArtist={() => {
            setArtistRoleStatus("approved");
            if (!artistStageName) setArtistStageName("Mike Seoul");
          }}
        />
      );
    }
    if (overlay === "backingConfirmation" && selectedVenue && selectedArtist) {
      return (
        <BackingConfirmationScreen
          artist={selectedArtist}
          venue={selectedVenue}
          onViewTickets={() => { setOverlay(null); setActiveTab("tickets"); }}
          onFeed={() => { closeOverlay(); setActiveTab("discover"); }}
        />
      );
    }
    if (overlay === "backingFlow" && selectedVenue && selectedArtist) {
      return (
        <BackingFlowScreen
          artist={selectedArtist}
          venue={selectedVenue}
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
    if (overlay === "artistDetail" && selectedVenue && selectedArtist) {
      const matchedTicket = unlockedTickets.find(
        (t) =>
          (t.artistId && t.artistId === selectedArtist.id) ||
          (t.artist === selectedArtist.name && t.venue === selectedVenue.venueName)
      );
      return (
        <ArtistDetailScreen
          artist={selectedArtist}
          venue={selectedVenue}
          isUserPick={venueBackings[selectedVenue.id] === selectedArtist.id}
          statusLabel={getArtistStatusLabel(selectedVenue, selectedArtist, venueBackings[selectedVenue.id])}
          onBack={closeArtistDetail}
          onBackArtist={() => tryBackArtist(selectedVenue, selectedArtist)}
          onViewTicket={
            matchedTicket
              ? () => {
                  setSelectedTicket(matchedTicket);
                  setOverlay("ticketQr");
                }
              : undefined
          }
        />
      );
    }
    if (overlay === "venueDetail" && selectedVenue) {
      return (
        <VenueDetailScreen
          venue={selectedVenue}
          userPickId={venueBackings[selectedVenue.id]}
          venueInvites={fanInvites.filter((i) => i.venueId === selectedVenue.id)}
          venueApplications={artistApplications.filter((a) => a.venueId === selectedVenue.id)}
          onBack={closeOverlay}
          onOpenArtist={(a) => openArtist(selectedVenue, a, "venueDetail")}
          onBackArtist={(a) => tryBackArtist(selectedVenue, a)}
          onInvite={() => openInvite(selectedVenue)}
          onApply={() => openApply(selectedVenue)}
        />
      );
    }

    switch (activeTab) {
      case "tickets":
        return (
          <>
            <TicketsScreen
              unlocked={unlockedTickets}
              pending={userPending}
              onOpenArtistFromTicket={openArtistFromTicket}
              onOpenArtistFromPick={openArtistFromPick}
            />
            {!showDemoTicket && overlay === null ? (
              <TouchableOpacity onPress={() => setShowDemoTicket(true)} style={{ alignItems: "center", padding: SPACE.md }}>
                <Text style={{ color: C.dim, fontSize: 12, fontWeight: "700" }}>Demo: load KONTRA winner ticket</Text>
              </TouchableOpacity>
            ) : null}
          </>
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
              setArtistRoleStatus("pending");
              if (!artistStageName) setArtistStageName("Mike Seoul");
            }}
            onOpenAdmin={() => setOverlay("admin")}
            isCurator={isCurator}
          />
        );
      default:
        return (
          <VenueFeedScreen
            fanHandle={fanHandle}
            reputation={reputation}
            inviteCount={fanInvites.length}
            search={search}
            onSearchChange={setSearch}
            district={district}
            onDistrictChange={setDistrict}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            allVenues={catalogVenues}
            venues={filteredVenues}
            venueBackings={venueBackings}
            onOpenVenue={openVenue}
            onOpenArtist={(v, a) => openArtist(v, a, "discover")}
            onBackArtist={tryBackArtist}
            onInvite={() => openInvite()}
            onApply={() => openApply()}
          />
        );
    }
  };

  const hideNav =
    overlay === "backingFlow" ||
    overlay === "backingConfirmation" ||
    overlay === "inviteArtist" ||
    overlay === "applyBattle" ||
    overlay === "admin" ||
    overlay === "ticketQr";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} visible={!hideNav} />
    </SafeAreaView>
  );
}
