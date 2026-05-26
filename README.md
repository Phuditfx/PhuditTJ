# Phudit Trade Journal (Gamified Trader Station & AI Coach)

Welcome to the **Phudit Trade Journal**, a professional, gamified trading journal and analysis platform designed for swing traders.

## 🚀 Key Features

### 1. 📊 Gamified Dashboard & Rank System
- Set your **Initial Balance** and track your real-time **Account Balance**.
- Automatic **Rank Level** progression based on your portfolio value.
- Visual progress bars and performance metrics.

### 2. ⚡ Alpha Trader (TI Swing Pick Optimizer)
- **Deep Dark Aesthetic:** Professional interface with sharp edges and neon accents.
- **TradingView Integration:** Live embedded charts defaulting to TF60 (1-hour timeframe) syncing automatically with your input ticker.
- **TI Entry Alert Tracking:** Log the Day Breakout price and compare it with your actual Custom Entry (TF60) to measure precision (Variance %).
- **Smart Calculators:** 
  - **Quick SL:** Instant Stop Loss calculation (-1%, -2%, -3%, -5%).
  - **🤖 AI Auto-SL (Beta):** Heuristic proxy swing low calculation (-2.5%).
  - **Auto-TP:** Dynamic Take Profit targets (1R, 2R, 3R) based on your Entry and SL.

### 3. 📓 Intelligent Trade Journal
- Log your trades via the **Quick Order Widget**.
- Track your Entry, Exit, SL, TP, Shares, PnL, and Actual RR.
- **Variance Tracking:** Shows whether your entry was sharper (cheaper) or more expensive compared to the Day Breakout (TI Entry).
- **AI Coach Evaluation:** Upon closing a trade, complete a quick Context Score Survey (Market Trend, Relative Strength, Setup Quality). The AI will generate a score out of 10 and provide feedback based on your plan adherence and performance.
- Export your trading history to **Excel** for further analysis.

### 4. 👑 Owner Dashboard
- Exclusive access for the system administrator (`phudit.mahawongsanan@gmail.com`) to monitor global user statistics, active users, and system-wide metrics.

## 🛠️ Technology Stack
- **Frontend:** React (Vite), TailwindCSS
- **Backend/Database:** Firebase Authentication, LocalStorage (for fast, decentralized local data saving per user)
- **Tools:** TradingView Advanced Chart Widget, XLSX for Excel exports

## 💻 Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

*Designed and optimized for professional trading performance.*
