export class PlayerWorkflowError extends Error {}

export function requiredText(value: unknown, label: string, max = 128): string {
  if (typeof value !== "string") throw new PlayerWorkflowError(`${label} is required.`);
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new PlayerWorkflowError(`${label} must contain 1–${max} characters without control characters.`);
  }
  return text;
}

export function validatePlayer(input: { playerId: unknown; name: unknown }) {
  const playerId = requiredText(input.playerId, "Game Player ID");
  if (/\s/u.test(playerId)) throw new PlayerWorkflowError("Game Player ID cannot contain whitespace.");
  return { playerId, name: requiredText(input.name, "Player name", 100) };
}
