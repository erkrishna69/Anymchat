export const PII_PATTERNS = {
  // 1. Phone Number Detection
  // Direct Indian phone number (10 digits starting with 6-9, optional +91 or 0 prefix)
  PHONE_DIRECT: /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{9}\b/,

  // Formatted Indian mobile: 98765-43210, 987 654 3210, 9876.543.210
  PHONE_FORMATTED: /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{2,4}[\s.-]\d{3,5}[\s.-]?\d{3,4}\b/,

  // 2. Complete Link & URL Detection (HTTP, HTTPS, WWW, Domains, Invites, IP addresses)
  ANY_URL: /(?:https?:\/\/|ftp:\/\/|file:\/\/|www\.)[^\s]+/i,
  DOMAIN_LINK: /(?:^|\s)[a-zA-Z0-9-]{2,63}\.(?:com|org|net|xyz|io|app|co|info|biz|tech|online|site|store|dev|club|live|ai|in)(?::\d{1,5})?(?:\/[^\s]*)?(?:$|\s|[.,!?])/i,
  INVITE_OR_LOCAL_URL: /(?:localhost(?::\d+)?|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?|\/invite\/|t\.me\/|wa\.me\/|discord\.gg\/|bit\.ly\/|cutt\.ly\/)/i,

  // 3. Instagram & Social Handle Detection
  INSTAGRAM_EXPLICIT:
    /(?:(?:my\s*)?(?:ig|insta|instagram)\s*(?:id|handle|ac|account)?\s*(?:is|hai|pe)?\s*[:=\-@\s]+([a-zA-Z0-9._]{3,30}))/i,

  INSTAGRAM_FOLLOW:
    /(?:follow\s*(?:me\s*)?(?:on|at)?\s*(?:ig|insta|instagram)\s*[:=\-@\s]+([a-zA-Z0-9._]{3,30}))/i,

  INSTAGRAM_URL: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]{3,30})/i,

  // General handle pattern: @username where length is standard handle
  HANDLE_TAG: /(?:^|\s)@([a-zA-Z0-9._]{3,30})\b/,

  // 4. Other Social Handles & Direct links
  SNAPCHAT: /(?:snapchat|snap|sc)\s*(?:id)?\s*[:=\-@\s]+([a-zA-Z0-9._]{3,30})/i,
  TELEGRAM: /(?:telegram|tg)\s*(?:id)?\s*[:=\-@\s]+([a-zA-Z0-9._]{3,30})|(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{4,})/i,
  WHATSAPP_LINK: /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)\/\d{8,}/i,

  // 5. Personal Email & UPI
  EMAIL: /\b[a-zA-Z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|icloud|protonmail|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b/i,
  UPI: /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|axl|ibl|upi|apl)\b/i,
};
