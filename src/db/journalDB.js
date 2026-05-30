import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';

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

export const getStoredTrades = async (email) => {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().trades) {
            fbData = docSnap.data().trades;
        }
    } catch (e) {
        console.error("Error fetching trades from Firebase:", e);
    }
    
    let localData = [];
    try {
        const local = localStorage.getItem(`phudit_trades_${cleanEmail}`);
        if (local) localData = JSON.parse(local);
    } catch (e) {
        console.error("Error reading trades from LocalStorage:", e);
    }

    if (fbData) {
        // Recovery mechanism: If LocalStorage has more trades than Firebase, use LocalStorage and sync up.
        if (localData && localData.length > fbData.length) {
            console.log("Recovering trades from LocalStorage:", localData.length, "vs", fbData.length);
            saveTrades(cleanEmail, localData);
            return localData;
        }
        return fbData;
    }
    
    return localData;
};

export const saveTrades = async (email, trades) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // Save to LocalStorage first
    try {
        localStorage.setItem(`phudit_trades_${cleanEmail}`, JSON.stringify(trades));
    } catch (e) {
        console.error("Error saving trades to LocalStorage:", e);
    }
    
    // Attempt to save to Firebase
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { trades }, { merge: true });
    } catch (e) {
        console.error("Error saving trades to Firebase:", e);
    }
};

// --- Plans Storage ---
export const getStoredPlans = async (email) => {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().plans) {
            fbData = docSnap.data().plans;
        }
    } catch (e) {
        console.error("Error fetching plans from Firebase:", e);
    }
    
    if (fbData) return fbData;
    
    try {
        const local = localStorage.getItem(`phudit_plans_${cleanEmail}`);
        if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
};

export const savePlans = async (email, plans) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_plans_${cleanEmail}`, JSON.stringify(plans));
    } catch (e) {}
    
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { plans }, { merge: true });
    } catch (e) {}
};

// --- Dividends Storage ---
export const getStoredDividends = async (email) => {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().dividends) {
            fbData = docSnap.data().dividends;
        }
    } catch (e) {
        console.error("Error fetching dividends from Firebase:", e);
    }
    
    if (fbData) return fbData;
    
    try {
        const local = localStorage.getItem(`phudit_dividends_${cleanEmail}`);
        if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
};

export const saveDividends = async (email, dividends) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_dividends_${cleanEmail}`, JSON.stringify(dividends));
    } catch (e) {}
    
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { dividends }, { merge: true });
    } catch (e) {}
};

// --- Funding History Storage ---
export const getStoredFundingHistory = async (email) => {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().fundingHistory) {
            fbData = docSnap.data().fundingHistory;
        }
    } catch (e) {
        console.error("Error fetching funding history from Firebase:", e);
    }
    
    if (fbData) return fbData;
    
    try {
        const local = localStorage.getItem(`phudit_funding_${cleanEmail}`);
        if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
};

export const saveFundingHistory = async (email, history) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_funding_${cleanEmail}`, JSON.stringify(history));
    } catch (e) {}
    
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { fundingHistory: history }, { merge: true });
    } catch (e) {}
};

// --- Accounts Storage ---
export const saveAccounts = async (email, accounts) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
        localStorage.setItem(`phudit_accounts_${cleanEmail}`, JSON.stringify(accounts));
    } catch (e) {}
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { accounts }, { merge: true });
    } catch (e) {}
};


export const getStoredInitialBalance = async (email) => {
    if (!email) return 10000;
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().initialBalance !== undefined) {
            fbData = docSnap.data().initialBalance;
        }
    } catch (e) {
        console.error("Error fetching balance from Firebase:", e);
    }
    
    if (fbData !== null) return fbData;
    
    const local = localStorage.getItem(`phudit_balance_${cleanEmail}`);
    return local ? parseFloat(local) : 10000;
};

export const saveInitialBalance = async (email, balanceObj) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_balance_${cleanEmail}`, JSON.stringify(balanceObj));
    } catch (e) {}

    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { initialBalances: balanceObj }, { merge: true });
    } catch (e) {
        console.error("Error saving balance to Firebase:", e);
    }
};

