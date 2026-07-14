const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidGroup,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./db');

const { Groq } = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ClientConfig = require('./models/ClientConfig');
const ChatSession = require('./models/ChatSession');
const MessageHistory = require('./models/MessageHistory');

dotenv.config();

let groq;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

let genAI;
if (process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

const generateAIResponse = async (history, newContent) => {
    try {
        const systemPrompt = { role: 'system', content: 'You are a helpful and concise WhatsApp AI assistant.' };
        
        // Format history for Groq
        const formattedHistory = history.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));

        // Prioritize speed with Groq using llama-3.1-8b-instant (lightweight and very fast)
        if (groq) {
            const completion = await groq.chat.completions.create({
                messages: [systemPrompt, ...formattedHistory, { role: 'user', content: newContent }],
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                max_tokens: 1024,
            });
            return completion.choices[0]?.message?.content || 'Sorry, I got an empty response.';
        }
        
        // Fallback to Gemini 1.5 Flash (lightweight and fast)
        if (genAI) {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            // Format history for Gemini
            const geminiHistory = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            
            const chat = model.startChat({
                history: geminiHistory,
            });
            
            const result = await chat.sendMessage(newContent);
            return result.response.text();
        }

        return `[AI Placeholder]: I heard you say: "${newContent}" (API Keys missing)`;
    } catch (error) {
        console.error('Error generating AI response:', error);
        return 'Sorry, I encountered an error while processing your request.';
    }
};

const logger = pino({ level: 'silent' });

async function startBot() {
    await connectDB();

    // Use multi file auth state strictly in './bot-auth-session'
    const { state, saveCreds } = await useMultiFileAuthState('./bot-auth-session');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        generateHighQualityLinkPreview: true,
        // Optional: define getMessage if needed to handle retries properly
        getMessage: async (key) => {
            return {
                conversation: 'Message placeholder'
            };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Graceful restart on connection closed
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('Logged out from WhatsApp. Need to rescan QR.');
            }
        } else if (connection === 'open') {
            console.log('Opened connection to WhatsApp');
        }
    });

    // Handle graceful PM2 reload & zero-downtime
    const gracefulShutdown = async (signal) => {
        console.log(`Received ${signal}. Gracefully shutting down...`);
        try {
            if (sock && sock.ws) {
                sock.ws.close();
                console.log('Baileys WebSocket closed cleanly without corrupting session.');
            }
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.close(false); // Flushes pending ops cleanly
                console.log('MongoDB connection closed and pending inserts flushed.');
            }
            process.exit(0);
        } catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    };

    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message) return; // ignore if no message

        // Parse JID and Text
        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        if (!text) return; // Only process text messages

        const isGroup = isJidGroup(remoteJid);
        const fromMe = msg.key.fromMe === true;

        // Initialize or fetch ClientConfig based on bot's identifier
        const rawBotNumber = sock.user.id.split(':')[0];
        let config = await ClientConfig.findOne({ botNumber: rawBotNumber });
        if (!config) {
            config = await ClientConfig.create({ botNumber: rawBotNumber });
        }

        // ==========================================
        // PHASE A: Admin Configuration Group
        // ==========================================
        if (fromMe && isGroup) {
            if (text === '/init') {
                config.adminGroupId = remoteJid;
                await config.save();
                await sock.sendMessage(remoteJid, { text: 'Admin group initialized successfully.' });
                return; // Halt execution
            }
            
            if (text.startsWith('/set ')) {
                // e.g., /set status = active
                const parts = text.replace('/set ', '').split('=');
                if (parts.length === 2) {
                    const key = parts[0].trim();
                    let value = parts[1].trim();
                    
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;

                    if (config.schema.paths[key]) {
                        config[key] = value;
                        await config.save();
                        await sock.sendMessage(remoteJid, { text: `Configuration updated: ${key} = ${value}` });
                    } else {
                        await sock.sendMessage(remoteJid, { text: `Invalid configuration key: ${key}` });
                    }
                }
                return; // Halt execution
            }
        }

        // ==========================================
        // PHASE B: Stealth Human Takeover
        // ==========================================
        if (fromMe && !isGroup) {
            let session = await ChatSession.findOne({ jid: remoteJid });
            if (!session) {
                session = await ChatSession.create({ jid: remoteJid });
            }

            if (text === '.') {
                session.botMode = 'human';
                const pauseTime = new Date();
                pauseTime.setHours(pauseTime.getHours() + 2);
                session.pausedUntil = pauseTime;
                await session.save();
                return; // Halt execution
            } else if (text === '..') {
                session.botMode = 'ai';
                session.pausedUntil = null;
                await session.save();
                return; // Halt execution
            } else {
                // Any other text sent by owner => human mode, without a timer
                session.botMode = 'human';
                session.pausedUntil = null; 
                await session.save();
                return; // Halt execution
            }
        }

        // ==========================================
        // PHASE C: The 7-Day SaaS Free Trial Kill Switch
        // ==========================================
        if (!fromMe && !isGroup) {
            const now = new Date();
            const trialEnd = new Date(config.trialStartDate);
            trialEnd.setDate(trialEnd.getDate() + 7);
            const daysSinceTrialStart = (now - config.trialStartDate) / (1000 * 60 * 60 * 24);

            if (daysSinceTrialStart > 7 && !config.paymentConfirmed) {
                if (config.status !== 'suspended') {
                    config.status = 'suspended';
                    await config.save();
                }

                if (config.adminGroupId) {
                    await sock.sendMessage(config.adminGroupId, { 
                        text: `ALERT: Trial expired for bot ${config.botNumber}. Please complete M-PESA payment to resume services.` 
                    });
                }
                return; // Halt processing
            }

            if (config.status === 'suspended') {
                return; // Halt execution
            }
        }

        // ==========================================
        // PHASE D: Stateful AI Context Execution
        // ==========================================
        if (config.status === 'active' || config.status === 'trial') {
            if (!fromMe && !isGroup) {
                let session = await ChatSession.findOne({ jid: remoteJid });
                if (!session) {
                    session = await ChatSession.create({ jid: remoteJid });
                }

                // Check if human takeover expired
                if (session.botMode === 'human' && session.pausedUntil && session.pausedUntil < new Date()) {
                    session.botMode = 'ai';
                    session.pausedUntil = null;
                    await session.save();
                }

                if (session.botMode !== 'human') {
                    // Save user message
                    await MessageHistory.create({
                        jid: remoteJid,
                        role: 'user',
                        content: text
                    });

                    // Query the last 10 messages chronologically
                    const history = await MessageHistory.find({ jid: remoteJid })
                        .sort({ timestamp: -1 })
                        .limit(10);
                    history.reverse(); 

                    try {
                        // Mock API call to Groq/Gemini
                        const aiResponseText = await generateAIResponse(history, text);

                        // Save AI response
                        await MessageHistory.create({
                            jid: remoteJid,
                            role: 'assistant',
                            content: aiResponseText
                        });

                        // Transmit back via Baileys
                        await sock.sendMessage(remoteJid, { text: aiResponseText });
                    } catch (error) {
                        console.error('Error generating AI response:', error);
                        await sock.sendMessage(remoteJid, { text: 'Sorry, I am having trouble processing your request at the moment.' });
                    }
                }
            }
        }
    });
}

// Global error boundaries to prevent crashes
process.on('uncaughtException', err => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
    console.error('Unhandled Rejection:', err);
});

startBot();
