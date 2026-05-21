// Database & Rank system สำหรับ Trade Journal

// ตารางยศและข้อจำกัดของพอร์ต (อ้างอิงจาก Dashboard.js เดิม)
export const RANK_SYSTEM = [
    { level: 1, name: "🌱 Novice", minPort: 100, risk1: 1, maxRisk: 2, maxAlloc: 100 },
    { level: 2, name: "🌿 Rookie", minPort: 300, risk1: 3, maxRisk: 6, maxAlloc: 100 },
    { level: 3, name: "🪵 Fighter", minPort: 500, risk1: 5, maxRisk: 10, maxAlloc: 100 },
    { level: 4, name: "🛡️ Guardian", minPort: 1000, risk1: 10, maxRisk: 20, maxAlloc: 100 },
    { level: 5, name: "⚔️ Warrior", minPort: 2500, risk1: 25, maxRisk: 50, maxAlloc: 100 },
    { level: 6, name: "🏰 Commander", minPort: 5000, risk1: 50, maxRisk: 100, maxAlloc: 60 },
    { level: 7, name: "👑 Lord", minPort: 10000, risk1: 100, maxRisk: 200, maxAlloc: 50 },
    { level: 8, name: "🦅 Baron", minPort: 25000, risk1: 250, maxRisk: 500, maxAlloc: 40 },
    { level: 9, name: "🦁 Duke", minPort: 50000, risk1: 500, maxRisk: 1000, maxAlloc: 30 },
    { level: 10, name: "💎 Prince", minPort: 100000, risk1: 1000, maxRisk: 2000, maxAlloc: 20 },
    { level: 11, name: "🐲 King", minPort: 250000, risk1: 2500, maxRisk: 5000, maxAlloc: 15 },
    { level: 12, name: "🌍 Emperor", minPort: 500000, risk1: 5000, maxRisk: 10000, maxAlloc: 10 },
    { level: 13, name: "🌌 Conqueror", minPort: 750000, risk1: 7500, maxRisk: 15000, maxAlloc: 10 },
    { level: 14, name: "🌟 Legend", minPort: 1000000, risk1: 10000, maxRisk: 20000, maxAlloc: 8 },
    { level: 15, name: "♾️ Immortal", minPort: 2000000, risk1: 10000, maxRisk: 20000, maxAlloc: 5 }
];

// ข้อมูลจำลองตั้งต้น (Initial Mock Data)
const INITIAL_TRADES = [
    {
        id: "t-1",
        symbol: "AAPL",
        direction: "Long",
        dateTime: "2026-05-18T10:15",
        entryPrice: 150.00,
        stopLoss: 145.00,
        takeProfit: 165.00,
        actualExitPrice: 162.50,
        shares: 10.0000,
        status: "Closed",
        pnl: 125.00,
        actualRR: 2.5,
        contextScore: 8,
        aiScore: 9,
        aiFeedback: "ยอดเยี่ยม! เทรดตามสัญญาณแนวรับที่แข็งแกร่งและปิดออเดอร์ใกล้เป้าหมายหลัก รักษาจุดตัดขาดทุนได้ดีมากตามแผน",
        planAdherence: "เทรดตาม Teacher's (Ajarn) Live (+100%)",
        planAdherenceScore: 100
    },
    {
        id: "t-2",
        symbol: "TSLA",
        direction: "Short",
        dateTime: "2026-05-19T14:30",
        entryPrice: 220.00,
        stopLoss: 225.00,
        takeProfit: 200.00,
        actualExitPrice: 224.80,
        shares: 5.0000,
        status: "Closed",
        pnl: -24.00,
        actualRR: -0.96,
        contextScore: 5,
        aiScore: 7,
        aiFeedback: "ตัดขาดทุนได้ทันท่วงทีก่อนที่ราคาจะทะยานไปชน Stop Loss เต็มๆ การเลือกทางผิดเกิดได้เสมอแต่วินัยดีมาก",
        planAdherence: "ตามแผนส่วนตัว (+100%)",
        planAdherenceScore: 100
    },
    {
        id: "t-3",
        symbol: "NVDA",
        direction: "Long",
        dateTime: "2026-05-20T09:45",
        entryPrice: 480.00,
        stopLoss: 470.00,
        takeProfit: 510.00,
        actualExitPrice: null,
        shares: 1.5543,
        status: "Open",
        pnl: 0,
        actualRR: 0,
        contextScore: 7,
        aiScore: null,
        aiFeedback: "",
        planAdherence: "",
        planAdherenceScore: 0
    },
    {
        id: "t-4",
        symbol: "MSFT",
        direction: "Long",
        dateTime: "2026-05-20T11:00",
        entryPrice: 350.00,
        stopLoss: 345.00,
        takeProfit: 365.00,
        actualExitPrice: 344.90,
        shares: 15.0000,
        status: "Closed",
        pnl: -76.50,
        actualRR: -1.02,
        contextScore: 4,
        aiScore: 4,
        aiFeedback: "จุดนี้ซื้อในภาวะตลาดที่มีความผันผวนสูง (Context Score ต่ำ) และเป็นการรีบเข้าตามอารมณ์ คราวหลังควรรอปัจจัยยืนยันมากกว่านี้",
        planAdherence: "เทรดด้วยอารมณ์/FOMO (0%)",
        planAdherenceScore: 0
    }
];

