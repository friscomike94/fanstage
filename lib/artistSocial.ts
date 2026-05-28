/** Artist social proof + battle pitch helpers (venue battle flow). */

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "spotify"
  | "soundcloud"
  | "website"
  | "other";

export type ArtistSocialProof = {
  primaryPlatform?: SocialPlatform;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  soundcloud?: string;
  website?: string;
  other?: string;
};

export type SocialLinkItem = {
  platform: SocialPlatform;
  url: string;
  label: string;
  shortLabel: string;
  isPrimary: boolean;
};

export const BATTLE_PITCH_MIN = 20;
export const BATTLE_PITCH_TARGET_MIN = 140;
export const BATTLE_PITCH_MAX = 240;

export const SOCIAL_PLATFORM_OPTIONS: { id: SocialPlatform; labelKo: string; placeholder: string }[] = [
  { id: "instagram", labelKo: "Instagram", placeholder: "@handle 또는 instagram.com/…" },
  { id: "tiktok", labelKo: "TikTok", placeholder: "@handle 또는 tiktok.com/@…" },
  { id: "youtube", labelKo: "YouTube", placeholder: "채널 URL 또는 @handle" },
  { id: "spotify", labelKo: "Spotify", placeholder: "open.spotify.com/artist/…" },
  { id: "soundcloud", labelKo: "SoundCloud", placeholder: "soundcloud.com/…" },
  { id: "website", labelKo: "웹사이트/프레스", placeholder: "https://…" },
  { id: "other", labelKo: "기타", placeholder: "링크 또는 @handle" },
];

const PLATFORM_SHORT: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  spotify: "SP",
  soundcloud: "SC",
  website: "WEB",
  other: "LINK",
};

function trimValue(raw?: string): string | undefined {
  const v = raw?.trim();
  return v ? v : undefined;
}

function stripAt(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.includes(".com/") || value.includes(".be/");
}

function ensureHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/** Resolve a stored handle or URL into an openable https URL. Returns null if invalid. */
export function resolveSocialUrl(platform: SocialPlatform, raw?: string): string | null {
  const value = trimValue(raw);
  if (!value) return null;

  try {
    if (looksLikeUrl(value)) {
      const url = ensureHttps(value);
      // eslint-disable-next-line no-new
      new URL(url);
      return url;
    }

    const handle = stripAt(value);
    if (!handle) return null;

    switch (platform) {
      case "instagram":
        return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
      case "tiktok":
        return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
      case "youtube":
        if (handle.startsWith("UC") || handle.length > 20) {
          return `https://www.youtube.com/channel/${encodeURIComponent(handle)}`;
        }
        return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
      case "spotify":
        return `https://open.spotify.com/artist/${encodeURIComponent(handle)}`;
      case "soundcloud":
        return `https://soundcloud.com/${encodeURIComponent(handle)}`;
      case "website":
      case "other":
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function hasAnySocialProof(social?: ArtistSocialProof): boolean {
  if (!social) return false;
  return SOCIAL_PLATFORM_OPTIONS.some((p) => !!trimValue(social[p.id]));
}

export function listSocialLinks(social?: ArtistSocialProof): SocialLinkItem[] {
  if (!social) return [];
  const primary = social.primaryPlatform;
  const items: SocialLinkItem[] = [];

  for (const opt of SOCIAL_PLATFORM_OPTIONS) {
    const url = resolveSocialUrl(opt.id, social[opt.id]);
    if (!url) continue;
    items.push({
      platform: opt.id,
      url,
      label: opt.labelKo,
      shortLabel: PLATFORM_SHORT[opt.id],
      isPrimary: primary === opt.id,
    });
  }

  if (primary) {
    items.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }
  return items;
}

/** Merge proof form input into a partial social object (single primary field). */
export function socialProofFromInput(platform: SocialPlatform, value: string): ArtistSocialProof {
  const v = value.trim();
  if (!v) return {};
  return {
    primaryPlatform: platform,
    [platform]: v,
  };
}

export function formatSocialProofSummary(social?: ArtistSocialProof): string {
  const links = listSocialLinks(social);
  if (links.length === 0) return "소셜 증거 없음";
  return links.map((l) => `${l.label}: ${social?.[l.platform] ?? l.url}`).join(" · ");
}

/** Demo battle pitch + social for venue lineup artists (at least one link each). */
export const BATTLE_ARTIST_META: Record<
  string,
  { battlePitch: string; social: ArtistSocialProof }
> = {
  minu: {
    battlePitch: "마포 감성 인디 록. 다같이 부르는 후렴이 롤링홀 메인에 맞는 밤을 만듭니다.",
    social: { primaryPlatform: "instagram", instagram: "minu_seoul", spotify: "3nMinuDemo", youtube: "minulive" },
  },
  luna: {
    battlePitch: "테이프 딜레이와 지하실 찬가. 롤링홀에서 멈춘 순간을 만드는 드림팝.",
    social: { primaryPlatform: "spotify", spotify: "lunaarchive", instagram: "luna_archive" },
  },
  river: {
    battlePitch: "어쿠스틱과 관객 숨 고르기. 마포 팬이 원하는 조용한 울림.",
    social: { primaryPlatform: "soundcloud", soundcloud: "riverlight-seoul" },
  },
  neon: {
    battlePitch: "이태원 웨어하우스 베이스와 팝 훅. 모데시 레이트 슬롯에 맞는 피크타임.",
    social: { primaryPlatform: "instagram", instagram: "neonroom.kr", tiktok: "neonroom_live" },
  },
  yuna: {
    battlePitch: "K-일렉 하우스. 모데시에서 커리어 분기점이 될 수 있는 세트.",
    social: { primaryPlatform: "tiktok", tiktok: "yuna_flux", spotify: "yunaflux" },
  },
  kontra: {
    battlePitch: "성수 랩과 라이브 밴드 파워. 112명의 서포트가 만든 벨벳홀 승리.",
    social: { primaryPlatform: "youtube", youtube: "kontraseoul", instagram: "kontra_seoul" },
  },
  sable: {
    battlePitch: "사이퍼 에너지와 모스피트 훅. 벨벳홀 힙합 나이트의 열기.",
    social: { primaryPlatform: "instagram", instagram: "sablecrew" },
  },
  oki: {
    battlePitch: "즉흥 리드와 공간 장악. FF 신인 나이트에서 가장 빠르게 올라온 모던 재즈.",
    social: {
      primaryPlatform: "instagram",
      instagram: "kimoki_jazz",
      youtube: "kimokijazz",
      spotify: "kimoki",
    },
  },
  moon: {
    battlePitch: "심야 연기와 브라스 열기. FF 재즈 보컬의 중심.",
    social: { primaryPlatform: "tiktok", tiktok: "moonmihyang", instagram: "moon_vocal" },
  },
  trioA: {
    battlePitch: "날카로운 브레이크와 리듬 섹션. 홍대 재즈 팬이 주목하는 퓨전 트리오.",
    social: { primaryPlatform: "soundcloud", soundcloud: "trioa-seoul" },
  },
  bandB: {
    battlePitch: "도시 밤의 부드러운 그루브. 시티팝 재즈로 FF를 채울 후보.",
    social: { primaryPlatform: "website", website: "https://bandb.kr/press" },
  },
};

export function enrichCompetingArtist<
  T extends {
    id: string;
    name: string;
    tagline: string;
    battlePitch?: string;
    social?: ArtistSocialProof;
  },
>(artist: T): T & { battlePitch: string; social: ArtistSocialProof } {
  const meta = BATTLE_ARTIST_META[artist.id];
  const battlePitch = trimValue(artist.battlePitch) ?? meta?.battlePitch ?? artist.tagline;
  const social = artist.social ?? meta?.social ?? { instagram: artist.name.replace(/\s/g, "").toLowerCase() };
  return { ...artist, battlePitch, social };
}
