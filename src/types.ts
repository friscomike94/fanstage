import type { ArtistSocialProof } from "../lib/artistSocial";

export type ArtistApprovalStatus = "not_applied" | "pending" | "approved";

export type Tab = "discover" | "tickets" | "profile";
export type Overlay =
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
  | "artistInvite"
  | "fanRecommend";
export type BackingStep = "review" | "confirmed";
export type VenueMomentum = "Heating up" | "Almost unlocked" | "Slot won";
export type DistrictFilter = "전체" | "홍대" | "마포" | "이태원" | "성수";
export type SlotGenre = "Indie" | "Electronic" | "Hip-hop" | "Jazz";
export type GenreFilter = "All" | SlotGenre;
export type StatusFilter = "All" | VenueMomentum;

export type CompetingArtist = {
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

export type VenueCompetition = {
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

export type PendingPick = {
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

export type RefundedPick = {
  id: string;
  venueId: string;
  artistId: string;
  artist: string;
  venue: string;
  winnerName: string;
  refundedAmount: string;
};

export type TicketWalletFilter = "all" | "converting" | "ticket" | "past" | "refund";

export type ArtistDetailReturn = null | "venueDetail" | "tickets" | "discover";

export type Ticket = {
  id: string;
  artist: string;
  artistId?: string;
  venue: string;
  venueId?: string;
  date: string;
  seat: string;
  code: string;
};

export type FanInvite = { id: string; venueId: string; profileId: string; genre: SlotGenre; note: string };
export type ArtistApplication = {
  id: string;
  venueId: string;
  artistName: string;
  battlePitch: string;
  social: ArtistSocialProof;
};

export type ArtistRoleRequestStatus = "pending" | "approved" | "rejected";

export type ArtistRoleRequest = {
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

export type ApprovedArtist = {
  id: string;
  handle: string;
  stageName: string;
  slotGenre: SlotGenre;
  genre: string;
  tagline: string;
  story: string;
};

export type VenueDemandPhase = "pre_min" | "confirmed" | "near_capacity" | "sold_out" | "winner";

export type ShowPageStage = "recruiting" | "almost_there" | "confirmed" | "ticket_ready";
export type StatusTone = "green" | "pink" | "yellow" | "slate";

export type DemandSurfaceCopy = {
  status: string;
  context: string;
  evidence: string;
  current: number;
  goal: number;
  progressPct: number;
  tone: StatusTone;
};

export type ArtistApprovalFilter = "pending" | "approved" | "rejected" | "all";

export type VenuePublishDraft = {
  venueName: string;
  capacity: number;
  slotGenre: SlotGenre;
  district: DistrictFilter;
};
