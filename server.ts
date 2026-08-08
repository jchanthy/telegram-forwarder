import express from 'express';
import path from 'path';
import fs from 'fs';
import type {
  AppConfig,
  TargetDestination,
  ForwardingRule,
  ForwardLog,
  BotInfo,
  SystemStatus,
  TargetResult,
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistence file path
const IS_VERCEL = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_BUILDER || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
let STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists safely
if (!IS_VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    STORE_FILE = path.join('/tmp', 'store.json');
  }
}

// Initial default state
interface DataStore {
  config: AppConfig;
  targets: TargetDestination[];
  rules: ForwardingRule[];
  logs: ForwardLog[];
  totalForwardedCount: number;
}

// Parse default targets from FORWARD_TARGET_CHATS env var if provided (e.g. "@mychan1, -1001835121250:My Group")
const envTargets: TargetDestination[] = (process.env.FORWARD_TARGET_CHATS || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
  .map((item) => {
    const parts = item.split(':');
    const chatId = parts[0].trim();
    const name = parts[1]?.trim() || chatId;
    const stableId = `target-env-${chatId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return {
      id: stableId,
      name,
      chatId,
      isChannel: chatId.startsWith('@') || !chatId.startsWith('-100'),
      isActive: true,
      forwardMode: 'copy',
      createdAt: new Date().toISOString(),
    };
  });

const defaultStore: DataStore = {
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    isPollingActive: true,
    isWebhookActive: false,
    webhookUrl: '',
    allowedAdminUsernames: [],
    requireAuth: false,
    autoForwardAll: true,
    defaultMode: 'copy',
    globalHeader: '',
    globalFooter: ' forwarded via Bot',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    isDashboardProtected: !!process.env.ADMIN_PASSWORD,
    aiProvider: (process.env.AI_PROVIDER as any) || 'gemini',
    aiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
    aiModel: process.env.AI_MODEL || '',
    aiCustomEndpoint: process.env.AI_CUSTOM_ENDPOINT || '',
  },
  targets: envTargets.length > 0 ? envTargets : [
    {
      id: 'target-sample-1',
      name: 'Main Announcement Channel',
      chatId: '@sample_broadcast_channel',
      isChannel: true,
      isActive: true,
      forwardMode: 'copy',
      customFooter: '\n\n📢 Join our official channel for more updates!',
      createdAt: new Date().toISOString(),
    },
  ],
  rules: [
    {
      id: 'rule-sample-1',
      name: 'Default Auto Forward Rule',
      isActive: true,
      sourceFilter: 'all',
      contentType: 'all',
      includeKeywords: [],
      excludeKeywords: ['[spam]', '#ignore'],
      replaceWords: [],
      appendSignature: '',
      targetIds: [], // Empty means all active targets
      createdAt: new Date().toISOString(),
    },
  ],
  logs: [],
  totalForwardedCount: 0,
};

// Load or initialize store
let store: DataStore = defaultStore;

function loadStore() {
  if (IS_VERCEL) return;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);

      // Merge saved target settings with envTargets (preserving isActive toggle state)
      let loadedTargets: TargetDestination[] = parsed.targets || defaultStore.targets;
      if (envTargets.length > 0 && parsed.targets) {
        loadedTargets = defaultStore.targets.map(defaultT => {
          const matched = parsed.targets.find((pt: TargetDestination) => 
            pt.id === defaultT.id || pt.chatId.toLowerCase() === defaultT.chatId.toLowerCase()
          );
          return matched ? { ...defaultT, ...matched } : defaultT;
        });
      }

      store = {
        config: { ...defaultStore.config, ...parsed.config },
        targets: loadedTargets,
        rules: parsed.rules || defaultStore.rules,
        logs: parsed.logs || [],
        totalForwardedCount: parsed.totalForwardedCount || 0,
      };
    }
  } catch (err) {
    console.error('Failed to load store, using default:', err);
  }
}

function saveStore() {
  if (IS_VERCEL) return;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    try {
      STORE_FILE = path.join('/tmp', 'store.json');
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (tmpErr) {
      console.warn('In-memory store only (read-only filesystem):', tmpErr);
    }
  }
}

loadStore();

// Cached Telegram Bot info
let cachedBotInfo: BotInfo | null = null;
let lastBotCheckTime = 0;
let isPollingRunning = false;
let pollingOffset = 0;
let pollingTimer: NodeJS.Timeout | null = null;

// Helper: Sanitize Telegram Bot Token
function sanitizeBotToken(rawToken?: string): string {
  if (!rawToken) return '';
  let token = rawToken.trim().replace(/^["']|["']$/g, '');
  // Strip leading "bot" prefix if user accidentally included it (e.g. "bot123456:ABC..." -> "123456:ABC...")
  if (token.toLowerCase().startsWith('bot') && token.includes(':')) {
    token = token.substring(3).trim();
  }
  return token;
}

// Helper: Call Telegram API
async function callTelegramApi(method: string, body?: Record<string, unknown>, overrideToken?: string) {
  const token = sanitizeBotToken(overrideToken || store.config.botToken);
  if (!token) {
    throw new Error('Telegram Bot Token is not configured. Please enter a valid Bot Token in settings.');
  }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr: any) {
    if (networkErr.name === 'AbortError' || networkErr.name === 'TimeoutError') {
      throw new Error('Telegram API connection timed out (8s). Please check network or try again.');
    }
    throw new Error(`Failed to connect to Telegram API: ${networkErr.message || 'Network error'}`);
  }

  let text = '';
  try {
    text = await response.text();
  } catch (readErr: any) {
    throw new Error(`Failed to read response from Telegram: ${readErr.message}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (response.status === 404 || text.toLowerCase().includes('not found')) {
      throw new Error('Telegram API returned 404 Not Found. Your Bot Token is invalid or does not exist on Telegram.');
    }
    throw new Error(`Telegram API Error (HTTP ${response.status}). Ensure token format is like 123456789:ABCdef...`);
  }

  if (!data.ok) {
    if (data.error_code === 404 || data.description?.toLowerCase().includes('not found')) {
      throw new Error('Telegram Bot Token is invalid or not found on Telegram. Please check the token copied from @BotFather.');
    }
    if (data.error_code === 401 || data.description?.toLowerCase().includes('unauthorized')) {
      throw new Error('Telegram Bot Token is unauthorized. Please verify or regenerate your token with @BotFather.');
    }
    throw new Error(data.description || `Telegram API Error (${data.error_code || 'Unknown'})`);
  }

  return data.result;
}

// Fetch bot profile details
async function fetchBotInfo(token?: string): Promise<BotInfo | null> {
  try {
    const res = await callTelegramApi('getMe', undefined, token);
    cachedBotInfo = res as BotInfo;
    lastBotCheckTime = Date.now();
    return cachedBotInfo;
  } catch (err: any) {
    console.error('Failed to fetch bot info:', err.message);
    cachedBotInfo = null;
    return null;
  }
}

// Process incoming Telegram update
async function processIncomingUpdate(update: any) {
  const message = update.message || update.channel_post;
  if (!message) return;

  const chatId = message.chat?.id;
  const fromUser = message.from;
  const username = fromUser?.username ? `@${fromUser.username}` : undefined;
  const senderName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || fromUser?.username || 'Unknown Sender';
  const sourceTitle = message.chat?.title || message.forward_from_chat?.title || senderName;

  // Skip if message comes from any of our own target channels to prevent loops & echo forwards
  const strChatId = String(chatId);
  const isSelfTarget = store.targets.some(t => {
    const cleanTargetId = t.chatId.trim();
    if (cleanTargetId === strChatId) return true;
    if (message.chat?.username && `@${message.chat.username}`.toLowerCase() === cleanTargetId.toLowerCase()) return true;
    return false;
  });

  if (isSelfTarget) {
    return; // Don't forward messages that the bot or channel members post inside target destination channels
  }

  // Verify auth if required
  if (store.config.requireAuth && store.config.allowedAdminUsernames.length > 0) {
    const isAllowed = username && store.config.allowedAdminUsernames.some(u => 
      u.toLowerCase() === username.toLowerCase() || u.toLowerCase() === username.replace('@', '').toLowerCase()
    );
    if (!isAllowed) {
      console.log(`Skipping update from unauthorized user ${username}`);
      return;
    }
  }

  // Determine message type & text snippet
  let messageType: ForwardLog['messageType'] = 'text';
  let rawText = message.text || message.caption || '';

  if (message.photo) messageType = 'photo';
  else if (message.video) messageType = 'video';
  else if (message.document) messageType = 'document';
  else if (message.audio) messageType = 'audio';
  else if (message.sticker) messageType = 'sticker';
  else if (!message.text) messageType = 'other';

  const snippet = rawText ? rawText.substring(0, 100) : `[${messageType.toUpperCase()} message]`;

  // Filter active targets and applicable rules
  const activeTargets = store.targets.filter(t => t.isActive);
  if (activeTargets.length === 0) {
    const logEntry: ForwardLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      sourceChatTitle: sourceTitle,
      sourceSenderName: senderName,
      sourceSenderUsername: username,
      sourceSenderId: fromUser?.id,
      messageType,
      messageSnippet: snippet,
      originalMessageId: message.message_id,
      targetResults: [],
      overallStatus: 'failed',
    };
    store.logs.unshift(logEntry);
    if (store.logs.length > 200) store.logs.pop();
    saveStore();
    return;
  }

  // Active rules evaluation & target resolution
  const activeRules = store.rules.filter(r => r.isActive);
  let shouldForward = true;
  let textTransform = rawText;
  let ruleAppendSignature = '';
  let specificTargetIds: string[] | null = null;

  for (const rule of activeRules) {
    // Content type check
    if (rule.contentType !== 'all' && rule.contentType !== messageType) {
      continue;
    }

    // Include keywords check
    if (rule.includeKeywords && rule.includeKeywords.length > 0) {
      const match = rule.includeKeywords.some(kw => rawText.toLowerCase().includes(kw.toLowerCase()));
      if (!match) {
        shouldForward = false;
        break;
      }
    }

    // Exclude keywords check
    if (rule.excludeKeywords && rule.excludeKeywords.length > 0) {
      const match = rule.excludeKeywords.some(kw => rawText.toLowerCase().includes(kw.toLowerCase()));
      if (match) {
        shouldForward = false;
        break;
      }
    }

    // Word replacements
    if (rule.replaceWords && rule.replaceWords.length > 0) {
      for (const rw of rule.replaceWords) {
        if (rw.find) {
          const regex = new RegExp(rw.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          textTransform = textTransform.replace(regex, rw.replaceWith || '');
        }
      }
    }

    if (rule.appendSignature) {
      ruleAppendSignature += '\n' + rule.appendSignature;
    }

    if (rule.targetIds && rule.targetIds.length > 0) {
      if (!specificTargetIds) specificTargetIds = [];
      specificTargetIds.push(...rule.targetIds);
    }
  }

  if (!shouldForward) {
    console.log('Message filtered out by forwarding rules.');
    return;
  }

  // Filter active targets (strictly exclude disabled targets, and filter by specific rule targetIds if configured)
  const targetsToForward = specificTargetIds && specificTargetIds.length > 0
    ? activeTargets.filter(t => t.isActive && specificTargetIds!.includes(t.id))
    : activeTargets.filter(t => t.isActive);

  if (targetsToForward.length === 0) {
    console.log('No active targets matching criteria.');
    return;
  }

  // Forward to targets
  const targetResults: TargetResult[] = [];
  let successCount = 0;

  for (const target of targetsToForward) {
    try {
      let resultMsgId: number | undefined;

      if (target.forwardMode === 'native' as any || target.forwardMode === 'forward') {
        // Native Telegram forwardMessage / forwardMessages for albums
        if (message.media_group_id && Array.isArray((message as any)._mediaGroupMessageIds) && (message as any)._mediaGroupMessageIds.length > 1) {
          const res = await callTelegramApi('forwardMessages', {
            chat_id: target.chatId,
            from_chat_id: chatId,
            message_ids: (message as any)._mediaGroupMessageIds,
          });
          resultMsgId = Array.isArray(res) ? res[0]?.message_id : res?.message_id;
        } else {
          const res = await callTelegramApi('forwardMessage', {
            chat_id: target.chatId,
            from_chat_id: chatId,
            message_id: message.message_id,
          });
          resultMsgId = res.message_id;
        }
      } else {
        // Copy Mode: Clean copy with headers / footers / text modifications
        if (message.media_group_id && Array.isArray((message as any)._mediaGroupMessageIds) && (message as any)._mediaGroupMessageIds.length > 1) {
          // Use Telegram copyMessages API for albums
          try {
            const res = await callTelegramApi('copyMessages', {
              chat_id: target.chatId,
              from_chat_id: chatId,
              message_ids: (message as any)._mediaGroupMessageIds,
            });
            resultMsgId = Array.isArray(res) ? res[0]?.message_id : res?.message_id;
          } catch (copyAlbumErr) {
            const res = await callTelegramApi('copyMessage', {
              chat_id: target.chatId,
              from_chat_id: chatId,
              message_id: message.message_id,
            });
            resultMsgId = typeof res === 'number' ? res : res.message_id;
          }
        } else {
          let finalCaptionOrText = textTransform;

          if (target.customHeader) {
            finalCaptionOrText = `${target.customHeader}\n\n${finalCaptionOrText}`;
          }
          if (target.customFooter || ruleAppendSignature || store.config.globalFooter) {
            const footerStr = [target.customFooter, ruleAppendSignature, store.config.globalFooter].filter(Boolean).join('\n');
            finalCaptionOrText = `${finalCaptionOrText}\n\n${footerStr}`;
          }

          if (target.removeLinks) {
            finalCaptionOrText = finalCaptionOrText.replace(/https?:\/\/[^\s]+/g, '');
          }
          if (target.removeUsernames) {
            finalCaptionOrText = finalCaptionOrText.replace(/@[a-zA-Z0-0_]+/g, '');
          }

          // Use Telegram copyMessage API (copies media & formatted text cleanly)
          const copyPayload: Record<string, unknown> = {
            chat_id: target.chatId,
            from_chat_id: chatId,
            message_id: message.message_id,
          };

          if (finalCaptionOrText.trim() !== rawText.trim()) {
            copyPayload.caption = finalCaptionOrText.trim();
            copyPayload.parse_mode = 'HTML';
          }

          try {
            const res = await callTelegramApi('copyMessage', copyPayload);
            resultMsgId = typeof res === 'number' ? res : res.message_id;
          } catch (copyErr: any) {
            // Fallback to sendMessage if text-only
            if (messageType === 'text') {
              const res = await callTelegramApi('sendMessage', {
                chat_id: target.chatId,
                text: finalCaptionOrText || rawText || 'Broadcast',
                parse_mode: 'HTML',
              });
              resultMsgId = res.message_id;
            } else {
              throw copyErr;
            }
          }
        }
      }

      targetResults.push({
        targetId: target.id,
        targetName: target.name,
        chatId: target.chatId,
        success: true,
        messageId: resultMsgId,
      });
      successCount++;
    } catch (err: any) {
      targetResults.push({
        targetId: target.id,
        targetName: target.name,
        chatId: target.chatId,
        success: false,
        errorDetails: err.message || 'Failed to post to channel',
      });
    }
  }

  let overallStatus: ForwardLog['overallStatus'] = 'failed';
  if (successCount === activeTargets.length && successCount > 0) {
    overallStatus = 'success';
  } else if (successCount > 0) {
    overallStatus = 'partial';
  }

  const logEntry: ForwardLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    sourceChatTitle: sourceTitle,
    sourceSenderName: senderName,
    sourceSenderUsername: username,
    sourceSenderId: fromUser?.id,
    messageType,
    messageSnippet: snippet,
    originalMessageId: message.message_id,
    targetResults,
    overallStatus,
  };

  store.logs.unshift(logEntry);
  if (store.logs.length > 200) store.logs.pop();
  if (successCount > 0) {
    store.totalForwardedCount += successCount;
  }
  saveStore();
}

