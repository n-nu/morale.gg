import Link from "next/link";

export type PlayerDirectoryEntry = {
  playerId: string;
  name: string | null;
};

export function PlayerDirectory({ players }: { players: PlayerDirectoryEntry[] }) {
  return (
    <ul className="divide-y divide-edge border-y border-edge">
      {players.map((player) => (
        <li key={player.playerId} className="py-3">
          <Link className="font-semibold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold" href={`/players/${player.playerId}`}>
            {player.name?.trim() || player.playerId}
          </Link>
          <p className="mt-1 break-all text-sm text-muted">Game ID: {player.playerId}</p>
        </li>
      ))}
    </ul>
  );
}