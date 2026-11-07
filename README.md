# 家庭公費記帳

給長輩用的家庭公費記帳網頁：記錄每月誰交了公費、花了什麼、誰先墊錢。

- 前端：Vue 3 + TypeScript + Vite，部署在 GitHub Pages
- 資料：Supabase（Postgres + 登入）
- 沒設定 Supabase 時自動進入「示範模式」（假資料，重新整理就還原）

## 本機預覽

```bash
npm install
npm run dev        # 開 http://localhost:5173 ，沒有 .env 就是示範模式
npm test           # 單元測試
npm run build      # 型別檢查 + 打包
```

## 上線步驟

### 1. Supabase
免費方案最多 2 個使用中的專案，所以跟麻將共用 `mahjong_score` 專案（已在 supabase-keepalive 保活名單內）。
資料表都加 `meal_` 前綴，權限只開給全家共用帳號，麻將的帳號讀不到這本帳。

1. 把 `supabase/schema.sql` 貼到 **SQL Editor**，**先把 `meal_is_family()` 裡的佔位字串 `family@example.com` 換成真正的全家共用帳號 email** 再執行。
   repo 是公開的，所以真正的 email 只存在 Supabase，不寫進程式碼；忘了換的話誰都讀不到資料。
2. 接著執行 `supabase/seed_members.sql`（預設爸爸、媽媽、姐姐、弟弟，之後在網頁上就能改）。
3. **Authentication → Users → Add user → Create new user**：email 填同一個，設一組新密碼（10 字以上、英數混合，不要用 Gmail 的密碼），勾選 **Auto Confirm User**。
4. **Authentication → Sign In / Providers**：確認 **Allow new users to sign up** 是關閉的。
   ⚠️ anon key 會公開在網頁裡，開著的話任何人都能自己註冊。
5. **Project Settings → API**：記下 Project URL 與 anon key。

### 2. GitHub
1. 把專案推上 GitHub（`main` 分支）。
2. **Settings → Pages → Source** 選 **GitHub Actions**。
3. **Settings → Secrets and variables → Actions** 新增兩個 secret：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 推送到 `main` 就會自動測試、打包、部署。

### 3. 給長輩
打開網址 → 輸入帳號和密碼一次（建議由你幫每支手機登入）→ 用手機瀏覽器「加入主畫面」，之後點圖示就能用。
網頁裡不內建帳號，有心人打開網頁也只看到空白的登入框。

## 記帳規則（跟手寫帳本一樣）

| 情況 | 餘額 | 代墊款 |
|---|---|---|
| 成員繳費／其他收入 | ＋ | 自動先歸還未還的代墊（最早的先還，不夠就部分歸還） |
| 餐費「公費支付」，公費現金足夠 | − | |
| 餐費「公費支付」，公費現金不足 | −（整筆扣） | 不足的部分記為所選成員代墊 |
| 餐費「某人代墊」（整筆先刷卡） | −（整筆扣） | 整筆記為該成員代墊 |

餘額 = 所有收入 − 所有支出（跟手寫帳本一樣，代墊當下就扣）＝ 公費現金 − 未還代墊。
代墊何時、由哪筆入帳歸還不存資料庫，每次照日期順序重算，所以修改或刪除任何一筆都會自動重新對帳。

- 首頁：月份與餘額卡（餘額、本月入帳、本月支出）置頂；未歸還的代墊在收支明細標示「代墊」；下方切換「收支明細」與「繳費狀況」。
- 繳費狀況：成員／應繳／實繳／差額，差額正數為多繳、負數為未繳足；應繳金額不固定的成員不計差額。下方「未歸還代墊款」依代墊人列出代墊／已還／未還。
- 餐費支出：「店家」下方列出最近店家，點一下就填好。
- 成員管理：「繳費狀況」→「成員管理」可改名稱、新增成員、設定每月應繳金額（不固定請留空）。
- 開始使用：「公費入帳」→「其他收入」，輸入期初餘額。
- 記錯了：收支明細點那一筆 →「修改」，確認視窗會列出改了什麼（例如「金額：1,000元 → 3,000元」）。
- 分享 LINE：記完或點任一筆 →「分享到 LINE」→ 選家族群組送出（免費、不用設定機器人）。

規則只實作在 `src/utils/ledgerCalc.ts`（`computeFundBalance`、`settleAdvances`），有單元測試；資料庫只存原始紀錄。

## 目錄

```
src/
├── api/            # LedgerApi 介面、Supabase 實作、示範模式實作
├── components/
│   ├── ui/         # 純展示元件（金額輸入、選項格、確認框、分享框…）
│   └── business/   # 餘額卡、收支明細、繳費狀況、未歸還代墊款
├── composables/    # 資料載入、確認流程、提示訊息
├── types/          # 型別定義
├── utils/          # 金額、日期、帳務計算、LINE 文字（純函式，有單元測試）
└── views/          # 首頁、公費入帳、餐費支出、成員管理、登入
supabase/           # 建表 SQL 與 RLS
tests/unit/         # vitest
```