export const getStoredTargetRR = async (email) => {
    if (!email) return 20;
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().targetRR !== undefined) {
            fbData = docSnap.data().targetRR;
        }
    } catch (e) {
        console.error("Error fetching RR from Firebase:", e);
    }
    
    if (fbData !== null) return fbData;
    
    const local = localStorage.getItem(`phudit_rr_${cleanEmail}`);
    return local ? parseFloat(local) : 20;
};

export const saveTargetRR = async (email, rr) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_rr_${cleanEmail}`, rr.toString());
    } catch (e) {}

    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { targetRR: rr }, { merge: true });
    } catch (e) {
        console.error("Error saving RR to Firebase:", e);
    }
};

export const getStoredProfile = async (email) => {
    const defaultProfile = { name: email ? email.split('@')[0] : 'Trader', photo: '', fontSize: 'normal' };
    if (!email) return defaultProfile;
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().profile) {
            fbData = { ...defaultProfile, ...docSnap.data().profile };
        }
    } catch (e) {
        console.error("Error fetching profile from Firebase:", e);
    }
    
    if (fbData !== null) return fbData;
    
    try {
        const local = localStorage.getItem(`phudit_profile_${cleanEmail}`);
        if (local) return { ...defaultProfile, ...JSON.parse(local) };
    } catch (e) {}
    
    return defaultProfile;
};

export const saveProfile = async (email, profile) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_profile_${cleanEmail}`, JSON.stringify(profile));
    } catch (e) {}

    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { profile }, { merge: true });
    } catch (e) {
        console.error("Error saving profile to Firebase:", e);
    }
};

export const checkUserExists = async (email) => {
    if (!email) return false;
    try {
        const cleanEmail = email.trim().toLowerCase();
        const docRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (e) {
        console.error("Error checking user:", e);
        return false;
    }
};

export const registerUser = async (email, password) => {
    if (!email || !password) return { success: false, error: 'Email and password are required' };
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        const userRef = doc(db, 'users', cleanEmail);
        const initialStatus = cleanEmail === 'phudit.mahawongsanan@gmail.com' ? 'approved' : 'pending';
        await setDoc(userRef, {
            email: cleanEmail,
            status: initialStatus,
            createdAt: new Date().toISOString(),
            initialBalance: 10000,
            targetRR: 20,
            trades: [],
            profile: {
                name: cleanEmail.split('@')[0],
                photo: '',
                fontSize: 'normal'
            }
        });
        
        // Sign out ทันทีหลังจากลงทะเบียน เพื่อบังคับให้ผู้ใช้ต้องรออนุมัติก่อนเข้าสู่ระบบ
        await signOut(auth);
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') msg = 'อีเมลนี้ถูกใช้งานแล้ว';
        else if (error.code === 'auth/weak-password') msg = 'รหัสผ่านอ่อนเกินไป (ต้อง 6 ตัวอักษรขึ้นไป)';
        return { success: false, error: msg };
    }
};

export const verifyUser = async (email, password) => {
    if (!email || !password) return { success: false, error: 'Email and password are required' };
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;
        
        // ตรวจสอบสถานะการอนุมัติจากแอดมินใน Firestore
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.status === 'pending') {
                alert('⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ (Admin) กรุณาติดต่อคุณ Phudit เพื่ออนุมัติการใช้งาน');
                await signOut(auth);
                return {
                    success: false,
                    error: '⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ (Admin) กรุณาติดต่อคุณ Phudit เพื่ออนุมัติการใช้งาน'
                };
            }
        }
        
        return { success: true, user: user };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        return { success: false, error: msg };
    }
};


export const getUserStatus = async (email) => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data().status || 'approved';
        }
    } catch (e) {}
    return 'approved';
};

export const getUserVipStatus = async (email) => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data().isVip || false;
        }
    } catch (e) {}
    return false;
};

export const resetPassword = async (email) => {
    if (!email) return { success: false, error: 'กรุณากรอกอีเมล' };
    try {
        const cleanEmail = email.trim().toLowerCase();
        await sendPasswordResetEmail(auth, cleanEmail);
        return { success: true };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            msg = 'ไม่พบผู้ใช้นี้ในระบบ หรืออีเมลไม่ถูกต้อง';
        }
        return { success: false, error: msg };
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
};


export const deleteUser = async (email) => {
    if (!email) return;
    try {
        const cleanEmail = email.trim().toLowerCase();
        await deleteDoc(doc(db, 'users', cleanEmail));
    } catch (e) {
        console.error("Error deleting user:", e);
    }
};