// โหลดข้อมูลเทรดทั้งหมดจาก LocalStorage
export const getStoredTrades = (email) => {
    if (!email) return INITIAL_TRADES;
    const key = `phudit_tj_trades_${email}`;
    const data = localStorage.getItem(key);
    if (!data) {
        localStorage.setItem(key, JSON.stringify(INITIAL_TRADES));
        return INITIAL_TRADES;
    }
    return JSON.parse(data);
};

// บันทึกข้อมูลเทรดทั้งหมดลง LocalStorage
export const saveTrades = (email, trades) => {
    if (!email) return;
    localStorage.setItem(`phudit_tj_trades_${email}`, JSON.stringify(trades));
};

// โหลดเงินพอร์ตตั้งต้น (Default คือ $10,000)
export const getStoredInitialBalance = (email) => {
    if (!email) return 10000;
    const key = `phudit_tj_initial_balance_${email}`;
    const data = localStorage.getItem(key);
    if (!data) {
        localStorage.setItem(key, '10000');
        return 10000;
    }
    return parseFloat(data);
};

// บันทึกเงินพอร์ตตั้งต้น
export const saveInitialBalance = (email, balance) => {
    if (!email) return;
    localStorage.setItem(`phudit_tj_initial_balance_${email}`, balance.toString());
};

// โหลดเป้าหมาย RR ประจำเดือน (Default คือ 20 RR)
export const getStoredTargetRR = (email) => {
    if (!email) return 20;
    const key = `phudit_tj_target_rr_${email}`;
    const data = localStorage.getItem(key);
    if (!data) {
        localStorage.setItem(key, '20');
        return 20;
    }
    return parseFloat(data);
};

// บันทึกเป้าหมาย RR
export const saveTargetRR = (email, rr) => {
    if (!email) return;
    localStorage.setItem(`phudit_tj_target_rr_${email}`, rr.toString());
};

// ฟังก์ชันจัดการฐานข้อมูลผู้ใช้ลงทะเบียนและสิทธิ์ (จำลองระบบใน LocalStorage)
export const getUserRegistry = () => {
    const data = localStorage.getItem('phudit_tj_users');
    if (!data) {
        // แอด Owner ลงทะเบียนตัวแรกแบบ auto approved
        const initialRegistry = {
            'phudit.mahawongsanan@gmail.com': {
                email: 'phudit.mahawongsanan@gmail.com',
                status: 'approved',
                createdAt: new Date().toISOString()
            }
        };
        localStorage.setItem('phudit_tj_users', JSON.stringify(initialRegistry));
        return initialRegistry;
    }
    return JSON.parse(data);
};

export const saveUserRegistry = (registry) => {
    localStorage.setItem('phudit_tj_users', JSON.stringify(registry));
};

// เช็คว่ามีผู้ใช้นี้ในระบบหรือยัง
export const checkUserExists = (email) => {
    if (!email) return false;
    const registry = getUserRegistry();
    return !!registry[email.trim().toLowerCase()];
};

// ลงทะเบียนผู้ใช้ใหม่พร้อมรหัสผ่าน
export const registerUser = (email, password) => {
    if (!email) return { success: false, error: 'Email is required' };
    
    // Support for old call without password (just in case)
    if (!password && arguments.length === 1) {
        const cleanEmail = email.trim().toLowerCase();
        const registry = getUserRegistry();
        if (!registry[cleanEmail]) {
            registry[cleanEmail] = {
                email: cleanEmail,
                status: cleanEmail === 'phudit.mahawongsanan@gmail.com' ? 'approved' : 'pending',
                createdAt: new Date().toISOString()
            };
            saveUserRegistry(registry);
        }
        return registry[cleanEmail];
    }
    
    // New Auth Flow
    const cleanEmail = email.trim().toLowerCase();
    const registry = getUserRegistry();
    if (registry[cleanEmail]) {
        return { success: false, error: 'User already exists' };
    }
    
    registry[cleanEmail] = {
        email: cleanEmail,
        password: password,
        status: 'approved', // Auto approve when registering with password per new requirements
        createdAt: new Date().toISOString()
    };
    saveUserRegistry(registry);
    return { success: true };
};