// Background Telegram Polling Loop
function startPollingLoop() {
  if (IS_VERCEL) return;
  if (isPollingRunning) return;
  isPollingRunning = true;

  async function poll() {
    if (!store.config.isPollingActive || !store.config.botToken) {
      isPollingRunning = false;
      return;
    }

    try {
      const updates = await callTelegramApi('getUpdates', {
        offset: pollingOffset,
        timeout: 5,
        allowed_updates: ['message', 'channel_post'],
      });

      if (Array.isArray(updates) && updates.length > 0) {
        // Group album items by media_group_id to prevent splitting photo posts
        const albumGroups = new Map<string, any[]>();
        const singleUpdates: any[] = [];

        for (const update of updates) {
          pollingOffset = update.update_id + 1;
          const msg = update.message || update.channel_post;
          if (msg && msg.media_group_id) {
            const group = albumGroups.get(msg.media_group_id) || [];
            group.push(update);
            albumGroups.set(msg.media_group_id, group);
          } else {
            singleUpdates.push(update);
          }
        }

        // Process album groups first
        for (const [_, albumUpdates] of albumGroups) {
          const primaryUpdate = albumUpdates[0];
          const primaryMsg = primaryUpdate.message || primaryUpdate.channel_post;
          primaryMsg._mediaGroupMessageIds = albumUpdates.map(u => (u.message || u.channel_post).message_id);
          await processIncomingUpdate(primaryUpdate);
        }

        // Process standalone updates
        for (const update of singleUpdates) {
          await processIncomingUpdate(update);
        }
      }
    } catch (err: any) {
      // Ignore routine polling timeouts or minor errors
      if (!err.message?.includes('timeout')) {
        console.warn('Polling check error:', err.message);
      }
    }

    if (store.config.isPollingActive) {
      pollingTimer = setTimeout(poll, 2000);
    } else {
      isPollingRunning = false;
    }
  }

  poll();
}

