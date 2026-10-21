# Ember

[![框架](https://img.shields.io/badge/框架-Nuxt-00DC82?logo=Nuxt.js)](https://nuxt.com/)
[![CMS](https://img.shields.io/badge/CMS-Nuxt%20Content-00DC82?logo=Nuxt.js)](https://content.nuxt.com/)
[![部署平台](https://img.shields.io/badge/部署平台-Cloudflare%20Pages-F38020?logo=Cloudflare)](https://pages.cloudflare.com/)
[![访问统计](https://img.shields.io/badge/访问统计-Umami-000000?logo=Umami)](https://github.com/umami-software/umami)
[![代码风格](https://img.shields.io/badge/代码风格-ESLint-4B32C3?logo=ESLint)](https://eslint.org/)

基于 [Clarity](https://github.com/zylunx/blog-v3pro) 主题二次开发的个人博客，于 2026 年 10 月 13 日上线，记录了学习笔记、技术实践与日常生活。主题原作者为 [纸鹿摸鱼处](https://blog.zhilu.site/)（L33Z22L11），本仓库为其 [Clarity 主题](https://blog.zhilu.site/theme) 的个人 Fork，版权归属请以上游为准。

3.8.0 原生 CSS 迁移包含破坏性更改：不再默认提供 Sass 和 Stylelint。下游更新前请阅读 [迁移说明](MIGRATION.md)，保留 SCSS 定制的过渡方案也在其中。

## 特性

[主题特性](https://blog.zhilu.site/theme) · [组件示例](https://blog.zhilu.site/previews/example)

## 使用说明

本博客基于 Clarity 主题二次开发，以下为 Ember 博客的日常维护与使用方式。

### 基本信息

- 标题：**Ember**，副标题「人间烟火散尽，唯留心底余烬」
- 作者：月月（zylunx）
- 站点：[blog.tuuki.top](https://blog.tuuki.top)
- 评论：自托管 [Twikoo](https://twikoo.laplace.de5.net/)

### 内容

文章存放在 `content/posts/`，使用 Markdown / MDC 编写，分类在 `blog.config.ts` 的 `article.categories` 中预置：

| 分类 | 说明 | 图标 |
| ---- | ---- | ---- |
| 技术 | 实践可复用操作经验：工具/系统/部署/排障 | `tabler:mouse` |
| 开发 | 编程：代码实现/工程实践/开发方法 | `tabler:code` |
| 学习 | 安全/CTF/漏洞分析 | `tabler:school` |
| 杂谈 | 观点讨论/复盘反思/行业观察 | `tabler:message` |
| 生活 | 记录叙事：个人经历/日常片段 | `tabler:leaf` |

启用 `blog.config.ts` 的 `article.useRandomPremalink` 后，`pnpm new` 创建文章时会自动生成随机 URL。

### 媒体库

左侧栏「娱乐」入口对应 `/media` 页面，展示动漫、电影、剧集、小说收藏。媒体类型与收藏分类在 `app/app.config.ts` 的 `media` 中注册，数据源在根目录 `media.config.ts` 配置，通过 `pnpm sync:media` 从 Bangumi 同步。

### 友链

友链分组定义在 `app/feeds.ts`，友链申请说明见 `content/link.md`。可运行 `pnpm check:feed` 检测单个友链、`pnpm check:feed/all` 批量检测所有友链并生成报告。

### 订阅

提供 Atom 订阅源 `/atom.xml`，并聚合至 `/subscriptions.opml`。

## 目录结构

项目使用 [Nuxt 4 项目目录结构](https://nuxt.com/docs/4.x/guide/directory-structure/app/app)。

```sh
.
├── app # 前端
│   ├── assets # 资源文件
│   ├── components # 组件
│   │   ├── blog # 博客布局组件
│   │   ├── content # MDC组件
│   │   ├── media # 媒体库组件
│   │   ├── partial # 微型组件
│   │   ├── popover # 弹窗组件
│   │   ├── post # 文章组件
│   │   ├── util # 功能组件
│   │   └── widget # 侧栏小组件
│   ├── composables # Vue 组合式函数
│   ├── pages # 页面
│   │   ├── [...slug].vue # 正文、404页面
│   │   ├── archive.vue # 归档
│   │   ├── index.vue # 首页
│   │   ├── link.vue # 友链
│   │   ├── media.vue # 媒体库（娱乐）
│   │   └── preview.vue # 预览的文章
│   ├── plugins # Nuxt / Vue 插件
│   ├── stores # Pinia 状态管理
│   ├── types # 类型定义
│   ├── utils # 工具函数
│   ├── app.config.ts # 前端响应式配置★
│   ├── app.vue # 基本布局
│   ├── error.vue # 意外错误页
│   └── feeds.ts # 友链列表★
├── content # 文章
│   ├── posts # 正式文章
│   ├── previews # 草稿文章，仅可被站内搜索
│   ├── link.md # 友链要求
│   └── theme.md # 主题介绍
├── modules # Nuxt 模块
│   └── anti-mirror # 恶意反代跳转
├── patches # npm 包补丁
├── public # 静态资源，生成在站点根目录
│   ├── assets # 订阅源 XSLT 模板
│   └── fonts # 字体
├── remark-plugins # Unified 生态插件
├── scripts # npm 脚本
├── server # 服务端
│   ├── api # 接口
│   │   └── stats.get.ts # 博客静态统计
│   └── routes # 根路由
│       ├── atom.xml.get.ts # Atom 订阅源
│       └── subscriptions.opml.get.ts # OPML 订阅源聚合
├── blog.config.ts # 博客静态公共配置★
├── content.config.ts # Nuxt Content 配置
├── edgeone.json # EdgeOne 配置
├── media.config.ts # 媒体库数据源同步配置
├── nuxt.config.ts # Nuxt 配置
└── redirects.json # 旧站点重定向配置
```

## 快速开始

### 安装依赖

需要 Node.js 22.19+（22.x）、24.11+（24.x）或 26+，推荐使用满足要求的最新 LTS 版本。

```sh
pnpm i
```

如果你擅长前端并且需要安装 npm 包，推荐通过 `@antfu/nip` 包提供的 `nip` 命令安装 npm 包到合适的 catalog 下。

### 初始配置

```sh
pnpm init-project # 初始化项目配置，输入 confirm 确认
```

初始化会删除整个 `content` 目录，重建示例文章与通用友链申请说明，重置 `app/feeds.ts`（仅保留主题作者纸鹿的博客），并清空个人导航及统计/评论配置。请先备份自己的内容；自动化环境可显式执行 `pnpm init-project --yes`，没有确认参数时会退出且不修改文件。

初始化后头像和图标使用 WeAvatar 首字占位头像（无需邮箱或 MD5），站点地址为 `http://localhost:3000/`。上线前请按终端清单修改：

- 站点与个人配置：
  - `blog.config.ts` 中的站点信息、Umami 站点统计、Cloudflare Insights 统计、Twikoo 评论服务源（`twikoo.envId` 为评论接口地址，`twikoo.cdn` 为前端脚本地址，按顺序尝试，可换成自己的 CDN）。
  - `app/app.config.ts` 中的页脚导航、出生年份等（`birthYear: 0` 隐藏年龄）。
  - `content/link.md` 中的友链申请方式、`app/feeds.ts` 中的友链列表。

- 为保证开发体验，需要安装 ESLint、Stylelint 等 VS Code 扩展。如果你不喜欢此项目的格式化风格，可以在 `./eslint.config.mjs` 和 `./.vscode/settings.json` 中调整或者不安装 VS Code 扩展。

- 如果文章 URL 和先前的不相同，可以通过编辑 `redirects.json` 来添加重定向。

### 创建文章

- 启用 `blog.config.ts` 中的 `article.useRandomPremalink`，即可在创建文章时随机生成 URL。

```sh
pnpm new
```

### 运行开发环境

```sh
pnpm dev
```

### 构建生产环境

```sh
pnpm generate
pnpm preview
```

### 部署指南

支持 Vercel、Netlify、Cloudflare Pages、EdgeOne Makers 等平台部署。建议采用静态（SSG）部署方式：

- 构建命令: `pnpm generate`
- 输出目录: `dist`
- 安装命令: `pnpm i`

如果直接使用平台提供的“Nuxt”预设部署，则会变成 SSR 模式，此模式每次访问都会等待服务端重新渲染。请参阅 [Nuxt 文档](https://nuxt.com/docs/getting-started/deployment) 和 [Nuxt Content 文档](https://content.nuxt.com/docs/deploy/static) 的“部署”一节。

#### 疑难解答

- 手动清理文章后若 `generate` 报 `Exiting due to prerender errors`，请在完整日志中搜索 `[404]` 和 `Linked from`，修正引用已删除文章的链接。推荐在全新模板上使用初始化命令统一清理。
- `absolute-site-urls` 表示站内链接使用了绝对 URL，并非 IP 地址无效。Atom / OPML 等订阅信息需要绝对地址；自托管时将 `blog.config.ts` 的 `url` 设为实际访问地址，且协议、主机、端口保持一致。

- 当你发现文章页面 404 问题时，请注意文章 URL 不应尾随 `/`。
- 如果修改了 API 路径，使用 EdgeOne Makers 部署需要同步修改 `edgeone.json`。
- 运行、部署项目时 Node.js 版本需要遵照 `package.json` 限制，推荐使用 Node LTS 最新版。

### 检测友链状态

```sh
pnpm check:feed # 检测某友链 / 任意 URL 的托管商及可访问性
pnpm check:feed/all # 检测所有友链可访问性并生成报告
```

## 贡献

欢迎参与项目：如果有具体问题或功能建议，可以发起 Issue；如果愿意在已确定的方向上增加功能或修复问题，可以提交 Pull Request。

## 许可证

- 项目本体：[MIT](LICENSE)
- 博客文章：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)
- 希望你在页脚保留此项目链接，助力开源传播。
