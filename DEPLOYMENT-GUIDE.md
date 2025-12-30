# 部署指南 | Deployment Guide

**最后更新**: 2025-12-27
**目标环境**: https://zcanic.xyz/accounting/

---

## 📦 部署步骤

### 1. 构建生产版本

```bash
npm run build
```

构建完成后，`dist` 文件夹包含所有需要部署的文件。

### 2. 上传到服务器

**完整文件列表**（必须全部上传）：

```
dist/
├── index.html           # 主HTML文件
├── bg.jpg              # 背景图片 (3MB) ⚠️ 必须上传
├── favicon.svg         # 网站图标
└── assets/
    ├── index-Bg1DTYcJ.css
    └── index-BjKHohv5.js
```

**服务器路径**：`/www/wwwroot/www.zcanic.xyz/accounting/`

**上传方式**：
- 删除服务器上 `/accounting/` 目录的所有旧文件
- 上传 `dist` 文件夹内的**所有内容**（不是上传 dist 文件夹本身）
- 确认 `bg.jpg` 已成功上传（文件大小 ~3MB）

### 3. 验证部署

访问：`https://zcanic.xyz/accounting/`

**检查清单**：
- ✅ 页面正常加载
- ✅ 背景图片显示（大理石纹理）
- ✅ 看到初始的10道本地题目
- ✅ 状态显示"正在检查远端题库..."
- ✅ 约15秒后远端题目加载成功
- ✅ 控制台无 404 错误
- ✅ 控制台无 Mixed Content 错误

---

## 🔧 技术配置

### Vite 配置

```javascript
// vite.config.js
export default defineConfig({
  base: '/accounting/',  // 子路径部署
  plugins: [react()],
  // ...
})
```

### Webhook 配置

**开发环境** (localhost:5173):
- URL: `http://8.138.47.26:5678/webhook/get-accounting-scenarios`
- 协议: HTTP
- 直连 n8n 服务器

**生产环境** (zcanic.xyz):
- URL: `https://zcanic.xyz/n8n-webhook/get-accounting-scenarios`
- 协议: HTTPS
- Nginx 反向代理到 `http://127.0.0.1:5678/webhook/get-accounting-scenarios`

### Nginx 配置（已配置）

```nginx
location /n8n-webhook/ {
    proxy_pass http://127.0.0.1:5678/webhook/;
    # 其他代理配置...
}
```

---

## 🐛 常见问题

### 问题1: 404 Not Found - assets/index-xxx.js

**原因**: 未设置 `base: '/accounting/'`

**解决**:
```javascript
// vite.config.js
base: '/accounting/'
```

### 问题2: Mixed Content Error

**原因**: HTTPS页面请求HTTP资源

**解决**: 使用HTTPS webhook代理（已配置）
```javascript
// 生产环境自动使用HTTPS
https://zcanic.xyz/n8n-webhook/get-accounting-scenarios
```

### 问题3: bg.jpg 404 Not Found

**原因**: 上传时遗漏背景图片

**解决**:
1. 确认 `dist/bg.jpg` 存在（3MB）
2. 重新上传到服务器 `/accounting/bg.jpg`

### 问题4: 远端题库不可用

**检查步骤**:
1. 测试代理: `curl https://zcanic.xyz/n8n-webhook/get-accounting-scenarios`
2. 检查 Nginx 日志
3. 检查 n8n 服务状态: `systemctl status n8n`（如果使用 systemd）

---

## 📊 文件大小

| 文件 | 大小 | 说明 |
|------|------|------|
| index.html | 0.84 KB | 主HTML |
| bg.jpg | 3.1 MB | 背景图片（重要！） |
| favicon.svg | 1.1 KB | 图标 |
| index-Bg1DTYcJ.css | 30.77 KB | 样式 |
| index-BjKHohv5.js | 266.51 KB | 应用代码 |
| **总计** | **~3.4 MB** | |

---

## 🔄 更新流程

当代码有更新时：

```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖（如果有新依赖）
npm install

# 3. 构建
npm run build

# 4. 上传 dist 文件夹全部内容到服务器
# 5. 清除浏览器缓存并刷新页面
```

---

## ✅ 部署检查清单

部署前：
- [ ] 确认 `vite.config.js` 中 `base: '/accounting/'`
- [ ] 确认 webhook URL 配置正确
- [ ] 本地测试 `npm run dev`
- [ ] 本地测试 `npm run build && npm run preview`

部署后：
- [ ] 访问 `https://zcanic.xyz/accounting/`
- [ ] 检查控制台无错误
- [ ] 测试本地题库（10题）
- [ ] 测试远端题库加载
- [ ] 测试答题流程
- [ ] 测试自动补货（答到第8题时触发）

---

## 📝 环境变量

当前应用使用 Vite 内置的环境检测：

```javascript
import.meta.env.PROD  // true 在生产构建中
import.meta.env.DEV   // true 在开发模式中
```

无需额外配置 `.env` 文件。

---

## 🚀 性能优化

已实施的优化：
- ✅ 代码分割（Vite 自动）
- ✅ CSS 提取和压缩
- ✅ Gzip 压缩支持
- ✅ 图片懒加载（bg.jpg）
- ✅ 浏览器缓存（通过文件哈希）

构建后的文件都包含哈希值（如 `index-BjKHohv5.js`），更新后会自动失效旧缓存。

---

**部署状态**: ✅ 就绪
**测试状态**: ✅ 已验证
**兼容性**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