// ตรวจสอบรหัสผ่าน
export const verifyUser = (email, password) => {
    if (!email || !password) return false;
    const cleanEmail = email.trim().toLowerCase();
    const registry = getUserRegistry();
    const user = registry[cleanEmail];
    if (!user) return false;
    
    // If it's the owner and they don't have a password yet (from legacy), let them in or require them to have one
    // But since login component requires password, they must match.
    // If legacy user has no password, they can't login until they register again or we allow it.
    // Assuming they just match passwords:
    return user.password === password;
};

export const approveUser = (email) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const registry = getUserRegistry();
    if (registry[cleanEmail]) {
        registry[cleanEmail].status = 'approved';
        saveUserRegistry(registry);
    }
};

export const deleteUser = (email) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. ลบจาก registry
    const registry = getUserRegistry();
    if (registry[cleanEmail]) {
        delete registry[cleanEmail];
        saveUserRegistry(registry);
    }

    // 2. ลบข้อมูลของเขาทุกอย่างใน LocalStorage
    localStorage.removeItem(`phudit_tj_trades_${cleanEmail}`);
    localStorage.removeItem(`phudit_tj_initial_balance_${cleanEmail}`);
    localStorage.removeItem(`phudit_tj_target_rr_${cleanEmail}`);
};

export const checkUserStatus = (email) => {
    if (!email) return 'pending';
    const cleanEmail = email.trim().toLowerCase();
    // พิเศษ: Owner เข้าได้เสมอ
    if (cleanEmail === 'phudit.mahawongsanan@gmail.com') return 'approved';
    
    const registry = getUserRegistry();
    if (!registry[cleanEmail]) {
        // ลงทะเบียนผู้ใช้ใหม่โดยเริ่มต้นเป็น pending
        registerUser(cleanEmail);
        return 'pending';
    }
    return registry[cleanEmail].status;
};

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมดสำหรับหน้า Owner (ดึงจากทะเบียนผู้ใช้)
export const getAllUsersData = () => {
    const registry = getUserRegistry();
    const users = [];
    
    Object.keys(registry).forEach(email => {
        try {
            const tradesKey = `phudit_tj_trades_${email}`;
            const trades = JSON.parse(localStorage.getItem(tradesKey)) || [];
            const initBal = parseFloat(localStorage.getItem(`phudit_tj_initial_balance_${email}`)) || 10000;
            const netPnL = trades.reduce((acc, t) => acc + (t.status === 'Closed' ? (parseFloat(t.pnl) || 0) : 0), 0);
            const currentBal = initBal + netPnL;
            users.push({
                email,
                status: registry[email].status,
                createdAt: registry[email].createdAt,
                tradesCount: trades.length,
                currentBal,
                netPnL
            });
        } catch (e) {
            users.push({
                email,
                status: registry[email].status,
                createdAt: registry[email].createdAt,
                tradesCount: 0,
                currentBal: 10000,
                netPnL: 0
            });
        }
    });
    
    return users.sort((a, b) => b.currentBal - a.currentBal);
};

