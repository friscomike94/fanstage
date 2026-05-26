/** ONECORE MVP domain models */

export type RaceStatus =
  | "draft"
  | "active"
  | "target_reached"
  | "admin_review"
  | "show_preparation"
  | "artist_confirmed"
  | "venue_confirmed"
  | "date_confirmed"
  | "ticketing_ready"
  | "failed"
  | "cancelled"
  | "refunded";

export type ConfirmationStatus = "pending" | "confirmed" | "unavailable" | "failed";

export type ShowPreparationStatus = "not_started" | "in_progress" | "blocked" | "complete";

export type PaymentType = "deposit" | "full";

export type PaymentIntentStatus = "pending" | "held" | "captured" | "refunded";

export type FailureKind =
  | "target_not_met"
  | "artist_unavailable"
  | "venue_unavailable"
  | "schedule_failed"
  | "other";

export type Artist = {
  id: string;
  name: string;
  genre: string;
  bio: string;
  tagline: string;
};

export type VenueCandidate = {
  id: string;
  name: string;
  district: string;
  capacity: number;
  note?: string;
};

export type User = {
  id: string;
  handle: string;
  displayName: string;
};

export type RefundPolicy = {
  id: string;
  title: string;
  summary: string;
  rules: string[];
};

export type PaymentIntent = {
  id: string;
  raceId: string;
  userId: string;
  amount: number;
  currency: "KRW";
  status: PaymentIntentStatus;
  createdAt: string;
};

export type CoreCommitment = {
  id: string;
  raceId: string;
  userId: string;
  amount: number;
  createdAt: string;
  /** 공개 founding fan 목록에 표시할지 */
  displayConsent: boolean;
  /** displayConsent && !isAnonymous 일 때만 사용 */
  displayName?: string;
  isAnonymous: boolean;
};

export type RaceEventLog = {
  id: string;
  raceId: string;
  changedBy: string;
  fromStatus: RaceStatus;
  toStatus: RaceStatus;
  reason: string;
  timestamp: string;
  visibleToPublic: boolean;
};

export type Race = {
  id: string;
  title: string;
  artistId: string;
  /** 팬이 이 공연 제안의 이유를 이해하게 하는 설명 */
  proposalReason: string;
  targetCount: number;
  currentCount: number;
  deadline: string;
  deadlineCountdown: { days: number; hours: number; minutes: number };
  status: RaceStatus;
  paymentType: PaymentType;
  depositAmount: number;
  refundPolicyId: string;
  preferredDate: string;
  backupDates: string[];
  venueCandidateIds: string[];
  artistConfirmationStatus: ConfirmationStatus;
  venueConfirmationStatus: ConfirmationStatus;
  showPreparationStatus: ShowPreparationStatus;
  failureKind?: FailureKind;
  failureMessage?: string;
};

export type RaceDraft = Pick<
  Race,
  | "title"
  | "artistId"
  | "proposalReason"
  | "targetCount"
  | "deadline"
  | "paymentType"
  | "depositAmount"
  | "refundPolicyId"
  | "preferredDate"
  | "backupDates"
  | "venueCandidateIds"
>;

export type CoreCommitInput = {
  displayConsent: boolean;
  isAnonymous: boolean;
  displayName?: string;
};

export type OnecoreState = {
  artists: Artist[];
  races: Race[];
  venueCandidates: VenueCandidate[];
  users: User[];
  refundPolicies: RefundPolicy[];
  commitments: CoreCommitment[];
  paymentIntents: PaymentIntent[];
  eventLogs: RaceEventLog[];
};