function stopPollingLoop() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
  isPollingRunning = false;
}

// Initial Bot check & start polling (only on persistent Node server, not on Vercel serverless)
if (!IS_VERCEL && store.config.botToken && store.config.isPollingActive) {
  fetchBotInfo().then(() => {
    startPollingLoop();
  }).catch(() => {});
}



// API Routes

// Telegram Webhook Receiver
app.post('/api/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && typeof update === 'object') {
      await processIncomingUpdate(update);
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: false, error: err.message });
  }
});

// Setup Telegram Webhook API
app.post('/api/webhook/setup', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const token = store.config.botToken;
    if (!token) {
      return res.status(400).json({ error: 'Please save a valid Bot Token first.' });
    }
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required.' });
    }
    const result = await callTelegramApi('setWebhook', { url: webhookUrl });
    store.config.isWebhookActive = true;
    store.config.webhookUrl = webhookUrl;
    store.config.isPollingActive = false;
    stopPollingLoop();
    saveStore();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to setup webhook' });
  }
});

// System Status
app.get('/api/status', async (req, res) => {
  if (store.config.botToken && (!cachedBotInfo || Date.now() - lastBotCheckTime > 60000)) {
    try {
      await fetchBotInfo();
    } catch {
      // ignore status check failure
    }
  }

  const status: SystemStatus = {
    botConnected: !!cachedBotInfo,
    botInfo: cachedBotInfo,
    pollingActive: store.config.isPollingActive,
    webhookActive: store.config.isWebhookActive,
    totalForwardedCount: store.totalForwardedCount,
    activeTargetsCount: store.targets.filter(t => t.isActive).length,
    activeRulesCount: store.rules.filter(r => r.isActive).length,
    lastActiveTime: store.logs[0]?.timestamp,
    appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
  };

  res.json(status);
});