// ฟังก์ชันจำลอง AI ในการวิเคราะห์คุณภาพการเทรด (⚡ AI Assess)
export const simulateAIAssessment = (trade) => {
    const entry = parseFloat(trade.entryPrice);
    const sl = parseFloat(trade.stopLoss);
    const exit = parseFloat(trade.actualExitPrice);
    const dir = trade.direction;
    const scorePlan = trade.planAdherenceScore;
    const scoreContext = parseInt(trade.contextScore) || 5;

    // คำนวณความเบี่ยงเบนและประสิทธิภาพ
    let isWin = false;
    if (dir === 'Long') {
        isWin = exit > entry;
    } else {
        isWin = exit < entry;
    }

    let calculatedRR = 0;
    const gap = Math.abs(entry - sl);
    if (gap > 0) {
        calculatedRR = dir === 'Long' ? (exit - entry) / gap : (entry - exit) / gap;
    }

    // คิดคะแนน AI Score (1-10) จากปัจจัยต่างๆ
    let aiScore = 5;
    let feedback = "";

    if (scorePlan === 100) {
        aiScore += 2;
    } else if (scorePlan === 50) {
        aiScore += 0;
    } else {
        aiScore -= 2;
    }

    if (scoreContext >= 8) {
        aiScore += 1;
    } else if (scoreContext <= 4) {
        aiScore -= 1;
    }

    if (isWin) {
        aiScore += 1;
        if (calculatedRR >= 2) {
            aiScore += 1;
        }
    } else {
        if (Math.abs(calculatedRR) > 1.2) {
            aiScore -= 1; // ขาดทุนเกินจุด SL
        }
    }

    // จำกัดขอบเขตคะแนน 1-10
    aiScore = Math.max(1, Math.min(10, aiScore));

    // สร้าง Feedback ภาษาไทยตามเงื่อนไข
    if (scorePlan === 100) {
        if (isWin) {
            feedback = `🌟 ยอดเยี่ยมมาก! การเทรดครั้งนี้ทำตามแผนอย่างเคร่งครัด 100% ควบคู่กับสภาวะตลาดที่เอื้ออำนวย (Context: ${scoreContext}/10) ได้รับกำไร $${trade.pnl.toFixed(2)} (${calculatedRR.toFixed(2)} RR) วินัยชั้นยอดแบบนี้ทำให้พอร์ตเติบโตอย่างมั่นคงแน่นอน!`;
        } else {
            feedback = `👍 แม้ออเดอร์นี้จะจบด้วยการขาดทุน (-$${Math.abs(trade.pnl).toFixed(2)}) แต่การรักษาแผนการเทรด 100% ถือว่าสมบูรณ์แบบ วินัยที่ดีย่อมสำคัญกว่าผลลัพธ์ระยะสั้น การตัดขาดทุนตรงเวลาเป็นเกราะคุ้มครองพอร์ตที่ดีที่สุดครับ`;
        }
    } else if (scorePlan === 50) {
        if (isWin) {
            feedback = `⚠️ ออเดอร์นี้ได้กำไรแต่ต้องระวัง เพราะทำตามแผนได้เพียงบางส่วน (50%) มีความเสี่ยงที่คุณจะใช้อารมณ์ร่วมหรือละเลยเช็คลิสต์บางอย่าง ควรทบทวนระบบเทรดและรักษาวินัยให้สม่ำเสมอ`;
        } else {
            feedback = `❌ เสียหายจากการขาดวินัยบางส่วน! ออเดอร์นี้หลุดจากแผนที่ตั้งไว้ ส่งผลให้ขาดทุน $${Math.abs(trade.pnl).toFixed(2)} คราวหน้าควรยึดมั่นตามเช็คลิสต์หรือรอเข้าเทรดพร้อมคำแนะนำจาก Ajarn Live เพื่อความชัวร์`;
        }
    } else {
        if (isWin) {
            feedback = `🚨 โชคดีที่ได้กำไร! ออเดอร์นี้เป็นการเทรดด้วยอารมณ์หรือ FOMO 100% (วินัย 0%) แม้จะได้เงินแต่การเข้าออเดอร์นอกแผนแบบนี้จะทำลายพอร์ตในระยะยาวได้ง่ายมาก ควรระงับอารมณ์และห้ามเทรดไล่ราคาโดยไม่มีแผนเด็ดขาด`;
        } else {
            feedback = `🚨 ความพ่ายแพ้จากการใช้อารมณ์ (FOMO)! ออเดอร์นี้แหกกฎ 100% และขาดทุน $${Math.abs(trade.pnl).toFixed(2)} นี่คือเครื่องเตือนใจว่าการเทรดด้วยอารมณ์จะพาไปสู่ความเสียหาย ควรปิดหน้าจอไปพักผ่อนเพื่อปรับอารมณ์ก่อนเริ่มเทรดไม้ถัดไป`;
        }
    }

    return {
        aiScore,
        aiFeedback: feedback
    };
};

// โหลดข้อมูลโปรไฟล์จาก LocalStorage
export const getStoredProfile = (email) => {
    if (!email) return { name: 'Trader', photo: '', fontSize: 'normal' };
    const key = `phudit_tj_profile_${email}`;
    const data = localStorage.getItem(key);
    if (!data) {
        const defaultName = email.split('@')[0];
        const defaultProfile = { name: defaultName, photo: '', fontSize: 'normal' };
        localStorage.setItem(key, JSON.stringify(defaultProfile));
        return defaultProfile;
    }
    try {
        const parsed = JSON.parse(data);
        // Ensure default properties exist
        return {
            name: parsed.name || email.split('@')[0],
            photo: parsed.photo || '',
            fontSize: parsed.fontSize || 'normal'
        };
    } catch (e) {
        return { name: email.split('@')[0], photo: '', fontSize: 'normal' };
    }
};

// บันทึกข้อมูลโปรไฟล์ลง LocalStorage
export const saveProfile = (email, profile) => {
    if (!email) return;
    localStorage.setItem(`phudit_tj_profile_${email}`, JSON.stringify(profile));
};


