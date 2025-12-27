// Video Call Session Types

export type CallStatus = 'pending' | 'active' | 'ended' | 'missed' | 'declined';

export interface VideoCallSession {
  id: string;
  conversation_id: string;
  room_name: string;
  initiated_by: string;
  recipient_id: string;
  status: CallStatus;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  coins_charged: number;
  created_at: string;
}

export interface CallSessionWithParticipants extends VideoCallSession {
  initiator?: {
    id: string;
    type: string;
    user_id: string;
  };
  recipient?: {
    id: string;
    type: string;
    user_id: string;
  };
}

// API Response Types
export interface StartCallResponse {
  sessionId: string;
  roomName: string;
  token: string;
  recipientId: string;
  requiresCoins: boolean;
}

export interface JoinCallResponse {
  sessionId: string;
  roomName: string;
  token: string;
}

export interface EndCallResponse {
  success: boolean;
  duration: number;
  coinsCharged: number;
}

// Rate limiting configuration
export const CALL_RATE_LIMITS = {
  maxCallsPerMinute: 5,
  maxPendingCalls: 3,
  callTimeoutSeconds: 60,
} as const;
