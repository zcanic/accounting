# 🏛️ Sanctuary of the Ledger (账本圣殿)

一款交互式会计分录练习应用，通过游戏化的方式帮助学习和掌握会计分录的编制。

## 📝 项目概述

**账本圣殿**是一个基于 React + Vite 的现代 Web 应用，通过简洁优雅的交互方式让用户练习会计分录。应用采用智能题库系统，支持从远程 n8n webhook 动态获取题目，并在网络不可用时自动降级到本地题库。

### ✨ 核心特性

- **智能题库管理**：基于内容哈希的去重机制，自动补货，避免题目重复
- **双重数据源**：远程 webhook + 本地 JSON 备份，确保离线可用
- **流畅动画体验**：Framer Motion 驱动的丝滑动画效果
- **请求优化**：10秒超时、3秒节流、AbortController 取消支持
- **容错设计**：网络异常自动降级，连续 3 次空响应后使用本地备份

## 🛠️ 技术栈

### 前端框架
- **React 18.2.0** - UI 框架
- **Vite 5.0** - 构建工具和开发服务器

### UI 和动画
- **Tailwind CSS 3.3** - 样式框架
- **Framer Motion 10.16** - 动画库
- **Lucide React 0.294** - 图标库

### 开发工具
- **@vitejs/plugin-react 4.2** - React 支持
- **PostCSS + Autoprefixer** - CSS 处理

## 📂 项目结构

```
sanctuary-of-the-ledger/
├── src/
│   ├── App.jsx                      # 主应用组件 (529 行)
│   ├── main.jsx                     # 应用入口
│   ├── hooks/
│   │   └── useQuestionQueue.js      # 核心题库管理 hook (556 行)
│   ├── components/                  # UI 组件
│   │   ├── GrainBackground.jsx
│   │   ├── AccountRune.jsx
│   │   ├── BalanceScale.jsx
│   │   ├── DragContext.jsx
│   │   ├── JudgeButton.jsx
│   │   ├── OracleVoice.jsx
│   │   ├── RunePool.jsx
│   │   ├── SanityMeter.jsx
│   │   └── SuccessEffect.jsx
│   └── data/
│       └── scenarios.json           # 本地备份题库
├── public/
│   └── bg.jpg                       # 背景图片
├── index.html                       # HTML 模板
├── package.json                     # 项目配置
├── vite.config.js                   # Vite 配置
├── CLAUDE.md                        # AI 开发记录
└── README.md                        # 项目文档
```

## 🎮 核心玩法

### 交互模式：点击放置 (Click-to-Place)

1. **阅读场景**：查看业务场景描述（例如："企业用银行存款购买原材料"）
2. **选择科目**：点击底部科目按钮，选中的科目会高亮显示（琥珀色背景）
3. **放入借贷方**：
   - 点击 **借方 (Debit)** 区域 → 科目进入借方（玫瑰红底色）
   - 点击 **贷方 (Credit)** 区域 → 科目进入贷方（天蓝色底色）
4. **提交判题**：点击"提交答案"按钮
   - ✅ **正确**：绿色成功提示，1.2 秒后自动进入下一题
   - ❌ **错误**：红色错误提示，显示正确答案，可选择"下一题"或"再试一次"

### 视觉反馈

- **选中状态**：琥珀色背景 + 上移动画
- **已使用科目**：灰色背景 + 删除线 + 禁用
- **连胜系统**：连续答对显示 🔥 Streak 计数
- **加载状态**：顶部状态条显示远程/本地题库状态

## ⚙️ 核心实现：题库管理系统

### `useQuestionQueue.js` 架构解析

这是整个应用的大脑，实现了一个生产级的智能题目队列管理系统。

#### 关键配置常量