// App Config
app.get('/api/config', (req, res) => {
  res.json({
    ...store.config,
    adminPassword: undefined, // Never expose plain password to frontend
    isDashboardProtected: !!store.config.adminPassword,
    botTokenMasked: store.config.botToken
      ? store.config.botToken.substring(0, 8) + '...' + store.config.botToken.slice(-4)
      : '',
  });
});

// Admin Auth Verification
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!store.config.adminPassword) {
    return res.json({ success: true, message: 'No password set' });
  }
  if (password === store.config.adminPassword) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid admin password' });
});

app.post('/api/config', async (req, res) => {
  try {
    const {
      botToken,
      isPollingActive,
      isWebhookActive,
      allowedAdminUsernames,
      requireAuth,
      globalHeader,
      globalFooter,
      adminPassword,
      aiProvider,
      aiApiKey,
      aiModel,
      aiCustomEndpoint,
    } = req.body;

    if (adminPassword !== undefined) {
      store.config.adminPassword = adminPassword.trim();
      store.config.isDashboardProtected = !!adminPassword.trim();
    }

    if (aiProvider !== undefined) store.config.aiProvider = aiProvider;
    if (aiApiKey !== undefined) store.config.aiApiKey = aiApiKey.trim();
    if (aiModel !== undefined) store.config.aiModel = aiModel.trim();
    if (aiCustomEndpoint !== undefined) store.config.aiCustomEndpoint = aiCustomEndpoint.trim();

    if (botToken !== undefined && botToken.trim() !== '') {
      const cleanToken = sanitizeBotToken(botToken);
      if (cleanToken !== store.config.botToken) {
        // Validate with Telegram API first
        try {
          const testBot = await callTelegramApi('getMe', undefined, cleanToken);
          cachedBotInfo = testBot as BotInfo;
          lastBotCheckTime = Date.now();
          store.config.botToken = cleanToken;
        } catch (tokenErr: any) {
          return res.status(400).json({ error: tokenErr.message || 'Invalid Telegram Bot Token.' });
        }
      }
    } else if (botToken === '') {
      store.config.botToken = '';
      cachedBotInfo = null;
      stopPollingLoop();
    }

    if (isPollingActive !== undefined) store.config.isPollingActive = isPollingActive;
    if (isWebhookActive !== undefined) store.config.isWebhookActive = isWebhookActive;
    if (allowedAdminUsernames !== undefined) store.config.allowedAdminUsernames = allowedAdminUsernames;
    if (requireAuth !== undefined) store.config.requireAuth = requireAuth;
    if (globalHeader !== undefined) store.config.globalHeader = globalHeader;
    if (globalFooter !== undefined) store.config.globalFooter = globalFooter;

    saveStore();

    if (store.config.isPollingActive && store.config.botToken) {
      startPollingLoop();
    } else {
      stopPollingLoop();
    }

    res.json({
      success: true,
      config: {
        ...store.config,
        adminPassword: undefined,
      },
      botInfo: cachedBotInfo,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update config' });
  }
});

// AI Topic & Message Generator API
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { topic, style, language, provider: reqProvider } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Please enter a topic or keywords for AI generation.' });
    }

    const provider = reqProvider || store.config.aiProvider || 'gemini';
    const apiKey = store.config.aiApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: `API Key for ${provider.toUpperCase()} is not configured. Please enter your AI API Key in Bot Credentials & Settings.`,
      });
    }

    const langPrompt = language ? `Write in ${language} language.` : 'Write in English.';
    const stylePrompt = style ? `Tone and style: ${style}.` : 'Tone: Engaging, professional, suitable for Telegram broadcast.';
    
    const promptText = `Act as an expert social media and Telegram content creator.
Generate a complete, high-converting, nicely formatted Telegram post about the following topic:
Topic: "${topic.trim()}"
${langPrompt}
${stylePrompt}

Use emojis, clear headings, bullet points where relevant, and a call-to-action (CTA) at the end. Use basic HTML tags like <b>bold</b>, <i>italic</i> if useful. Return ONLY the final post content without extra conversational chatter.`;

    let generatedText = '';

    if (provider === 'gemini') {
      const modelName = store.config.aiModel || 'gemini-1.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });
      const data = await geminiRes.json();
      if (!geminiRes.ok) {
        throw new Error(data.error?.message || `Gemini API error (HTTP ${geminiRes.status})`);
      }
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'openai' || provider === 'deepseek' || provider === 'custom') {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      let modelName = store.config.aiModel || 'gpt-4o-mini';

      if (provider === 'deepseek') {
        endpoint = 'https://api.deepseek.com/chat/completions';
        modelName = store.config.aiModel || 'deepseek-chat';
      } else if (provider === 'custom' && store.config.aiCustomEndpoint) {
        endpoint = store.config.aiCustomEndpoint;
      }

      const aiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.7,
        }),
      });

      const data = await aiRes.json();
      if (!aiRes.ok) {
        throw new Error(data.error?.message || `AI API error (HTTP ${aiRes.status})`);
      }
      generatedText = data.choices?.[0]?.message?.content || '';
    }

    if (!generatedText) {
      throw new Error('AI returned an empty response. Please check your topic prompt.');
    }

    res.json({ success: true, text: generatedText.trim() });
  } catch (err: any) {
    console.error('AI Generation Error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to generate post with AI' });
  }
});

