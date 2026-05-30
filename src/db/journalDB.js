import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, onSnapshot, writeBatch, deleteField } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';

// ตารางยศและข้อจำกัดของพอร์ต
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

// ==========================================
// MIGRATION SCRIPT (Runs once on login)
// ==========================================
export const migrateDataToSubcollections = async (email) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const userRef = doc(db, 'users', cleanEmail);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        const arraysToMigrate = ['trades', 'plans', 'feedPosts', 'dividends', 'fundingHistory'];
        let needsMigration = false;
        
        for (const key of arraysToMigrate) {
            if (data[key] && Array.isArray(data[key]) && data[key].length > 0) {
                needsMigration = true;
                break;
            }
        }
        
        if (!needsMigration) return;
        
        console.log("Migrating legacy array data to Subcollections...");
        let batch = writeBatch(db);
        let opCount = 0;
        
        for (const key of arraysToMigrate) {
            if (data[key] && Array.isArray(data[key])) {
                for (const item of data[key]) {
                    const itemId = item.id ? String(item.id) : Date.now().toString() + Math.random().toString();
                    const itemRef = doc(db, 'users', cleanEmail, key, itemId);
                    batch.set(itemRef, { ...item, id: itemId });
                    opCount++;
                    
                    if (opCount >= 450) {
                        await batch.commit();
                        batch = writeBatch(db);
                        opCount = 0;
                    }
                }
            }
        }
        
        if (opCount > 0) await batch.commit();
        
        // Delete old arrays from the main document to free up the 1MB limit
        const updates = {};
        arraysToMigrate.forEach(key => {
            if (data[key] !== undefined) updates[key] = deleteField();
        });
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(userRef, updates);
        }
        console.log("Migration Complete.");
    } catch (error) {
        console.error("Migration Failed:", error);
    }
};

// ==========================================
// SUBCOLLECTION SYNC LOGIC
// ==========================================
const syncArrayToSubcollection = async (email, colName, itemsArray) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // Fallback Local Storage
    try {
        localStorage.setItem(`phudit_${colName}_${cleanEmail}`, JSON.stringify(itemsArray));
    } catch (e) {}

    try {
        const colRef = collection(db, 'users', cleanEmail, colName);
        const snapshot = await getDocs(colRef);
        
        const existingIds = new Set();
        snapshot.forEach(doc => existingIds.add(doc.id));
        
        const newIds = new Set();
        
        let batch = writeBatch(db);
        let opCount = 0;
        
        const commitBatch = async () => {
            if (opCount > 0) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        };

        for (const item of itemsArray) {
            const itemId = item.id ? String(item.id) : Date.now().toString() + Math.random().toString();
            newIds.add(itemId);
            
            const docRef = doc(db, 'users', cleanEmail, colName, itemId);
            batch.set(docRef, { ...item, id: itemId });
            opCount++;
            if (opCount >= 450) await commitBatch();
        }
        
        for (const id of existingIds) {
            if (!newIds.has(id)) {
                const docRef = doc(db, 'users', cleanEmail, colName, id);
                batch.delete(docRef);
                opCount++;
                if (opCount >= 450) await commitBatch();
            }
        }
        
        await commitBatch();
    } catch (e) {
        console.error(`Error syncing ${colName}:`, e);
    }
};

export const saveTrades = (email, items) => syncArrayToSubcollection(email, 'trades', items);
export const savePlans = (email, items) => syncArrayToSubcollection(email, 'plans', items);
export const saveFeedPosts = (email, items) => syncArrayToSubcollection(email, 'feedPosts', items);
export const saveDividends = (email, items) => syncArrayToSubcollection(email, 'dividends', items);
export const saveFundingHistory = (email, items) => syncArrayToSubcollection(email, 'fundingHistory', items);

