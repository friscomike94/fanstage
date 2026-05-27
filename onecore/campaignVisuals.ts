import type { ImageSourcePropType } from "react-native";
import type { OnecoreCardVariant } from "./copy";

/** Real artist / campaign photos (preferred when set). */
export const CAMPAIGN_PHOTO_ASSETS = {
  "kimoki-placeholder": require("../assets/artists/kimoki-placeholder.jpg"),
  "moonmihyang-placeholder": require("../assets/artists/moonmihyang-placeholder.jpg"),
  "moonmihyang-ticket-placeholder": require("../assets/artists/moonmihyang-ticket-placeholder.jpg"),
} as const;

/** Mood / empty-state illustrations — fallback only. */
export const CAMPAIGN_ILLUSTRATION_ASSETS = {
  "onecore-guitar-placeholder": require("../assets/illustrations/onecore-guitar-placeholder.png"),
  "onecore-guitar-vertical-placeholder": require("../assets/illustrations/onecore-guitar-vertical-placeholder.png"),
  "performance-dancer-placeholder": require("../assets/illustrations/performance-dancer-placeholder.png"),
  "brand-character-placeholder": require("../assets/illustrations/brand-character-placeholder.png"),
} as const;

export type CampaignPhotoKey = keyof typeof CAMPAIGN_PHOTO_ASSETS;
export type CampaignIllustrationKey = keyof typeof CAMPAIGN_ILLUSTRATION_ASSETS;
export type CampaignVisualAssetKey = CampaignPhotoKey | CampaignIllustrationKey;

export type CampaignVisualInput = {
  assetKey: CampaignVisualAssetKey;
  alt: string;
  cropFocusY?: number;
  source?: "photo" | "illustration";
};

export type CampaignVisualMeta = CampaignVisualInput & {
  source: "photo" | "illustration";
};

export function isCampaignPhotoKey(key: string): key is CampaignPhotoKey {
  return key in CAMPAIGN_PHOTO_ASSETS;
}

export function isCampaignIllustrationKey(key: string): key is CampaignIllustrationKey {
  return key in CAMPAIGN_ILLUSTRATION_ASSETS;
}

export function resolveCampaignVisualSource(meta?: Pick<CampaignVisualMeta, "assetKey">): ImageSourcePropType | undefined {
  if (!meta?.assetKey) return undefined;
  if (isCampaignPhotoKey(meta.assetKey)) return CAMPAIGN_PHOTO_ASSETS[meta.assetKey];
  if (isCampaignIllustrationKey(meta.assetKey)) return CAMPAIGN_ILLUSTRATION_ASSETS[meta.assetKey];
  return undefined;
}

export function illustrationSource(key: CampaignIllustrationKey): ImageSourcePropType {
  return CAMPAIGN_ILLUSTRATION_ASSETS[key];
}

/** Demo photo mapping when race.campaignImage is unset. */
export function defaultCampaignPhotoForRace(raceId: string, artistId: string): Omit<CampaignVisualMeta, "source"> | undefined {
  if (raceId === "race-kimogi-jazz-ff") {
    return {
      assetKey: "kimoki-placeholder",
      alt: "김오기 · 재즈 단독 공연 제안",
      cropFocusY: 0.42,
    };
  }
  if (raceId === "race-moon-prep-demo") {
    return {
      assetKey: "moonmihyang-placeholder",
      alt: "문미향 재즈 보컬 라이브",
      cropFocusY: 0.38,
    };
  }
  if (raceId === "race-moon-ticket-open-demo") {
    return {
      assetKey: "moonmihyang-ticket-placeholder",
      alt: "문미향 홍대 FF 단독 밤 티켓 오픈",
      cropFocusY: 0.45,
    };
  }
  if (artistId === "artist-moon") {
    return { assetKey: "moonmihyang-placeholder", alt: "문미향 라이브", cropFocusY: 0.38 };
  }
  if (artistId === "artist-kimogi") {
    return { assetKey: "kimoki-placeholder", alt: "김오기 라이브", cropFocusY: 0.42 };
  }
  return undefined;
}

function genreHints(genre?: string): { isDance: boolean; isJazzLive: boolean } {
  const g = (genre ?? "").toLowerCase();
  return {
    isDance: /dance|댄스|힙|hip|urban|street|퍼포먼스|performance/.test(g),
    isJazzLive: /jazz|재즈|acoustic|어쿠|live|라이브|session|세션|folk|포크/.test(g),
  };
}

/** Illustration fallback when no artist photo is configured. */
export function resolveIllustrationForContext(opts: {
  genre?: string;
  variant?: OnecoreCardVariant;
  purpose?: "onecore" | "ticket" | "performance" | "battle" | "brand";
}): CampaignVisualMeta {
  const { isDance } = genreHints(opts.genre);

  if (opts.purpose === "brand") {
    return {
      assetKey: "brand-character-placeholder",
      alt: "fanstage 가이드",
      cropFocusY: 0.5,
      source: "illustration",
    };
  }

  if (opts.purpose === "battle" || (isDance && opts.purpose !== "onecore")) {
    return {
      assetKey: "performance-dancer-placeholder",
      alt: "라이브 퍼포먼스 일러스트",
      cropFocusY: 0.48,
      source: "illustration",
    };
  }

  if (opts.variant === "ticket" || opts.purpose === "ticket") {
    return {
      assetKey: "onecore-guitar-vertical-placeholder",
      alt: "티켓 오픈 캠페인 포스터",
      cropFocusY: 0.72,
      source: "illustration",
    };
  }

  if (isDance) {
    return {
      assetKey: "performance-dancer-placeholder",
      alt: "퍼포먼스 캠페인 일러스트",
      cropFocusY: 0.48,
      source: "illustration",
    };
  }

  return {
    assetKey: "onecore-guitar-placeholder",
    alt: "라이브 세션 캠페인 일러스트",
    cropFocusY: 0.46,
    source: "illustration",
  };
}

/**
 * Prefer artist photo when configured; otherwise genre/phase illustration; else guitar default.
 */
export function resolveRaceCampaignVisual(opts: {
  race: { id: string; artistId: string; campaignImage?: CampaignVisualInput };
  artist?: { genre?: string; campaignImage?: CampaignVisualInput };
  variant: OnecoreCardVariant;
}): CampaignVisualMeta {
  const explicit = opts.race.campaignImage ?? opts.artist?.campaignImage;
  if (explicit) {
    const source: CampaignVisualMeta["source"] =
      explicit.source ?? (isCampaignPhotoKey(explicit.assetKey) ? "photo" : "illustration");
    return { ...explicit, source };
  }

  const photo = defaultCampaignPhotoForRace(opts.race.id, opts.race.artistId);
  if (photo) return { ...photo, source: "photo" };

  return resolveIllustrationForContext({ genre: opts.artist?.genre, variant: opts.variant, purpose: "onecore" });
}
