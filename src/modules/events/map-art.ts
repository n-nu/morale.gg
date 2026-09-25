/**
 * Client-safe lookup from an Event's free-text map name to banner artwork
 * under `public/maps/` (in-game screenshots; provenance in
 * `public/maps/README.md`). Maps without dedicated artwork get one of the
 * generic in-game fallback banners, picked deterministically so the same
 * event always shows the same art. Presentation only — adding a map means
 * adding a file there and one entry here.
 */

export interface MapArt {
  src: string;
  alt: string;
}

const MAP_ART: Array<{ match: string; name: string; art: MapArt }> = [
  {
    match: "austerlitz",
    name: "Austerlitz",
    art: {
      src: "/maps/austerlitz.jpg",
      alt: "Church overlooking the snowy plains of the Austerlitz map",
    },
  },
  {
    match: "barraux",
    name: "Fort Barraux",
    art: {
      src: "/maps/barraux.png",
      alt: "Night view over the harbor of the Fort Barraux map",
    },
  },
  {
    match: "borodino",
    name: "Borodino",
    art: {
      src: "/maps/borodino.jpg",
      alt: "Sunrise over the village and church of the Borodino map",
    },
  },
];

const FALLBACK_ART: MapArt[] = [
  {
    src: "/maps/fallback-countryside.jpg",
    alt: "Rolling countryside battlefield",
  },
  {
    src: "/maps/fallback-winter-battle.jpg",
    alt: "Infantry advancing through a snowy field",
  },
];

/** Maps with dedicated banner artwork, for form suggestions. */
export const KNOWN_MAP_NAMES: string[] = MAP_ART.map((entry) => entry.name);

export function mapArtFor(mapName: string): MapArt | null {
  const normalized = mapName.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }
  const entry = MAP_ART.find(({ match }) => normalized.includes(match));
  return entry ? entry.art : null;
}

/**
 * Banner art for an event: the map's own artwork when we have it, otherwise
 * a deterministic pick from the generic in-game banners.
 */
export function bannerArtFor(mapName: string | null, seed: string): MapArt {
  if (mapName) {
    const art = mapArtFor(mapName);
    if (art) {
      return art;
    }
  }
  const basis = (mapName ?? "") + seed;
  let hash = 0;
  for (let i = 0; i < basis.length; i++) {
    hash = (hash + basis.charCodeAt(i)) % 997;
  }
  return FALLBACK_ART[hash % FALLBACK_ART.length];
}
