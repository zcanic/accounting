# 🏛️ Sanctuary of the Ledger (账本圣殿)

> "The ledger is balanced. The gods are pleased."
> 
> 一款融合古典美学与神圣野兽派风格的会计游戏化 Web 应用。

## 🎨 视觉与设计理念：Divine Brutalism (神圣野兽派)

本项目采用独特的 **"Divine Brutalism"** 视觉风格，旨在将枯燥的会计分录转化为一场神圣的仪式。

### 核心视觉元素
- **天空画卷 (The Sky Canvas)**: 背景采用深邃的古典油画风格蓝天，辅以动态漂浮的云层与噪点纹理，营造出文艺复兴时期的庄重感。
- **神殿立柱 (Temple Columns)**: 左右两侧矗立着带有凹槽纹理 (Fluting) 的石质立柱，构建出神殿的空间感。
- **象牙白窗口 (Ivory Window)**: 中央操作区域采用象牙白 (#FDFBEB) 大理石质感，搭配深邃的投影，如同悬浮于空中的神坛。
- **排版 (Typography)**: 
  - 标题与神谕使用 **Times New Roman** 等衬线字体，强调古典与权威。
  - 界面元素保持极简，突出文字的力量。

## 🎮 核心玩法：审判仪式

### 交互模式：点击放置 (Click-to-Place)
摒弃了传统的拖拽操作，采用更具仪式感的"点选-赐予"模式：

1. **聆听神谕**: 阅读顶部的业务场景描述（例如："企业用银行存款购买原材料"）。
2. **选择符文**: 点击底部的科目选项，选中的科目会散发金色光芒 (Selected State)。
3. **赐予天平**: 
   - 点击左侧 **借方 (Debit)** 托盘，将科目放置于借方。
   - 点击右侧 **贷方 (Credit)** 托盘，将科目放置于贷方。
4. **执行审判**: 点击 "JUDGE" (判定) 按钮。
   - **平衡 (Balanced)**: 天平归位，显示绿色神圣反馈。
   - **失衡 (Unbalanced)**: 天平倾斜，雷霆震怒，显示红色警告。

### 视觉反馈
- **天平动态**: 天平会根据借贷方数量的差异实时倾斜，物理反馈真实。
- **连胜系统**: 连续答对会触发 "Streak" 火焰效果。

## 🛠️ 技术架构

- **核心框架**: React 18 + Vite
- **样式引擎**: Tailwind CSS (大量使用自定义 Utility Classes 如 .font-divine, .bg-marble)
- **动画引擎**: Framer Motion (负责天平摆动、浮动云层、界面进出场动画)
- **图标库**: Lucide React
- **数据源**: 
  - 本地兜底数据 (src/data/scenarios.json)
  - n8n Webhook 集成 (动态获取会计题目)

## 📂 项目结构

`
src/
├── components/      # (旧组件暂存，目前主要逻辑在 App.jsx)
├── data/           # 本地题目数据
├── hooks/          # 自定义 Hooks
│   └── useQuestionQueue.js  # 题目队列管理与 n8n 数据获取
├── App.jsx         # 核心应用逻辑与 UI 实现
├── index.css       # 全局样式、自定义动画与神圣野兽派纹理
└── main.jsx        # 入口文件
`

## 🚀 快速开始

1. **安装依赖**
   `ash
   npm install
   `

2. **启动开发服务器**
   `ash
   npm run dev
   `

3. **构建生产版本**
   `ash
   npm run build
   `

## 🌟 特色功能

- **沉浸式体验**: 全屏背景动画与细腻的 UI 交互。
- **双语界面**: 关键术语保留英文 (Debit/Credit)，辅助会计英语学习。
- **智能反馈**: 错误时会显示正确的分录答案，帮助纠正记忆。

---
*Designed for the accountants who seek truth in balance.*
