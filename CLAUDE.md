# Sanctuary of the Ledger - 项目记忆

## 项目概述
会计分录练习应用，使用 React + Vite 构建，通过 n8n webhook 获取题目数据。

## 技术栈
- React 18 + Vite
- Tailwind CSS
- n8n webhook 后端

## 关键文件
- `src/hooks/useQuestionQueue.js` - 核心题库管理 hook（已于 2025-12-26 重构）
- `src/App.jsx` - 主应用组件
- `src/data/scenarios.json` - 本地备份题库

## Webhook 配置
- URL: `http://8.138.47.26:5678/webhook/get-accounting-scenarios`
- 每次请求 5 道题
- 10 秒超时
- 3 秒节流间隔

## 最近完成的工作 (2025-12-26)

### Code Review 并修复 useQuestionQueue.js
发现并修复了导致"无法及时更新而持续重复请求"的问题：

1. **generateQuestionKey 重构**
   - 移除了 `Date.now()` 时间戳
   - 改为仅基于内容哈希生成稳定 key
   - 确保相同内容生成相同 key，实现真正去重

2. **请求控制改进**
   - 添加 AbortController + 10秒超时机制
   - 统一节流函数 `shouldThrottle()`，3秒间隔
   - 使用 `isFetchingRef` 防止并发请求

3. **状态管理优化**
   - 添加 `emptyFetchCountRef` 追踪最新值，避免闭包陈旧值
   - 所有状态更新改为函数式：`setEmptyFetchCount(prev => prev + 1)`
   - 添加 `isMountedRef` 防止组件卸载后更新状态

4. **useEffect 依赖项精简**
   - 自动触发 effect 依赖项从 7 个减少到 3 个
   - 避免状态更新触发无限循环

### Git 提交历史
```
74d3efd 修复webhook请求重复和无法及时更新的问题
df90cd8 重构题目队列逻辑，解决重复请求和界面卡住问题
1a8b1d8 Initial commit: Sanctuary of the Ledger with optimized webhook logic
```

## 调试提示
- 在 `useQuestionQueue.js` 中设置 `DEBUG_MODE = true` 可以看到详细日志
- 控制台会输出请求、去重、节流等详细信息

## 待办/注意事项
- 如果远程服务不可用，会自动使用本地 `scenarios.json` 补货
- 连续 3 次空响应后停止请求远程
