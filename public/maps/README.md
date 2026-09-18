# Event banner artwork

In-game screenshots used as Event banners, looked up by map name in
`src/modules/events/map-art.ts`. Maps without dedicated artwork get one of
the `fallback-*` banners (picked deterministically per event).

Sourced from the community-maintained Napoleonic Wars Fandom wiki
(CC-BY-SA page content; in-game imagery belongs to the game's creators):

- `austerlitz.jpg` — wiki file `Austerlitz_3` (church over the winter plains)
- `borodino.jpg` — wiki file `Borodino_1` (sunrise over the village)
- `barraux.png` — wiki page `Barraux` (night view over the harbor)
- `fallback-countryside.jpg` — wiki file `Borodino_4` (countryside panorama)
- `fallback-winter-battle.jpg` — wiki file `AusterlitzCover` (infantry in snow)

Wiki: https://napoleonic-wars-rblx.fandom.com/

Prefer replacing/extending these with the community's own in-game
screenshots. To add a map: drop the image here and add one entry in
`src/modules/events/map-art.ts`.
