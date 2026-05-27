/** ONECORE MVP domain models */

export type RaceStatus =
  | "draft"
  | "active"
  | "target_reached"
  | "admin_review"
  | "show_preparation"
  | "artist_contacting"
  | "artist_reviewing_invite"
  | "venue_matching"
  | "confirming_terms"
  | "artist_confirmed"
  | "venue_confirmed"
  | "date_confirmed"
  | "ticketing_ready"
  | "failed"
  | "cancelled"
  | "refunded";

/** Admin-facing pipeline (maps from RaceStatus; safe to extend without breaking fans) */
export type RaceAdminPhase =
  | "collecting_demand"
  | "demand_proven"
  | "artist_contacting"
  | "artist_reviewing_invite"
  | "venue_matching"
  | "confirming_terms"
  | "ticketing_ready"
  | "refund_or_alternative_review";

export type ArtistInviteResponse = "interested" | "adjust_terms" | "not_available";

export type ScoutConfidence = "low" | "medium" | "high";

export type ScoutHandoffState = "draft" | "rally_live" | "ready_for_admin" | "handed_off";

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
  /** Rough ticket band for artist invite economics (admin/artist only) */
  estimatedTicketMin?: number;
  estimatedTicketMax?: number;
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

export type ArtistInviteSubmission = {
  response: ArtistInviteResponse;
  preferredDates: string;
  minGuarantee?: string;
  minAttendance?: string;
  productionNeeds?: string;
  venuePreferenceNotes?: string;
  preferredVenueCandidateId?: string;
  notes?: string;
  submittedAt: string;
};

export type DemandScoutCampaign = {
  id: string;
  scoutId: string;
  artistId: string;
  targetCity: string;
  whyNow: string;
  estimatedDemand: string;
  venueSuggestions: string;
  rallyCopy: string;
  scoutConfidence: ScoutConfidence;
  handoffState: ScoutHandoffState;
  raceId?: string;
  createdAt: string;
};

export type Race = {
  id: string;
  title: string;
  artistId: string;
  targetCity: string;
  adminPhase: RaceAdminPhase;
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
  /** Admin narrows to 2–3 for artist invite; fans never confirm venue */
  shortlistedVenueIds?: string[];
  fanNoteSamples?: string[];
  artistInviteToken?: string;
  artistInviteSentAt?: string;
  artistInvite?: ArtistInviteSubmission;
  artistConfirmationStatus: ConfirmationStatus;
  venueConfirmationStatus: ConfirmationStatus;
  showPreparationStatus: ShowPreparationStatus;
  artistContactChannel?: "official_email" | "instagram_dm" | "agency" | "other";
  artistContactTarget?: string;
  artistOutreachNote?: string;
  artistResponseDeadline?: string;
  assignedVenueId?: string;
  venueHoldUntil?: string;
  productionCostEstimate?: number;
  scoutFeePercent?: number;
  platformFeePercent?: number;
  minTicketPrice?: number;
  termsNote?: string;
  refundReviewDate?: string;
  failureKind?: FailureKind;
  failureMessage?: string;
};

export type RaceOperations = Pick<
  Race,
  | "artistContactChannel"
  | "artistContactTarget"
  | "artistOutreachNote"
  | "artistResponseDeadline"
  | "shortlistedVenueIds"
  | "assignedVenueId"
  | "venueHoldUntil"
  | "productionCostEstimate"
  | "scoutFeePercent"
  | "platformFeePercent"
  | "minTicketPrice"
  | "termsNote"
  | "refundReviewDate"
>;

export type RaceDraft = Pick<
  Race,
  | "title"
  | "artistId"
  | "targetCity"
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

export type ScoutCampaignDraft = Omit<DemandScoutCampaign, "id" | "createdAt" | "scoutId" | "handoffState"> & {
  handoffState?: ScoutHandoffState;
};

export type ArtistInviteDraft = Omit<ArtistInviteSubmission, "submittedAt">;

export type CoreCommitInput = {
  displayConsent: boolean;
  isAnonymous: boolean;
  displayName?: string;
};

export type OnecoreState = {
  artists: Artist[];
  races: Race[];
  venueCandidates: VenueCandidate[];
  scoutCampaigns: DemandScoutCampaign[];
  users: User[];
  refundPolicies: RefundPolicy[];
  commitments: CoreCommitment[];
  paymentIntents: PaymentIntent[];
  eventLogs: RaceEventLog[];
};
