// Server-only LiveKit utilities
// This file should only be imported in API routes/server components
import { AccessToken } from 'livekit-server-sdk';

// Re-export constants from shared file
export { CALL_COST_PER_MINUTE, MIN_CALL_BALANCE, calculateCallCost } from './livekit-constants';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export interface CreateTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}

/**
 * Generate a LiveKit access token for a participant to join a room
 */
export async function createLiveKitToken(options: CreateTokenOptions): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }

  const { roomName, participantIdentity, participantName } = options;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    // Token expires in 1 hour (sufficient for typical calls)
    ttl: 60 * 60,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Generate a unique room name for a call session
 */
export function generateRoomName(conversationId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `exa-call-${conversationId.substring(0, 8)}-${timestamp}-${random}`;
}
