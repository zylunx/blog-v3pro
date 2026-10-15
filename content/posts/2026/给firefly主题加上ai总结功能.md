---
title: 给 Firefly 主题加上 AI 总结功能
description: 为 Firefly 主题新增构建期 AI 文章总结：自动扫描缺失总结的文章、调用 OpenAI 兼容接口写回 front matter，并在文章页渲染总结卡片，附完整接入步骤与排错说明。
date: 2026-07-01 00:00:00
updated: 2026-10-13 20:20:43
published: 2026-07-01T00:00:00.000Z
image: https://img.zylun.de5.net/file/blog/1784033281250.avif
permalink: /posts/fbc737c
categories: [开发]
tags: [Firefly, AI 总结, Astro, OpenAI, 构建脚本]
---
这个功能做的事很直接：构建前扫描所有文章，对还没有总结的调用 AI 接口生成一段摘要，写回文章的 front matter，最后在文章详情页渲染成一个总结框。

写它的动机是懒得给每篇文章手写摘要，又希望列表页和分享卡片有一致的概述。整个方案的关键约束是**不能因为 AI 挂了就构建失败**，下面展开讲。

## 功能特性

| 特性 | 说明 |
| :--- | :--- |
| 自动化生成 | 构建前自动扫描并生成缺失的 AI 总结 |
| 幂等性 | 多次运行不会重复生成已有的总结 |
| 并发控制 | 支持配置并发请求数，避免 API 限流 |
| 多服务商兼容 | 支持 OpenAI 及兼容接口（DeepSeek、Ollama、智谱等） |
| 环境变量优先 | 优先读取系统环境变量，适配 CI/CD 部署 |
| 容错处理 | 未配置 API Key 不会影响正常构建 |

## 改动文件清单

本次改动涉及 6 个文件：

| 文件路径 | 类型 | 说明 |
| :--- | :--- | :--- |
| `scripts/generate-ai-summary.js` | 新增 | AI 总结生成脚本（核心功能） |
| `src/components/features/AiSummary.astro` | 新增 | AI 总结展示组件 |
| `src/content.config.ts` | 修改 | Content Collections Schema 中添加 `ai` 字段 |
| `src/pages/posts/[...slug].astro` | 修改 | 文章详情页引入 AI 总结组件 |
| `package.json` | 修改 | 添加 `ai-summary` 脚本和构建命令 |
| `.env.example` | 新增 | 环境变量示例文件 |

## 两个新增文件

### 生成脚本

`scripts/generate-ai-summary.js` 是核心，流程是：

- 扫描 `src/content/posts/` 下的所有 `.md` / `.mdx` 文件
- 检查每个文件的 front matter 是否已有 `ai` 字段
- 对缺少总结的文章，提取正文纯文本并调用 AI API 生成总结
- 把结果写回原文件 front matter 的 `ai` 字段
- 支持 `--force`（强制重新生成）和 `--dry-run`（预览模式）

### 展示组件

`AiSummary.astro` 负责 UI，特点：

- 展示在文章封面图之后、正文之前
- 带 AI 图标和「AI 总结」标题
- 用主题色的左边框和背景色做视觉区分
- 深浅色主题自适应
- 仅当 front matter 中有 `ai` 字段时才渲染

## 接入步骤

前置条件：Node.js >= 22、pnpm，以及一个 OpenAI 兼容接口的服务（OpenAI、DeepSeek、Ollama 等）。

### 第一步：配置 API Key

两种方式二选一。

::tab{:tabs='["本地 .env","CI/CD 环境变量"]'}
#tab1
在项目根目录创建 `.env`：

```ini [.env]
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
```

#tab2
在 GitHub Actions、Cloudflare Pages、Vercel 等平台设置环境变量：

| 环境变量名 | 是否必填 | 说明 |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | 必填 | AI API 的 Key |
| `OPENAI_BASE_URL` | 可选 | API 地址（默认 `https://api.openai.com/v1`） |
| `AI_MODEL` | 可选 | 模型名称（默认 `gpt-4o-mini`） |
| `AI_MAX_CONTENT_LENGTH` | 可选 | 截取正文的最大字符数（默认 `4000`） |
| `AI_SUMMARY_MAX_TOKENS` | 可选 | 生成总结的最大 token 数（默认 `300`） |
| `AI_CONCURRENCY` | 可选 | 并发请求数（默认 `3`） |

优先级是**系统环境变量 > `.env` 文件**，平台上设置的环境变量会覆盖 `.env` 中的同名变量。
::

### 第二步：运行脚本

手动运行用 `pnpm ai-summary`{lang="sh" copy}；直接 `pnpm build` 也可以，构建命令已经在其他步骤之前串好了 AI 总结脚本。

```json [package.json]
{
  "scripts": {
    "ai-summary": "node scripts/generate-ai-summary.js",
    "build": "node scripts/generate-ai-summary.js && node scripts/generate-icons.js && ..."
  }
}
```

### 第三步：验证效果

运行完成后检查 front matter 里是否已自动加上 `ai` 字段，然后用 `pnpm dev` 看页面效果。

::tab{:tabs='["处理前","处理后"]'}
#tab1
```yaml
---
title: 我的博客文章
published: 2026-07-01
description: 这是一篇示例文章
tags:
  - 示例
---
```

#tab2
```yaml
---
title: 我的博客文章
published: 2026-07-01
description: 这是一篇示例文章
tags:
  - 示例
ai: 这篇文章是一篇示例文章，演示了 Firefly 主题的基本功能...
---
```
::

## 兼容的服务商

只要支持 OpenAI 兼容接口都能用：

| 服务商 | `OPENAI_BASE_URL` 示例 |
| :--- | :--- |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` |
| Ollama（本地） | `http://localhost:11434/v1` |

## 常用操作

- 预览模式，不实际调用 AI：`pnpm ai-summary -- --dry-run`{lang="sh" copy}
- 强制重新生成所有总结：`pnpm ai-summary -- --force`{lang="sh" copy}
- 只重生成某一篇：手动删掉那篇文章 front matter 里的 `ai` 字段，再跑一次 `pnpm ai-summary`

## 注意事项

::alert{type="warning" title="API Key 不要进仓库"}
Key 只放在 `.env` 或平台环境变量里，不要硬编码进代码。`.env` 已在 `.gitignore` 中，不会被提交。
::

- 未配置 API Key 时脚本会输出提示并跳过生成，但**不会阻止构建**，博客照常部署，只是没有 AI 总结。
- 默认总结不超过 100 字（约 300 tokens），保持简洁。
- 已有 `ai` 字段不会被覆盖，只有缺失时才生成。
- 单篇文章调用失败不影响其他文章和整体构建。

## 小结

把 AI 总结放在构建期而不是请求期，换来的是零运行时开销和完全可控的构建产物：总结就静静地躺在 front matter 里，随时可以手动改。真正需要注意的是容错——任何 AI 相关的步骤都不应该成为博客发布链路上的单点故障。
