import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

/**
 * Generate a unique room name for a video call session
 */
export function generateRoomName(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `exa-call-${timestamp}-${random}`;
}

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateToken(
  roomName: string,
  participantName: string,
  participantIdentity: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    // Token expires in 30 minutes
    ttl: "30m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Calculate coins to charge based on call duration
 */
export function calculateCallCost(
  durationSeconds: number,
  ratePerMinute: number
): number {
  if (durationSeconds <= 0 || ratePerMinute <= 0) return 0;

  // Charge for full minutes, minimum 1 minute if call started
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  return minutes * ratePerMinute;
}

/**
 * Create a LiveKit token with named parameters
 */
export async function createLiveKitToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}): Promise<string> {
  return generateToken(params.roomName, params.participantName, params.participantIdentity);
}
