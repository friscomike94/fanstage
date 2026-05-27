import type { ImageSourcePropType } from "react-native";

/** Static campaign poster assets — require() paths must stay literal for Metro. */
export const ONECORE_ARTIST_IMAGE_ASSETS = {
  "kimoki-placeholder": require("../assets/artists/kimoki-placeholder.jpg"),
  "moonmihyang-placeholder": require("../assets/artists/moonmihyang-placeholder.jpg"),
  "moonmihyang-ticket-placeholder": require("../assets/artists/moonmihyang-ticket-placeholder.jpg"),
} as const;

export type OnecoreArtistImageKey = keyof typeof ONECORE_ARTIST_IMAGE_ASSETS;

export type ArtistCampaignImage = {
  /** Asset filename key under assets/artists */
  assetKey: OnecoreArtistImageKey;
  alt: string;
  /** Vertical crop bias 0 (top) – 1 (bottom), default center */
  cropFocusY?: number;
};

export function resolveCampaignImageSource(meta?: ArtistCampaignImage): ImageSourcePropType | undefined {
  if (!meta?.assetKey) return undefined;
  return ONECORE_ARTIST_IMAGE_ASSETS[meta.assetKey];
}

/** Per-race demo mapping when race.campaignImage is unset */
export function defaultCampaignImageForRace(raceId: string, artistId: string): ArtistCampaignImage | undefined {
  if (raceId === "race-kimogi-jazz-ff") {
    return {
      assetKey: "kimoki-placeholder",
      alt: "김오기 재즈 라이브 캠페인 포스터",
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

export function resolveRaceCampaignImage(
  race: { id: string; artistId: string; campaignImage?: ArtistCampaignImage },
  artist?: { campaignImage?: ArtistCampaignImage }
): ArtistCampaignImage | undefined {
  return race.campaignImage ?? artist?.campaignImage ?? defaultCampaignImageForRace(race.id, race.artistId);
}
