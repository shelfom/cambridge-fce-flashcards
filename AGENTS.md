# AGENTS.md

## 项目概述

Cambridge FCE Flashcards — 一个基于 React 19 + Vite 7 的纯前端闪卡学习应用，涵盖 Cambridge FCE 考试的 24 个单元词汇，支持图片提示、发音播放、进度追踪和深色模式。

## 技术栈

- **框架**: React 19 + Vite 7
- **样式**: 纯 CSS（`src/styles.css`）
- **字体**: Plus Jakarta Sans Variable（`@fontsource-variable/plus-jakarta-sans`）
- **构建工具**: Vite 7（`@vitejs/plugin-react`）
- **包管理器**: pnpm
- **运行时**: Node.js 24
- **数据**: 静态 JSON（`src/data/fce-course.json`）
- **图片**: WebP 格式，按单元分目录存放（`public/images/u01` ~ `u24`）

## 目录结构

```
/workspace/projects/
├── .coze                  # 平台配置（预览 + 部署）
├── AGENTS.md              # 本文件
├── index.html             # HTML 入口
├── package.json           # 依赖与脚本定义
├── pnpm-lock.yaml         # pnpm 锁文件
├── vite.config.js         # Vite 配置
├── public/
│   ├── icon.svg           # PWA 图标
│   ├── manifest.webmanifest # PWA manifest
│   └── images/            # 闪卡图片（u01 ~ u24，WebP 格式）
├── scripts/
│   ├── coze-preview-build.sh  # 预览构建脚本
│   ├── coze-preview-run.sh    # 预览运行脚本
│   ├── build.sh               # 部署构建脚本
│   └── run.sh                 # 部署运行脚本
└── src/
    ├── main.jsx           # React 入口
    ├── App.jsx            # 主组件（闪卡逻辑、进度管理、主题切换）
    ├── styles.css         # 全局样式
    └── data/              # 课程数据 JSON 文件
        ├── fce-course.json
        ├── fce-source.json
        ├── fce-content-reviewed.json
        ├── fce-content-audit.json
        └── fce-overlap-audit.json
```

## 关键入口 / 核心模块

- **`src/main.jsx`**: React 应用入口，挂载 App 组件，清理旧 Service Worker
- **`src/App.jsx`**: 单文件主组件，包含全部业务逻辑：
  - 闪卡翻转动画与导航
  - 学习进度持久化（localStorage）
  - 单元完成庆祝动画
  - 深色/浅色主题切换
  - 发音播放（Web Audio API）
- **`src/data/fce-course.json`**: 24 个单元的完整课程数据
- **`vite.config.js`**: Vite 配置，HMR 已禁用，构建目标 ES2020

## 运行与预览

### 预览（开发环境）

- **预览类型**: Web 前端 SPA，通过 Vite dev server 提供
- **端口**: 5000（`0.0.0.0` 绑定）
- **脚本**:
  - 构建: `bash scripts/coze-preview-build.sh`（安装依赖）
  - 运行: `bash scripts/coze-preview-run.sh`（启动 Vite dev server）
- **手动启动**: `pnpm exec vite --host 0.0.0.0 --port 5000`

### 部署

- **部署类型**: service（web flavor）
- **构建**: `bash scripts/build.sh`（pnpm install + vite build）
- **运行**: `bash scripts/run.sh`（npx serve dist -l 5000）
- **产物目录**: `dist/`（Vite 默认输出）

## 用户偏好与长期约束

- 包管理器统一使用 pnpm，禁止 npm / yarn
- 预览和部署端口固定为 5000
- 项目为纯前端 SPA，无后端服务
- 图片资源为 WebP 格式，按单元编号分目录
- 课程数据为静态 JSON，构建时打包进产物

## 常见问题和预防

- **端口冲突**: 预览脚本已内置 5000 端口清理逻辑（`fuser -k 5000/tcp`），幂等可重复执行
- **HMR 已禁用**: `vite.config.js` 中 `server.hmr = false`，预览环境不支持热更新，修改代码后需刷新页面
- **Service Worker**: 应用启动时会主动注销所有已注册的 Service Worker，避免缓存干扰
- **部署不使用 vite preview**: 部署环境通过 `serve` 提供静态文件，不依赖 Vite 的 preview 命令