export const approveUser = async (email) => {
    if (!email) return;
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { status: 'approved' }, { merge: true });
    } catch (e) {
        console.error("Error approving user:", e);
    }
};

export const toggleUserVip = async (email, isVip) => {
    if (!email) return;
    try {
        const cleanEmail = email.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { isVip }, { merge: true });
    } catch (e) {
        console.error("Error toggling VIP:", e);
    }
};

export const getAllUsersData = async () => {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const users = [];
        
        userSnapshot.forEach((doc) => {
            const data = doc.data();
            const trades = data.trades || [];
            const initBal = data.initialBalance || 10000;
            const netPnL = trades.reduce((acc, t) => acc + (t.status === 'Closed' ? (parseFloat(t.pnl) || 0) : 0), 0);
            const currentBal = initBal + netPnL;
            
            users.push({
                email: data.email || doc.id,
                status: data.status || 'approved',
                isVip: data.isVip || false,
                createdAt: data.createdAt || new Date().toISOString(),
                tradesCount: trades.length,
                currentBal,
                netPnL
            });
        });
        
        return users.sort((a, b) => b.currentBal - a.currentBal);
    } catch (e) {
        console.error("Error fetching all users:", e);
        return [];
    }
};

// ฟังก์ชันจำลอง AI ในการวิเคราะห์คุณภาพการเทรด (⚡ AI Assess)
export const simulateAIAssessment = (trade) => {
    const entry = parseFloat(trade.entryPrice);
    const sl = parseFloat(trade.stopLoss);
    const exit = parseFloat(trade.actualExitPrice);
    const dir = trade.direction;
    const scorePlan = trade.planAdherenceScore;
    const scoreContext = parseInt(trade.contextScore) || 5;
    const planName = trade.planId || 'ไม่ได้ระบุแผน';
    const setup = trade.setupName || 'ไม่ได้ระบุท่าเทรด';
    const mood = trade.entryMood || 'ไม่ได้ระบุอารมณ์';

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

    if (scorePlan === 100) aiScore += 2;
    else if (scorePlan === 0) aiScore -= 2;

    if (scoreContext >= 8) aiScore += 1;
    else if (scoreContext <= 4) aiScore -= 1;

    if (mood.includes('FOMO') || mood.includes('Revenge') || mood.includes('Overconfident')) {
        aiScore -= 2;
    } else if (mood.includes('Calm')) {
        aiScore += 1;
    }

    if (isWin) {
        aiScore += 1;
        if (calculatedRR >= 2) aiScore += 1;
    } else {
        if (Math.abs(calculatedRR) > 1.2) aiScore -= 1; // ขาดทุนเกินจุด SL
    }

    // จำกัดขอบเขตคะแนน 1-10
    aiScore = Math.max(1, Math.min(10, aiScore));
    // สร้าง Feedback ภาษาไทยตามเงื่อนไขใหม่ที่ผูกกับ Mood และ Setup
    let contextStr = `\n[ ท่าเทรด: ${setup} | อารมณ์: ${mood} ]\n`;

    if (scorePlan === 100) {
        if (isWin) {
            feedback = `🌟 ยอดเยี่ยมมาก! การเทรดด้วยแผน "${planName}" ครั้งนี้ทำตามระบบ 100% ควบคู่กับสภาพตลาดที่เอื้ออำนวย ได้กำไร ${calculatedRR.toFixed(2)} RR วินัยระดับนี้จะสร้างความมั่งคั่งได้แน่นอนครับ${contextStr}`;
        } else {
            feedback = `👍 ขาดทุนแต่สมบูรณ์แบบ! แม้ไม้นี้จะแพ้ไป แต่วินัย 100% ในแผน "${planName}" คือเกราะคุ้มกันที่ทรงพลังที่สุด การตัดขาดทุนตรงเวลาคือหัวใจของการอยู่รอด${contextStr}`;
        }
    } else if (scorePlan === 50) {
        if (isWin) {
            feedback = `⚠️ กำไรแต่อันตราย! คุณทำตามแผน "${planName}" ได้เพียงครึ่งเดียว อาจมีอาการลังเลหรือข้ามเช็คลิสต์บางอย่างไป ควรกลับไปทบทวนเพื่อลดความเสี่ยงในครั้งหน้า${contextStr}`;
        } else {
            feedback = `❌ ความล้มเหลวจากการไร้วินัย! ออเดอร์นี้หลุดเช็คลิสต์ของแผน "${planName}" ไปเยอะ ทำให้เกิดความเสียหายขึ้น ควรควบคุมตัวเองให้ดีขึ้นกว่านี้${contextStr}`;
        }
    } else {
        if (isWin) {
            feedback = `🚨 ดวงดีเท่านั้น! การที่คุณเข้ามาเทรดโดยไร้แผนและแหกกฎ 100% แล้วได้กำไร ถือเป็นโชคร้ายระยะยาว เพราะมันจะหล่อหลอมนิสัยเสีย ระวังการเข้าด้วยท่า "${setup}" แบบไร้แผนจะทำให้พอร์ตพังในที่สุด${contextStr}`;
        } else {
            feedback = `🚨 พังพินาศจากการใช้อารมณ์! นี่คือผลลัพธ์ของการเทรดนอกแผน 100% ความพ่ายแพ้ครั้งนี้ควรเป็นบทเรียนให้คุณเลิกใช้อารมณ์นำทางเด็ดขาด${contextStr}`;
        }
    }

    return { aiScore, aiFeedback: feedback };
};

