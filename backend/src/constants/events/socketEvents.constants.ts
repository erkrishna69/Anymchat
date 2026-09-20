export const SOCKET_EVENTS = {
  // Client to Server
  UPDATE_LOCATION: 'location:update',
  SEND_FEED_MESSAGE: 'feed:send',
  SEND_DIRECT_MESSAGE: 'direct:send',
  TYPING_DIRECT: 'direct:typing',
  READ_DIRECT: 'direct:read',

  // Server to Client
  FEED_MESSAGE_RECEIVED: 'feed:received',
  FEED_HISTORY: 'feed:history',
  DIRECT_MESSAGE_RECEIVED: 'direct:received',
  DIRECT_TYPING_INDICATOR: 'direct:indicator',
  NEARBY_USERS_UPDATE: 'nearby:users',
  PROXIMITY_ALERT: 'proximity:alert',
  ORBIT_USER_TIMEOUT: 'orbit:user_timeout',
  ORBIT_USER_UNTIMEOUT: 'orbit:user_untimeout',
  ERROR: 'socket:error',
} as const;