```javascript
const N8N_WEBHOOK_URL = 'http://8.138.47.26:5678/webhook/get-accounting-scenarios';
const FETCH_BATCH_SIZE = 5;          // 每次请求 5 道题
const LOW_STOCK_THRESHOLD = 2;       // 剩余 ≤2 题时触发自动补货
const MAX_EMPTY_FETCH_RETRIES = 3;   // 连续 3 次空响应后停止远程请求
const FETCH_TIMEOUT = 10000;         // 10 秒超时
const THROTTLE_INTERVAL = 3000;      // 3 秒节流间隔
const DEBUG_MODE = true;             // 调试模式开关
```

#### 核心机制详解

**1. 题目唯一性标识（去重的基石）**

```javascript
// src/hooks/useQuestionQueue.js:14-33
const generateQuestionKey = (q) => {
  // 优先使用已有 id
  if (q?.id) return `id-${q.id}`;
  if (q?._id) return `_id-${q._id}`;

  // ⚠️ 关键：基于内容生成稳定哈希（移除了时间戳！）
  const text = (q.text || q.scenario || '').trim().toLowerCase();
  const debit = Array.isArray(q.debit) ? q.debit.sort().join('|') : '';
  const credit = Array.isArray(q.credit) ? q.credit.sort().join('|') : '';

  const contentHash = `${text}|${debit}|${credit}`;
  const simpleHash = contentHash.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  return `content-${(simpleHash >>> 0).toString(36)}`;
};
```

**设计决策**：早期版本包含 `Date.now()`，导致相同题目生成不同 key 而重复出现。现已移除时间戳，确保相同内容生成相同 key。

**2. 防重复请求的四重保护**

```javascript
const isFetchingRef = useRef(false);          // 防并发请求
const lastFetchTimeRef = useRef(0);           // 节流时间戳
const abortControllerRef = useRef(null);      // 请求取消控制器
const isMountedRef = useRef(true);            // 组件卸载保护
```

**3. 超时和取消机制**

```javascript
// src/hooks/useQuestionQueue.js:44-115
const fetchQuestionsFromN8n = async (abortSignal) => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, FETCH_TIMEOUT);

  // 合并外部取消信号和超时信号
  const combinedSignal = abortSignal
    ? AbortSignal.any([abortSignal, timeoutController.signal])
    : timeoutController.signal;

  const response = await fetch(url.toString(), {
    signal: combinedSignal,
  });
  // ...
};
```

**4. 自动补货逻辑**

```javascript
// src/hooks/useQuestionQueue.js:428-457
useEffect(() => {
  const remaining = questionsRef.current.length - currentIndex - 1;

  if (remaining <= LOW_STOCK_THRESHOLD && !isLoading && !isFetchingRef.current) {
    fetchMoreQuestions();  // 内部会处理节流
  }
}, [currentIndex, isLoading, fetchMoreQuestions]);
```

**依赖项精简**：从早期的 7 个依赖项优化到 3 个，避免无限循环。

**5. 函数式状态更新（避免闭包陷阱）**

```javascript
// ✅ 正确：使用函数式更新，获取最新值
setEmptyFetchCount(prev => prev + 1);
setQuestions(prev => [...prev, ...deduped]);

// ❌ 错误：直接使用闭包变量，可能是陈旧值
setEmptyFetchCount(emptyFetchCount + 1);  // 闭包陷阱！
```