export const subscribeToUserData = (email, callback) => {
    if (!email) return () => {};
    const cleanEmail = email.trim().toLowerCase();
    const userRef = doc(db, 'users', cleanEmail);
    
    return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                trades: data.trades || [],
                initialBalances: data.initialBalances || (data.initialBalance !== undefined ? { 'default': data.initialBalance } : { 'default': 10000 }),
                targetRR: data.targetRR !== undefined ? data.targetRR : 20,
                profile: { name: cleanEmail.split('@')[0], photo: '', fontSize: 'normal', ...data.profile },
                plans: data.plans || [],
                dividends: data.dividends || [],
                fundingHistory: data.fundingHistory || [],
                accounts: data.accounts || [{ id: 'default', name: 'Main Account' }],
                isVip: data.isVip || false,
                status: data.status || 'approved',
                feedPosts: data.feedPosts || []
            });
            
            // Sync fallback local storage just in case it's needed offline later
            try {
                if (data.trades) localStorage.setItem(`phudit_trades_${cleanEmail}`, JSON.stringify(data.trades));
                if (data.initialBalances) localStorage.setItem(`phudit_balance_${cleanEmail}`, JSON.stringify(data.initialBalances));
                if (data.targetRR !== undefined) localStorage.setItem(`phudit_rr_${cleanEmail}`, data.targetRR.toString());
                if (data.profile) localStorage.setItem(`phudit_profile_${cleanEmail}`, JSON.stringify(data.profile));
                if (data.plans) localStorage.setItem(`phudit_plans_${cleanEmail}`, JSON.stringify(data.plans));
                if (data.dividends) localStorage.setItem(`phudit_dividends_${cleanEmail}`, JSON.stringify(data.dividends));
                if (data.fundingHistory) localStorage.setItem(`phudit_funding_${cleanEmail}`, JSON.stringify(data.fundingHistory));
                if (data.accounts) localStorage.setItem(`phudit_accounts_${cleanEmail}`, JSON.stringify(data.accounts));
                if (data.feedPosts) localStorage.setItem(`phudit_feed_${cleanEmail}`, JSON.stringify(data.feedPosts));
            } catch (e) {}
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error in onSnapshot:", error);
    });
};

// --- Feed Posts Storage ---
export const getStoredFeedPosts = async (email) => {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    let fbData = null;
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().feedPosts) {
            fbData = docSnap.data().feedPosts;
        }
    } catch (e) {
        console.error("Error fetching feed posts from Firebase:", e);
    }
    
    if (fbData) return fbData;
    
    try {
        const local = localStorage.getItem(`phudit_feed_${cleanEmail}`);
        if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
};

export const saveFeedPosts = async (email, feedPosts) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_feed_${cleanEmail}`, JSON.stringify(feedPosts));
    } catch (e) {}
    
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { feedPosts }, { merge: true });
    } catch (e) {}
};

// --- Storage Calculation ---
export const calculateStorageUsage = async (email) => {
    if (!email) return 0;
    const cleanEmail = email.trim().toLowerCase();
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const dataStr = JSON.stringify(docSnap.data());
            return dataStr.length; // Approximate size in bytes
        }
    } catch (e) {}
    return 0;
};