// ==========================================
// REAL-TIME DATA SUBSCRIPTION
// ==========================================
export const subscribeToUserData = (email, callback) => {
    if (!email) return () => {};
    const cleanEmail = email.trim().toLowerCase();
    
    // Initial State
    const state = {
        trades: [],
        plans: [],
        feedPosts: [],
        dividends: [],
        fundingHistory: [],
        initialBalances: { 'default': 10000 },
        targetRR: 20,
        profile: { name: cleanEmail.split('@')[0], photo: '', fontSize: 'normal' },
        accounts: [{ id: 'default', name: 'Main Account' }],
        isVip: false,
        status: 'approved'
    };

    let isNotifying = false;
    const notify = () => {
        if (isNotifying) return;
        isNotifying = true;
        setTimeout(() => {
            callback({ ...state });
            isNotifying = false;
        }, 100); // Debounce to prevent multiple re-renders
    };

    // 1. Listen to Main Document (Configs)
    const unsubUser = onSnapshot(doc(db, 'users', cleanEmail), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            state.initialBalances = data.initialBalances || { 'default': 10000 };
            state.targetRR = data.targetRR !== undefined ? data.targetRR : 20;
            state.profile = { ...state.profile, ...data.profile };
            state.accounts = data.accounts || [{ id: 'default', name: 'Main Account' }];
            state.isVip = data.isVip || false;
            state.status = data.status || 'approved';
        }
        notify();
    });

    // 2. Listen to Subcollections
    const listenCol = (colName, stateKey, oldLocalKey) => {
        let isFirstLoad = true;
        let recoveredItems = null;

        return onSnapshot(collection(db, 'users', cleanEmail, colName), (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push(doc.data()));
            
            // LOCAL STORAGE RECOVERY MECHANISM
            // If Firebase subcollection is empty, but the old LocalStorage has data, recover it!
            if (isFirstLoad && items.length === 0) {
                try {
                    const localData = localStorage.getItem(`${oldLocalKey}_${cleanEmail}`);
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                            console.log(`Recovering ${colName} from LocalStorage...`);
                            recoveredItems = parsed;
                            // Write to the new Subcollection in the background
                            syncArrayToSubcollection(cleanEmail, colName, parsed);
                        }
                    }
                } catch (e) {
                    console.error("Recovery failed for", colName, e);
                }
            }
            isFirstLoad = false;

            // Prevent empty server snapshots from hiding the data before sync finishes
            if (items.length === 0 && recoveredItems) {
                items.push(...recoveredItems);
            }

            // Sort items descending by ID or timestamp if possible
            if (stateKey === 'trades' || stateKey === 'feedPosts') {
                 items.sort((a, b) => {
                    const idA = a.id ? a.id.toString() : '';
                    const idB = b.id ? b.id.toString() : '';
                    return idB.localeCompare(idA);
                 });
            }
            state[stateKey] = items;
            notify();
        });
    };

    const unsubTrades = listenCol('trades', 'trades', 'phudit_trades');
    const unsubPlans = listenCol('plans', 'plans', 'phudit_plans');
    const unsubFeed = listenCol('feedPosts', 'feedPosts', 'phudit_feed');
    const unsubDivs = listenCol('dividends', 'dividends', 'phudit_dividends');
    const unsubFunding = listenCol('fundingHistory', 'fundingHistory', 'phudit_funding');

    // Trigger Migration if needed
    migrateDataToSubcollections(cleanEmail);

    return () => {
        unsubUser();
        unsubTrades();
        unsubPlans();
        unsubFeed();
        unsubDivs();
        unsubFunding();
    };
};


// ==========================================
// CONFIGURATIONS (Saved to Main Document)
// ==========================================
const updateMainDoc = async (email, data) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
        const userRef = doc(db, 'users', cleanEmail);
        await setDoc(userRef, data, { merge: true });
    } catch (e) {}
};

export const saveInitialBalance = (email, initialBalances) => {
    updateMainDoc(email, { initialBalances });
    try { localStorage.setItem(`phudit_balance_${email.toLowerCase()}`, JSON.stringify(initialBalances)); } catch (e) {}
};

export const saveTargetRR = (email, targetRR) => {
    updateMainDoc(email, { targetRR });
    try { localStorage.setItem(`phudit_rr_${email.toLowerCase()}`, targetRR.toString()); } catch (e) {}
};

export const saveProfile = (email, profile) => {
    updateMainDoc(email, { profile });
    try { localStorage.setItem(`phudit_profile_${email.toLowerCase()}`, JSON.stringify(profile)); } catch (e) {}
};

export const saveAccounts = (email, accounts) => {
    updateMainDoc(email, { accounts });
    try { localStorage.setItem(`phudit_accounts_${email.toLowerCase()}`, JSON.stringify(accounts)); } catch (e) {}
};

// ==========================================
// STORAGE CALCULATION
// ==========================================
export const calculateStorageUsage = async (email) => {
    // With Subcollections and Firebase Storage, the 1MB Firestore limit is no longer an issue!
    // This function can now return 0 or calculate the local storage usage as a metric.
    if (!email) return 0;
    try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('phudit_')) {
                total += localStorage.getItem(key).length;
            }
        }
        return total;
    } catch (e) {
        return 0;
    }
};

// ==========================================
// AUTHENTICATION & ADMIN
// ==========================================
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

export const loginUser = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
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

export const registerUser = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Default initial data structure
    await setDoc(doc(db, 'users', email.trim().toLowerCase()), {
        profile: { name: displayName, photo: '', fontSize: 'normal' },
        initialBalances: { 'default': 10000 },
        targetRR: 20,
        accounts: [{ id: 'default', name: 'Main Account' }],
        status: 'pending',
        isVip: false
    });
    
    await signOut(auth);
    return user;
};

export const logoutUser = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const getUserStatus = async (email) => {
    if (!email) return 'unauthorized';
    if (email === 'phudit.mahawongsanan@gmail.com') return 'approved'; // Owner
    
    try {
        const userRef = doc(db, 'users', email.trim().toLowerCase());
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data().status || 'pending';
        }
    } catch (e) {}
    return 'pending';
};

export const getUserVipStatus = async (email) => {
    if (!email) return false;
    if (email === 'phudit.mahawongsanan@gmail.com') return true; // Owner is always VIP
    
    try {
        const userRef = doc(db, 'users', email.trim().toLowerCase());
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data().isVip || false;
        }
    } catch (e) {}
    return false;
};

export const approveUser = async (email) => {
    const userRef = doc(db, 'users', email.toLowerCase());
    await updateDoc(userRef, { status: 'approved' });
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
            // Fallbacks for data that might have moved to subcollections
            const initBal = data.initialBalance || 10000;
            
            users.push({
                email: data.email || doc.id,
                status: data.status || 'approved',
                isVip: data.isVip || false,
                createdAt: data.createdAt || new Date().toISOString(),
                tradesCount: data.trades ? data.trades.length : 0, // Migrated users will show 0 here unfortunately unless we fetch subcollections
                currentBal: initBal, // Can't accurately calc without fetching trades subcollection
                netPnL: 0
            });
        });
        
        return users;
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
