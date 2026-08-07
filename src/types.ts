export type ForwardMode = 'copy' | 'forward';

export interface TargetDestination {
  id: string;
  name: string;
  chatId: string; // e.g. -1001234567890 or @mychannel
  isChannel: boolean;
  isActive: boolean;
  forwardMode: ForwardMode; // 'copy' sends clean post without "Forwarded from", 'forward' keeps native Telegram header
  customHeader?: string;
  customFooter?: string;
  removeLinks?: boolean;
  removeUsernames?: boolean;
  createdAt: string;
}

export interface ForwardingRule {
  id: string;
  name: string;
  isActive: boolean;
  sourceFilter: 'all' | 'whitelisted_users' | 'specific_sources';
  allowedSources?: string[]; // user IDs, usernames, or source chat IDs
  contentType: 'all' | 'text' | 'photo' | 'video' | 'document' | 'audio';
  includeKeywords: string[]; // only forward if message contains any of these
  excludeKeywords: string[]; // skip forward if message contains any of these
  replaceWords: { find: string; replaceWith: string }[];
  appendSignature?: string;
  targetIds: string[]; // empty string array means all active target destinations
  createdAt: string;
}

export interface TargetResult {
  targetId: string;
  targetName: string;
  chatId: string;
  success: boolean;
  messageId?: number;
  errorDetails?: string;
}

export interface ForwardLog {
  id: string;
  timestamp: string;
  sourceChatTitle?: string;
  sourceSenderName?: string;
  sourceSenderUsername?: string;
  sourceSenderId?: number;
  messageType: 'text' | 'photo' | 'video' | 'document' | 'audio' | 'sticker' | 'other';
  messageSnippet: string;
  originalMessageId?: number;
  targetResults: TargetResult[];
  overallStatus: 'success' | 'partial' | 'failed';
}

export interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface AppConfig {
  botToken: string;
  isPollingActive: boolean;
  isWebhookActive: boolean;
  webhookUrl: string;
  allowedAdminUsernames: string[]; // if empty, anyone who DMs the bot can trigger auto-forwarding
  requireAuth: boolean;
  autoForwardAll: boolean; // if true, all received DMs or forwards get forwarded according to rules
  defaultMode: ForwardMode;
  globalHeader?: string;
  globalFooter?: string;
  adminPassword?: string;
  isDashboardProtected?: boolean;
}

export interface SystemStatus {
  botConnected: boolean;
  botInfo?: BotInfo | null;
  pollingActive: boolean;
  webhookActive: boolean;
  totalForwardedCount: number;
  activeTargetsCount: number;
  activeRulesCount: number;
  lastActiveTime?: string;
  appUrl?: string;
}
