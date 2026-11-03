import Link from "next/link";
import { PlayerIdentity } from "./player-identity";
import type { PlayerIdentityPresentation } from "../identity";

export type PlayerDirectoryEntry = PlayerIdentityPresentation;

export function PlayerDirectory({ players }: { players: PlayerDirectoryEntry[] }) {
  return (
    <ul className="divide-y divide-edge border-y border-edge">
      {players.map((player) => (
        <li key={player.playerId} className="py-3">
          <Link className="font-semibold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold" href={`/players/${player.playerId}`}>
            <PlayerIdentity identity={player} />
          </Link>
          <p className="mt-1 break-all font-mono text-sm text-muted">Roblox ID: {player.playerId}</p>
        </li>
      ))}
    </ul>
  );
}