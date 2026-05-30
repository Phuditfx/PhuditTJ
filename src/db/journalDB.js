import { supabase } from '../supabaseClient';

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

// No longer needed in Supabase as data is structured properly, but kept for compatibility
export const migrateDataToSubcollections = async () => {};

// ==========================================
// DB SYNC LOGIC
// ==========================================
const syncArrayToTable = async (email, tableName, itemsArray) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // Fallback Local Storage
    try {
        localStorage.setItem(`phudit_${tableName}_${cleanEmail}`, JSON.stringify(itemsArray));
    } catch (e) {}

    try {
        const { data: existingData } = await supabase.from(tableName).select('id').eq('email', cleanEmail);
        const existingIds = new Set(existingData?.map(d => d.id) || []);
        const newIds = new Set();
        
        const upsertPromises = itemsArray.map(item => {
            const itemId = item.id ? String(item.id) : Date.now().toString() + Math.random().toString();
            newIds.add(itemId);
            
            const cleanItem = { ...item };
            if (tableName === 'feed_posts' && cleanItem.blocks) {
                cleanItem.blocks = cleanItem.blocks.map(b => {
                    const nb = { ...b };
                    if (nb.base64 && nb.base64.length > 800000) delete nb.base64;
                    return nb;
                });
            }
            return supabase.from(tableName).upsert({ id: itemId, email: cleanEmail, data: cleanItem });
        });

        await Promise.all(upsertPromises);
        
        // Delete items removed from array
        const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
        if (idsToDelete.length > 0) {
            await supabase.from(tableName).delete().in('id', idsToDelete);
        }
    } catch (e) {
        console.error(`Error syncing ${tableName}:`, e);
    }
};

export const saveTrades = (email, items) => syncArrayToTable(email, 'trades', items);
export const savePlans = (email, items) => syncArrayToTable(email, 'plans', items);
export const saveFeedPosts = (email, items) => syncArrayToTable(email, 'feed_posts', items);
export const saveDividends = (email, items) => syncArrayToTable(email, 'dividends', items);
export const saveFundingHistory = (email, items) => syncArrayToTable(email, 'funding_history', items);