### 数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│                        初始加载                              │
├─────────────────────────────────────────────────────────────┤
│ 1. 加载本地 scenarios.json (5 题，立即可用)                 │
│ 2. 后台异步请求远程 webhook                                  │
│    ├─ 成功 → 合并去重 → 标记 hasRemoteData=true            │
│    └─ 失败 → emptyFetchCount+1                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      用户答题循环                            │
├─────────────────────────────────────────────────────────────┤
│ currentIndex → currentIndex + 1                             │
│ remaining = totalQuestions - currentIndex - 1               │
│                                                              │
│ if (remaining ≤ 2):  # 自动补货触发                         │
│   ├─ 距上次请求 < 3 秒? → 节流跳过                         │
│   ├─ emptyFetchCount > 3? → 本地补货                       │
│   └─ 否则 → 请求远程                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      远程请求处理                            │
├─────────────────────────────────────────────────────────────┤
│ 1. 创建 AbortController                                      │
│ 2. 启动 10 秒超时计时器                                      │
│ 3. fetch(url, { signal: combinedSignal })                   │
│ 4. 解析响应 extractScenarios(data)                          │
│ 5. 结果处理：                                                │
│    ├─ scenarios.length > 0:                                 │
│    │   ├─ 内容哈希去重                                      │
│    │   ├─ 新增题目 → emptyFetchCount = 0                   │
│    │   └─ 全部重复 → emptyFetchCount + 1                   │
│    └─ 空数组或失败:                                         │
│        ├─ emptyFetchCount + 1                               │
│        └─ 立即触发本地补货                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Webhook API 规范

### 请求格式

```
GET http://8.138.47.26:5678/webhook/get-accounting-scenarios
    ?count=5                # 期望返回的题目数量
    &_=1703728123456        # 缓存破坏符（时间戳）
```

### 响应格式

支持两种结构：

**结构 1：直接返回**
```json
{
  "scenarios": [
    {
      "id": "sample-001",
      "text": "企业计提本月生产车间固定资产折旧。",
      "debit": ["制造费用"],
      "credit": ["累计折旧"],
      "distractors": ["管理费用", "固定资产", "生产成本"]
    }
  ]
}
```

**结构 2：嵌套返回**
```json
{
  "output": {
    "scenarios": [ /* 同上 */ ]
  }
}
```

### 题目数据字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` / `_id` | string | 推荐 | 唯一标识符，缺失时使用内容哈希 |
| `text` / `scenario` | string | 必填 | 题目文本描述 |
| `debit` | string[] | 必填 | 正确的借方科目列表 |
| `credit` | string[] | 必填 | 正确的贷方科目列表 |
| `distractors` | string[] | 必填 | 干扰选项（错误科目） |

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173

### 生产构建

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 🐛 调试技巧

### 启用详细日志

在 `src/hooks/useQuestionQueue.js` 第 10 行设置：

```javascript
const DEBUG_MODE = true;
```

控制台将输出：
- ✅ 请求发起和响应详情
- ✅ 题目去重过程（显示跳过的重复题目）
- ✅ 节流和防重复逻辑
- ✅ 自动补货触发时机
- ✅ 所有状态变更记录

### 关键日志示例

```
[useQuestionQueue] Initial load starting
[useQuestionQueue] Loaded 5 local questions
[useQuestionQueue] Fetching questions from: http://8.138.47.26:5678/...
[useQuestionQueue] Received response: { hasData: true, scenariosCount: 5 }
[useQuestionQueue] mergeQuestions: processing 5 questions from remote
[useQuestionQueue] Question 0: key=content-abc123, text="企业用银行存款购买原材料..."
[useQuestionQueue] Skipping duplicate: content-abc123
[useQuestionQueue] mergeQuestions: 3 new questions after deduplication (2 filtered out)
[useQuestionQueue] Questions updated: 5 -> 8 total
[useQuestionQueue] Auto-fetch check: remaining=1, isLoading=false
[useQuestionQueue] Triggering auto-fetch: remaining=1 <= 2
[useQuestionQueue] Throttled: 1250ms since last fetch (need 3000ms)
```

## ⚠️ 已知问题和解决方案

### 问题 1：题目重复出现

**现象**：同样的题目在队列中出现多次。

**根本原因**：早期版本的 `generateQuestionKey` 包含 `Date.now()`，导致相同内容在不同时间生成不同的 key。

**解决方案**：移除时间戳，仅基于题目内容（text + debit + credit）生成稳定哈希。

**相关提交**：`74d3efd`

### 问题 2：请求重复发送（无限循环）

**现象**：网络面板显示短时间内发送大量重复请求。

