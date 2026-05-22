import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

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
    
    if (fbData) return fbData;
    
    // Fallback to local storage
    try {
        const local = localStorage.getItem(`phudit_trades_${cleanEmail}`);
        if (local) return JSON.parse(local);
    } catch (e) {
        console.error("Error reading trades from LocalStorage:", e);
    }
    return [];
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

export const saveInitialBalance = async (email, balance) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        localStorage.setItem(`phudit_balance_${cleanEmail}`, balance.toString());
    } catch (e) {}

    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, { initialBalance: balance }, { merge: true });
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
        
        // ส่งอีเมลยืนยันตัวตน
        await sendEmailVerification(userCredential.user);
        
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, {
            email: cleanEmail,
            status: 'approved',
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
        
        // Sign out ทันทีหลังจากลงทะเบียน เพื่อบังคับให้ผู้ใช้ต้องยืนยันอีเมลก่อนเข้าสู่ระบบ
        await signOut(auth);
        
        return { success: true, needsVerification: true, user: userCredential.user };
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
        
        if (!user.emailVerified) {
            // ถ้ายืนยันอีเมลยังไม่สำเร็จ ให้ Sign out และแจ้งเตือน
            await signOut(auth);
            return { 
                success: false, 
                error: 'กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ (เช็คที่กล่องจดหมาย หรือ Junk/Spam)', 
                needsVerification: true,
                user: user
            };
        }
        
        return { success: true, user: user };
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        return { success: false, error: msg };
    }
};

export const sendVerificationEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
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
