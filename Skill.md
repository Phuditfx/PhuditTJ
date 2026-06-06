# 🛠 Technical Skills & Architecture: PDTJ (Phudit Trading Journal)

เอกสารฉบับนี้รวบรวมทักษะทางเทคนิค สถาปัตยกรรมระบบ และตรรกะทางธุรกิจ (Business Logic) ที่ใช้ในการพัฒนาโปรเจกต์ PDTJ ซึ่งเป็นเว็บแอปพลิเคชันสำหรับการบันทึกการเทรด การลงทุน และการจัดการความเสี่ยงแบบครบวงจร

## 💻 Tech Stack & Core Technologies
- **Frontend Framework:** React.js (Next.js / Vite)
- **Styling & UI:** Tailwind CSS (Mobile-first, Responsive Design, Dark Mode)
- **State Management:** React Context API / Custom Hooks / React Query
- **Data Visualization:** Recharts / TradingView Lightweight Charts (สำหรับการวาดกราฟ OHLC และ Markers)
- **API Integration:** RESTful APIs, Yahoo Finance API (US Stocks), Binance API (Crypto)

---

## 🧠 Core Competencies & Business Logic

### 1. Quantitative Trading & Risk Management Algorithms
- **Dynamic Position Sizing:** พัฒนาระบบคำนวณขนาดไม้เทรด (Shares to Buy) อัตโนมัติ โดยอิงจาก Total Capital, Risk Per Trade (%) และระยะ Stop Loss
- **ATR-Based Stop Loss (AI SL):** สร้างฟังก์ชันคำนวณความผันผวนของตลาด (Average True Range - ATR14) จากข้อมูล OHLC ย้อนหลังบน Timeframe 60m เพื่อหาจุดตัดขาดทุนแบบไดนามิก
- **Budget Check System:** ระบบตรวจสอบและเปรียบเทียบเงินทุนที่ต้องใช้จริงกับเงินทุนในพอร์ต เพื่อป้องกันการ Over-leverage

### 2. Advanced Portfolio Architecture (Trade vs. Invest)
- **Swing Trade Journal (TI Weekly Planner):** สถาปัตยกรรมการบันทึกข้อมูลแบบจบในรอบเดียว (1-Buy / 1-Sell) พร้อมระบบ Tracking Hit Rate, Win Rate และ Sector Performance
- **Long-Term Investment System (Alpha Picks):** สถาปัตยกรรมข้อมูลแบบสะสม (Accumulation) ที่รองรับ:
  - การทำ Dollar-Cost Averaging (DCA)
  - การคำนวณต้นทุนเฉลี่ยใหม่ (New Average Cost) เมื่อมีการซื้อเพิ่ม
  - การบันทึกการแบ่งขาย (Partial Selling) และคำนวณ Realized PnL อย่างแม่นยำ

### 3. Interactive Data Visualization
- **Dynamic Charting:** การดึงข้อมูล Historical Data มาพล็อตเป็นกราฟแท่งเทียน (Candlestick) 
- **Custom Chart Markers:** การคำนวณและวาดเส้น Horizontal Lines (Entry, SL) และลูกศรชี้จุดเข้าเทรด (Date Pointer) ลงบนกราฟแบบ Interactive
- **Analytics Dashboard:** การสรุปผลข้อมูลเชิงลึก เช่น Trigger Rate, Win Rate by Sector และ Performance by Float Size

### 4. Role-Based Access Control (RBAC) & Security
- **Tier-Based Access:** การแบ่งแยกสิทธิ์การเข้าถึงระหว่างผู้ใช้ทั่วไป (Normal User) และผู้ใช้วีไอพี (VIP User)
- **Feature Toggling:** การล็อกฟีเจอร์ขั้นสูง (Real-time feeds, AI Tools) และแสดงหน้าต่าง Upgrade สำหรับผู้ใช้ทั่วไป
- **Role-Based UI:** แถบเมนูนำทาง (Bottom Navigation) ที่ปรับเปลี่ยนแบบไดนามิกตาม Role ของผู้ใช้งาน (เฉพาะบนมือถือ/แท็บเล็ต)

### 5. UI/UX & Responsive Engineering
- **Viewport Optimization:** การจัดการ Overflow และ Scaling ป้องกันปัญหาหน้าจอล้นบนอุปกรณ์ Mobile/Tablet
- **Interactive Modals & Lightbox:** ระบบแสดงรูปภาพแบบ Full-screen และหน้าต่าง Popup ที่ลื่นไหล
- **Feed Composer:** การออกแบบ UI สำหรับการโพสต์ข้อความและรูปภาพที่ขยายพื้นที่อัตโนมัติตามเนื้อหา

### 6. GITHUB WORKFLOW (MANDATORY)
After I explicitly approve your code, and after we verify that the implementation works perfectly without breaking any existing features:
- Please provide the exact terminal commands to stage, commit, and push these changes to GitHub.
- Use a descriptive commit message explaining what was added or fixed in this session.

---

## ⚙️ Development Best Practices
- **Separation of Concerns (SoC):** แยก Logic การคำนวณคณิตศาสตร์ที่ซับซ้อนออกจาก UI Components
- **CORS Handling & Proxy:** เทคนิคการดึงข้อมูลจาก External Financial APIs โดยไม่ติดปัญหา Cross-Origin Resource Sharing
- **Extensible Database Schema:** การออกแบบฐานข้อมูลตาราง `Transactions` และ `Positions` ให้รองรับการขยายฟีเจอร์ในอนาคตโดยไม่กระทบข้อมูลเก่า

## 🔄 Version Control & CI/CD Workflow
- **Continuous Integration Habit:** มีกระบวนการทดสอบและตรวจสอบโค้ด (Code Verification & Regression Testing) อย่างเคร่งครัดหลังจากการเพิ่มฟีเจอร์หรือแก้ไขบั๊กทุกครั้ง
- **Strict Git Flow:** บังคับใช้นโยบาย Commit และ Push ซอร์สโค้ดขึ้น GitHub ทันทีเมื่อระบบทำงานได้อย่างสมบูรณ์ เพื่อสร้าง Checkpoint ป้องกันข้อมูลสูญหาย และพร้อมสำหรับการ Rollback หากเกิดข้อผิดพลาดในอนาคต
- **Descriptive Commits:** บันทึกประวัติการแก้ไขโค้ดด้วยข้อความที่ชัดเจน เพื่อให้ง่ายต่อการติดตามการเติบโตของโปรเจกต์ (Version Tracking)