// ==========================================
// GLOBAL FEED POSTS
// ==========================================
export const subscribeToGlobalFeed = (callback) => {
    const fetchPosts = async () => {
        const { data } = await supabase.from('global_feed_posts').select('data').order('created_at', { ascending: false });
        if (data) callback(data.map(d => d.data));
    };
    fetchPosts();

    const channel = supabase.channel('global_feed_posts_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'global_feed_posts' }, payload => {
            fetchPosts();
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const addGlobalFeedPost = async (post) => {
    try {
        await supabase.from('global_feed_posts').upsert({ id: post.id, data: post });
    } catch (e) {
        console.error("Error adding global feed post:", e);
    }
};

// ==========================================
// REAL-TIME DATA SUBSCRIPTION
// ==========================================
export const subscribeToUserData = (email, callback) => {
    if (!email) return () => {};
    const cleanEmail = email.trim().toLowerCase();
    
    const state = {
        trades: [],
        plans: [],
        dividends: [],
        fundingHistory: [],
        initialBalances: { 'default': 10000 },
        targetRR: 20,
        profile: { name: cleanEmail.split('@')[0], photo: '', fontSize: 'normal' },
        accounts: [{ id: 'default', name: 'Main Account' }],
        isVip: false,
        status: 'approved' // default to approved for migration
    };

    let isNotifying = false;
    const notify = () => {
        if (isNotifying) return;
        isNotifying = true;
        setTimeout(() => {
            callback({ ...state });
            isNotifying = false;
        }, 100);
    };

    const fetchConfig = async () => {
        const { data } = await supabase.from('users').select('*').eq('email', cleanEmail).single();
        if (data) {
            state.initialBalances = data.initialBalances || { 'default': 10000 };
            state.targetRR = data.targetRR !== undefined ? data.targetRR : 20;
            state.profile = { ...state.profile, ...data.profile };
            state.accounts = data.accounts || [{ id: 'default', name: 'Main Account' }];
            state.isVip = data.isVip || false;
            state.status = data.status || 'approved';
            notify();
        } else {
             // User document might not exist if just signed up, let's create it
             await supabase.from('users').upsert({
                email: cleanEmail,
                profile: state.profile,
                initialBalances: state.initialBalances,
                targetRR: state.targetRR,
                accounts: state.accounts,
                status: 'approved',
                isVip: false
            });
            notify();
        }
    };

    const fetchSubData = async (tableName, stateKey) => {
        const { data } = await supabase.from(tableName).select('data').eq('email', cleanEmail);
        if (data) {
            let items = data.map(d => d.data);
            if (stateKey === 'trades' || stateKey === 'feedPosts') {
                items.sort((a, b) => {
                    const idA = a.id ? a.id.toString() : '';
                    const idB = b.id ? b.id.toString() : '';
                    return idB.localeCompare(idA);
                });
            }
            state[stateKey] = items;
            notify();
        }
    };

    const loadAll = async () => {
        await fetchConfig();
        await fetchSubData('trades', 'trades');
        await fetchSubData('plans', 'plans');
        await fetchSubData('dividends', 'dividends');
        await fetchSubData('funding_history', 'fundingHistory');
    };

    loadAll();

    // Setup Realtime for this user's data
    const channel = supabase.channel(`user_data_${cleanEmail}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `email=eq.${cleanEmail}` }, () => fetchConfig())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `email=eq.${cleanEmail}` }, () => fetchSubData('trades', 'trades'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `email=eq.${cleanEmail}` }, () => fetchSubData('plans', 'plans'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dividends', filter: `email=eq.${cleanEmail}` }, () => fetchSubData('dividends', 'dividends'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'funding_history', filter: `email=eq.${cleanEmail}` }, () => fetchSubData('funding_history', 'fundingHistory'))
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// ==========================================
// CONFIGURATIONS
// ==========================================
const updateMainDoc = async (email, data) => {
    if (!email) return;
    try {
        await supabase.from('users').update(data).eq('email', email.trim().toLowerCase());
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

export const calculateStorageUsage = async (email) => {
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
    const { data } = await supabase.from('users').select('email').eq('email', email.trim().toLowerCase()).single();
    return !!data;
};

export const loginUser = async (email, password) => {
    // Attempt login. If migrated user but no Auth account yet, fallback to signup.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.includes('Invalid login credentials')) {
        // Try creating account on the fly if it's a migrated user
        const exists = await checkUserExists(email);
        if (exists) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw signUpError;
            return signUpData.user;
        }
        throw error;
    }
    return data.user;
};

export const verifyUser = async (email, password) => {
    if (!email || !password) return { success: false, error: 'Email and password are required' };
    try {
        const cleanEmail = email.trim().toLowerCase();
        let user;
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        
        if (error) {
             const exists = await checkUserExists(cleanEmail);
             if (exists && error.message.includes('Invalid login credentials')) {
                 const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password });
                 if (signUpError) return { success: false, error: signUpError.message };
                 user = signUpData.user;
             } else {
                 return { success: false, error: error.message };
             }
        } else {
            user = data.user;
        }
        
        const { data: userData } = await supabase.from('users').select('status').eq('email', cleanEmail).single();
        if (cleanEmail !== 'phudit.mahawongsanan@gmail.com' && userData && userData.status === 'pending') {
            await supabase.auth.signOut();
            return { success: false, error: '⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ' };
        }
        
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const registerUser = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    const finalDisplayName = displayName || email.split('@')[0];
    await supabase.from('users').upsert({
        email: email.trim().toLowerCase(),
        profile: { name: finalDisplayName, photo: '', fontSize: 'normal' },
        initialBalances: { 'default': 10000 },
        targetRR: 20,
        accounts: [{ id: 'default', name: 'Main Account' }],
        status: 'pending',
        isVip: false
    });
    
    await supabase.auth.signOut();
    return data.user;
};

export const logoutUser = () => supabase.auth.signOut();
export const resetPassword = (email) => supabase.auth.resetPasswordForEmail(email);

export const getUserStatus = async (email) => {
    if (!email) return 'unauthorized';
    if (email === 'phudit.mahawongsanan@gmail.com') return 'approved';
    const { data } = await supabase.from('users').select('status').eq('email', email.trim().toLowerCase()).single();
    return data?.status || 'pending';
};

export const getUserVipStatus = async (email) => {
    if (!email) return false;
    if (email === 'phudit.mahawongsanan@gmail.com') return true;
    const { data } = await supabase.from('users').select('isVip').eq('email', email.trim().toLowerCase()).single();
    return data?.isVip || false;
};

export const approveUser = async (email) => {
    await supabase.from('users').update({ status: 'approved' }).eq('email', email.toLowerCase());
};

export const deleteUser = async (email) => {
    if (!email) return;
    await supabase.from('users').delete().eq('email', email.trim().toLowerCase());
};

export const toggleUserVip = async (email, isVip) => {
    if (!email) return;
    await supabase.from('users').update({ isVip }).eq('email', email.trim().toLowerCase());
};

export const getAllUsersData = async () => {
    try {
        const { data: users } = await supabase.from('users').select('*');
        if (!users) return [];
        
        return users.map(data => ({
            email: data.email,
            status: data.status || 'approved',
            isVip: data.isVip || false,
            createdAt: data.created_at,
            tradesCount: 0, 
            currentBal: 10000, 
            netPnL: 0
        }));
    } catch (e) {
        return [];
    }
};

// AI Assessment (Logic remains unchanged)
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
        if (Math.abs(calculatedRR) > 1.2) aiScore -= 1;
    }

    aiScore = Math.max(1, Math.min(10, aiScore));
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