// Test Bot Token Connection
app.post('/api/bot/test', async (req, res) => {
  try {
    const { token } = req.body;
    const cleanToken = sanitizeBotToken(token);
    const testToken = cleanToken || store.config.botToken;
    if (!testToken) {
      return res.status(400).json({ error: 'Please enter a Telegram Bot Token to test.' });
    }
    const bot = await callTelegramApi('getMe', undefined, testToken);
    res.json({ success: true, botInfo: bot });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Token verification failed' });
  }
});

// Target Destinations
app.get('/api/targets', (req, res) => {
  res.json(store.targets);
});

app.post('/api/targets', async (req, res) => {
  try {
    const { name, chatId, isChannel, forwardMode, customHeader, customFooter, removeLinks, removeUsernames } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID or Channel Username is required.' });
    }

    const cleanChatId = chatId.trim();

    // Verify Chat via Telegram API if bot token is active
    let chatDetails: any = null;
    if (store.config.botToken) {
      try {
        chatDetails = await callTelegramApi('getChat', { chat_id: cleanChatId });
      } catch (err: any) {
        console.warn('Could not verify getChat:', err.message);
      }
    }

    const newTarget: TargetDestination = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name || chatDetails?.title || cleanChatId,
      chatId: cleanChatId,
      isChannel: isChannel ?? (chatDetails?.type === 'channel' || cleanChatId.startsWith('@')),
      isActive: true,
      forwardMode: forwardMode || 'copy',
      customHeader: customHeader || '',
      customFooter: customFooter || '',
      removeLinks: !!removeLinks,
      removeUsernames: !!removeUsernames,
      createdAt: new Date().toISOString(),
    };

    store.targets.push(newTarget);
    saveStore();

    res.json({ success: true, target: newTarget, chatDetails });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/targets/:id', (req, res) => {
  const index = store.targets.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Target destination not found.' });
  }

  store.targets[index] = {
    ...store.targets[index],
    ...req.body,
  };
  saveStore();
  res.json(store.targets[index]);
});