**根本原因**：
1. useEffect 依赖项过多（7 个），状态更新触发新一轮 effect
2. 使用闭包变量而非函数式更新，导致使用陈旧值
3. 缺少组件卸载保护，异步完成时可能组件已销毁

**解决方案**：
- ✅ 使用 `useRef` 存储最新状态（`emptyFetchCountRef`, `isFetchingRef`）
- ✅ 所有状态更新改为函数式：`setState(prev => ...)`
- ✅ 精简 useEffect 依赖项：7 个 → 3 个
- ✅ 统一节流函数 `shouldThrottle()`，在所有调用路径生效
- ✅ 添加 `isMountedRef` 组件卸载保护

**相关提交**：`74d3efd`, `df90cd8`

### 问题 3：React Warning - setState on unmounted component

**现象**：控制台警告"Can't perform a React state update on an unmounted component"。

**根本原因**：异步请求完成时组件可能已卸载，但仍尝试更新状态。

**解决方案**：

```javascript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    abortControllerRef.current?.abort();  // 清理进行中的请求
  };
}, []);

// 所有异步操作后检查
if (!isMountedRef.current) return;
setQuestions(newQuestions);
```

## 📜 Git 提交历史

```
74d3efd (HEAD -> main) 修复webhook请求重复和无法及时更新的问题
df90cd8 重构题目队列逻辑，解决重复请求和界面卡住问题
1a8b1d8 Initial commit: Sanctuary of the Ledger with optimized webhook logic
```

## 💡 开发最佳实践

### useEffect 依赖项管理

```javascript
// ❌ 避免：依赖项过多，容易触发无限循环
useEffect(() => {
  // ...
}, [state1, state2, state3, state4, state5]);

// ✅ 推荐：使用 ref 存储频繁变化的值，减少依赖
const state1Ref = useRef(state1);
useEffect(() => {
  state1Ref.current = state1;
}, [state1]);

useEffect(() => {
  const value = state1Ref.current;  // 使用 ref 获取最新值
  // ...
}, [minimalDeps]);  // 仅保留必要依赖
```

### 状态更新最佳实践

```javascript
// ✅ 函数式更新：总是获取最新值
setCount(prev => prev + 1);
setItems(prev => [...prev, newItem]);

// ❌ 直接使用闭包变量：可能使用陈旧值
setCount(count + 1);  // 在异步回调中可能出错
setItems([...items, newItem]);  // 同上
```

### 异步操作规范

```javascript
const [data, setData] = useState(null);
const abortControllerRef = useRef(null);

const fetchData = async () => {
  // 1. 创建 AbortController
  abortControllerRef.current = new AbortController();

  // 2. 添加超时保护
  const timeoutId = setTimeout(() => {
    abortControllerRef.current.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      signal: abortControllerRef.current.signal
    });
    clearTimeout(timeoutId);

    // 3. 组件卸载检查
    if (!isMountedRef.current) return;

    setData(await response.json());
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
      return;
    }
    console.error(error);
  }
};

useEffect(() => {
  fetchData();

  // 4. 清理函数
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

## 🔮 未来优化方向

- [ ] 添加用户统计和进度跟踪（答题准确率、用时统计）
- [ ] 支持难度分级（基础/中级/高级）
- [ ] 实现错题本功能（收藏错题，重点练习）
- [ ] 添加单元测试（Vitest + React Testing Library）
- [ ] 支持 PWA 离线使用（Service Worker）
- [ ] 优化移动端体验（响应式布局改进）
- [ ] 添加键盘快捷键（数字键快速选择科目）
- [ ] 支持自定义题库（用户上传 JSON 文件）

## 📄 许可证

Private

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 联系方式

项目开发记录详见 `CLAUDE.md`（包含 AI 辅助开发的完整过程）

---

**最后更新**：2025-12-27
**当前版本**：1.0.0
**核心代码**：useQuestionQueue.js (556 行) + App.jsx (529 行) = 1085+ 行

*"The ledger is balanced. The gods are pleased."*