app.delete('/api/targets/:id', (req, res) => {
  store.targets = store.targets.filter(t => t.id !== req.params.id);
  saveStore();
  res.json({ success: true });
});

// Test Chat / Channel Admin Permission
app.post('/api/targets/check-permission', async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'Chat ID required' });

    const chat = await callTelegramApi('getChat', { chat_id: chatId });
    let isMemberOrAdmin = false;

    if (cachedBotInfo) {
      try {
        const member = await callTelegramApi('getChatMember', { chat_id: chatId, user_id: cachedBotInfo.id });
        isMemberOrAdmin = ['administrator', 'creator', 'member'].includes(member.status);
      } catch (err) {
        // Some public channels don't allow getChatMember, but getChat working is a good indicator
        isMemberOrAdmin = true;
      }
    }

    const title = chat.title || chat.first_name || chatId;
    const username = chat.username ? `@${chat.username}` : undefined;
    const link = chat.username ? `https://t.me/${chat.username}` : (chat.invite_link || undefined);

    res.json({
      success: true,
      chat,
      isMemberOrAdmin,
      title,
      username,
      link,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Rules CRUD
app.get('/api/rules', (req, res) => {
  res.json(store.rules);
});

app.post('/api/rules', (req, res) => {
  const newRule: ForwardingRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: req.body.name || 'Custom Rule',
    isActive: true,
    sourceFilter: req.body.sourceFilter || 'all',
    allowedSources: req.body.allowedSources || [],
    contentType: req.body.contentType || 'all',
    includeKeywords: req.body.includeKeywords || [],
    excludeKeywords: req.body.excludeKeywords || [],
    replaceWords: req.body.replaceWords || [],
    appendSignature: req.body.appendSignature || '',
    targetIds: req.body.targetIds || [],
    createdAt: new Date().toISOString(),
  };

  store.rules.push(newRule);
  saveStore();
  res.json(newRule);
});

app.put('/api/rules/:id', (req, res) => {
  const index = store.rules.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Rule not found' });

  store.rules[index] = { ...store.rules[index], ...req.body };
  saveStore();
  res.json(store.rules[index]);
});

app.delete('/api/rules/:id', (req, res) => {
  store.rules = store.rules.filter(r => r.id !== req.params.id);
  saveStore();
  res.json({ success: true });
});

// Broadcast / Manual Post Tester
app.post(['/api/broadcast', '/api/test-forward'], async (req, res) => {
  try {
    const { text, targetIds, customHeader, customFooter, mode } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text is required.' });

    const selectedTargets = targetIds && targetIds.length > 0
      ? store.targets.filter(t => targetIds.includes(t.id) && t.isActive)
      : store.targets.filter(t => t.isActive);

    if (selectedTargets.length === 0) {
      return res.status(400).json({ error: 'No active target channels or groups selected.' });
    }

    const results: TargetResult[] = [];
    let successCount = 0;

    for (const target of selectedTargets) {
      try {
        let content = text;
        const header = customHeader || target.customHeader;
        const footer = customFooter || target.customFooter || store.config.globalFooter;

        if (header) content = `${header}\n\n${content}`;
        if (footer) content = `${content}\n\n${footer}`;

        const msgRes = await callTelegramApi('sendMessage', {
          chat_id: target.chatId,
          text: content,
          parse_mode: 'HTML',
        });

        results.push({
          targetId: target.id,
          targetName: target.name,
          chatId: target.chatId,
          success: true,
          messageId: msgRes.message_id,
        });
        successCount++;
      } catch (err: any) {
        results.push({
          targetId: target.id,
          targetName: target.name,
          chatId: target.chatId,
          success: false,
          errorDetails: err.message,
        });
      }
    }

    // Log manual post
    const logEntry: ForwardLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      sourceChatTitle: 'Web Dashboard Manual Post',
      sourceSenderName: 'Admin Web Tester',
      messageType: 'text',
      messageSnippet: text.substring(0, 100),
      targetResults: results,
      overallStatus: successCount === selectedTargets.length ? 'success' : successCount > 0 ? 'partial' : 'failed',
    };

    store.logs.unshift(logEntry);
    if (store.logs.length > 200) store.logs.pop();
    if (successCount > 0) store.totalForwardedCount += successCount;
    saveStore();

    res.json({ success: true, results, successCount, total: selectedTargets.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Interactive Simulator (Simulate Telegram incoming DM/forward message in the browser)
app.post('/api/simulate-incoming', async (req, res) => {
  try {
    const { text, senderName, senderUsername, isForwarded, forwardSourceTitle, messageType } = req.body;

    const simulatedUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      message: {
        message_id: Math.floor(Math.random() * 10000),
        from: {
          id: 999888777,
          is_bot: false,
          first_name: senderName || 'Demo User',
          username: senderUsername || 'demouser',
        },
        chat: {
          id: 999888777,
          first_name: senderName || 'Demo User',
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: messageType === 'text' || !messageType ? text || 'Sample test forward post' : undefined,
        caption: messageType !== 'text' ? text : undefined,
        forward_from_chat: isForwarded ? {
          id: -100111222333,
          title: forwardSourceTitle || 'Source Tech News Channel',
          type: 'channel',
          username: 'sourcetechnews',
        } : undefined,
        photo: messageType === 'photo' ? [{ file_id: 'photo_mock_id' }] : undefined,
        video: messageType === 'video' ? { file_id: 'video_mock_id' } : undefined,
        document: messageType === 'document' ? { file_id: 'doc_mock_id', file_name: 'report.pdf' } : undefined,
      },
    };

    await processIncomingUpdate(simulatedUpdate);
    res.json({ success: true, message: 'Simulated incoming message processed successfully!' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Telegram Webhook Handler
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    await processIncomingUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200); // Always respond 200 to Telegram webhook so it doesn't retry infinitely
  }
});

// Configure Webhook
app.post('/api/telegram/set-webhook', async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || req.body.appUrl;
    if (!appUrl) {
      return res.status(400).json({ error: 'App URL is missing for setting webhook.' });
    }

    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    const result = await callTelegramApi('setWebhook', { url: webhookUrl });

    store.config.isWebhookActive = true;
    store.config.isPollingActive = false;
    store.config.webhookUrl = webhookUrl;
    stopPollingLoop();
    saveStore();

    res.json({ success: true, result, webhookUrl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/telegram/delete-webhook', async (req, res) => {
  try {
    const result = await callTelegramApi('deleteWebhook', { drop_pending_updates: false });
    store.config.isWebhookActive = false;
    store.config.isPollingActive = true;
    saveStore();
    startPollingLoop();

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Activity Logs
app.get('/api/logs', (req, res) => {
  res.json(store.logs);
});

app.post('/api/logs/clear', (req, res) => {
  store.logs = [];
  saveStore();
  res.json({ success: true });
});

// Fallback JSON response for unknown API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !IS_VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!IS_VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!IS_VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Telegram Forwarder Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!IS_VERCEL) {
  startServer();
}

export default app;
