# 侧栏「娱乐」栏目（个人媒体库）设计方案

> 目标：在**左侧栏**导航（文章 / 友链 / 归档）中新增「娱乐」入口，点击进入 `/media` 页面展示已读小说、电影、动漫、电视剧等媒体内容；支持站主自定义媒体类型、分类与显示方式。
>
> 结论：**不引入任何 Hexo/VuePress 插件**（生态不兼容），采用「本地数据文件 + 配置注册表 + 配置驱动导航」架构，数据源为 Bangumi 官方 API（ACG / 书 / 影视）。**P0 与 P1 均已实现并通过验证。**

---

## 1. 需求与落地形态

- 左栏新增「娱乐」导航按钮，**样式与文章/友链/归档完全一致**（`sidebar-nav-item`，图标 + 文字 + 激活指示）；
- 点击进入 `/media` 页面，**媒体内容全部在页面展示**（类型分类、收藏状态、海报墙/列表），左栏不内嵌任何条目；
- 站主可在 `app.config.ts` 中自定义：启用哪些媒体类型、哪些收藏分类、默认显示方式与每页条数。

## 2. 调研结论：现有成熟方案

| 项目 | 形态 | 数据源 | 成熟度 | 对本项目的价值 |
| --- | --- | --- | --- | --- |
| [hexo-bilibili-bangumi](https://github.com/HCLonely/hexo-bilibili-bangumi) | Hexo 生成器插件 | Bilibili / Bangumi / AniList / Simkl | 高（多数据源、进度展示、图片懒加载、镜像缓存、手动数据兜底、自动更新命令） | **架构蓝本**：构建期抓取 → 数据文件 → 模板渲染 + 本地缓存容错，社区大规模验证过的追番/追剧方案 |
| [hexo-douban](https://github.com/MerickBao/hexo-douban) | Hexo 插件 | 豆瓣（非官方，爬虫对抗风控） | 中（无官方 API，易失效） | 仅作可选参考，**不采用** |
| [Bangumi API v0](https://bangumi.github.io/api) | 官方开放 API | 番组计划 | 高（官方、免费、匿名可读公开收藏） | **主数据源（ACG / 书 / 影视）** |
| [TMDB API](https://developer.themoviedb.org/docs) | 官方开放 API | 电影/电视剧元数据 | 高（免费 key、39 种语言、海报 CDN） | 元数据补全；有署名义务，默认关闭 |
| AniList / Jikan / Kitsu / Trakt / Simkl | 官方开放 API | 动漫 / 影视追踪 | 高 | 备选数据源 |

关键事实（2026-10 查证）：

- Bangumi v0 公开收藏匿名可读：`GET /v0/users/{username}/collections?subject_type=2`（1=书籍、2=动画、3=音乐、4=游戏、6=真人影视），前提是收藏设为公开；
- **现行响应为分页包装** `{ data: [...], total, limit, offset }`（早期为裸数组，脚本两种形态均兼容），`limit`/`offset` 分页有效；
- **站点评分在 `subject.score`**（非 `rating.score`，后者为旧文档字段）；
- Bangumi v0 未公布限流值 → 同步脚本保守节流（1.2s/次）+ 自定义 UA + 429/网络错误指数退避；
- Nuxt 生态无现成「个人媒体库」模块，按 zhilu 框架规范自研。

## 3. 架构选型：本地数据文件 + 同步脚本（A 方案）

| 维度 | A. 本地数据文件 + 同步脚本 ⭐ | B. 构建期自动抓取 | C. 浏览器运行时 API | D. Serverless 定时同步 |
| --- | --- | --- | --- | --- |
| 构建稳定性 | 不依赖外网 | API 抖动致构建失败 | 与构建无关 | 与构建无关 |
| SEO / 首屏 | 完整静态内容 | 完整 | 爬虫不可见 | 完整 |
| 密钥管理 | 公开收藏无需密钥 | CI 需存密钥 | 密钥暴露风险 | 需平台密钥 |
| 数据新鲜度 | 手动 / 定时脚本 | 每次构建最新 | 实时 | 每日 |
| 实现成本 | 低 | 中 | 中 | 高 |
| SSG 适配 | 完全适配 | 勉强 | 违背静态纯粹性 | 过度设计 |

选 A 的理由：项目已有 `import pnpmWorkspace from '~~/pnpm-workspace.yaml'` 的 yaml 数据文件先例（`unplugin-yaml/nuxt`），`media.yaml` 放仓库根零新依赖；数据进 git、构建零外网依赖；未来可平滑升级到 D（schema 不变）。

## 4. 架构总览（已按此实现）

```
media.config.ts（数据源配置：用户名 / API 地址 / 类型与状态映射 / 节流）
        │
        ▼  pnpm sync:media（scripts/sync-media.ts）
   Bangumi v0 API ──分页抓取+节流+退避──▶ .data/media-sync/ 本地缓存（兜底）
        │
        ▼  合并（远程字段优先，本地 score/comment 保留）
media.yaml（数据层）
        │
        ▼
app.config.ts → media（类型/分类/显示注册表 + 左栏 nav 入口）
app/composables/useMedia.ts（注册表过滤 · 分组 · 统计）
app/pages/media.vue（/media 完整库页）
app/components/media/MediaCard.vue（海报卡片）/ MediaListRow.vue（列表行）
```

## 5. 数据层：`media.yaml`

仓库根新增，`type` / `status` 必须命中 `app.config.ts` 注册表：

```yaml
- title: 葬送的芙莉莲
  original: 葬送のフリーレン
  type: anime            # → media.types 的 key
  status: done           # → media.categories 的 key
  cover: https://…       # 封面外链
  year: 2023
  score: 9.4             # 个人评分
  siteScore: 8.7         # 站点评分
  progress: 28/28        # 进度
  link: https://bgm.tv/subject/420442
  comment: 寿命论之下，旅程本身就是意义
  date: 2026-03-01       # 标记日期（排序依据）
```

注意：含英文冒号的值（如 `Spider-Man: Across the Spider-Verse`）必须加引号；脚本生成的 YAML 统一单引号包裹，天然规避该问题。

## 6. 配置层

### 6.1 `app.config.ts` 新增 `media` 段

```ts
media: {
  enable: true,
  /** 媒体类型注册表：新增类型只需加一行 */
  types: {
    anime: { name: '动漫', icon: 'tabler:device-tv', color: '#ff8c00' },
    movie: { name: '电影', icon: 'tabler:movie', color: '#33aaff' },
    tv:    { name: '剧集', icon: 'tabler:monitor', color: '#33bbaa' },
    novel: { name: '小说', icon: 'tabler:book', color: '#ff7777' },
  },
  /** 收藏分类注册表 */
  categories: {
    doing: { name: '在看', icon: 'tabler:player-play' },
    done:  { name: '看过', icon: 'tabler:circle-check' },
    wish:  { name: '想看', icon: 'tabler:clock' },
  },
  display: {
    mode: 'poster' as 'poster' | 'list',  // 默认显示方式
    perPage: 24,
    showCover: true,
    showRating: true,
    showProgress: true,
  },
  sources: mediaSources,                  // ← 引用仓库根 media.config.ts
} satisfies MediaConfig,
```

左栏导航追加一项（与文章/友链/归档同组同款）：

```ts
{ icon: 'tabler:devices', text: '娱乐', url: '/media' },
```

### 6.2 `media.config.ts`（仓库根，P1 新增）

数据源配置独立成文件：脚本（Node 侧）与 `app.config.ts`（Nuxt 侧）共用单一来源，避免把凭证类配置写进客户端 bundle（未来 TMDB key 等敏感项走环境变量，不放这里）。

```ts
export default {
  bangumi: {
    username: '',                    // Bangumi 用户名，收藏需设为公开
    apiBase: 'https://api.bgm.tv',   // 国内网络不通时可更换为可用镜像
    typeMap: { '1': 'novel', '2': 'anime', '6': 'tv' },        // subject_type → 类型注册表
    statusMap: { '1': 'wish', '2': 'done', '3': 'doing' },     // 收藏状态 → 分类注册表
    throttleMs: 1200,                // 请求间隔，Bangumi 未公布限流值，保守节流
  },
} satisfies MediaSyncConfig
```

## 7. 组件与页面（P0 已实现）

### `app/composables/useMedia.ts`

- 静态引入 `media.yaml`，按注册表过滤无效条目，按 `date` 倒序；
- 输出 `entries / types / categories / typeCounts / statusCounts`。

### `app/pages/media.vue`（`/media`）

- 头部：标题 + 简介 + 统计行（`ZDlGroup`：收录数 + 各分类计数）；
- 筛选：**类型 chips**（全部 + 注册表类型，带计数，激活色取类型 `color`）× **分类 chips**，均经 `useHydratedQuery` + `useRouteQuery` 绑定 `?type=` / `?status=`，可分享、无水合闪烁；
- 显示方式：`ZRadioGroup` 切换海报墙/列表，绑定 `?mode=`；
- 列表：`UtilListTransition` FLIP 动画 + `usePagination` 分页（`?page=`，每页 24）；
- 条目：`MediaCard`（3:4 封面、评分徽章、进度徽章、状态、年份）或 `MediaListRow`（紧凑行：缩略封面、原名、状态、评分、外链图标）；封面 `<img loading="lazy">`，短评经原生 `title` 展示；
- 空态提示；`useSeoMeta` 标题/描述。

### 类型系统

`app/types/media.ts` 导出 `MediaConfig / MediaTypeConfig / MediaCategoryConfig / MediaSyncConfig / MediaEntry`，`app.config.ts` 以 `satisfies MediaConfig` 收拢配置形状。

## 8. P1：同步脚本 `scripts/sync-media.ts`

### 用法

```bash
pnpm sync:media                        # 按 media.config.ts 配置同步
pnpm sync:media -- --username sai      # 临时指定用户名
pnpm sync:media -- --dry-run           # 只试算，不写 media.yaml 与缓存
pnpm sync:media -- --offline           # 仅使用本地缓存，不联网
pnpm sync:media -- --prune             # 清理已不在 Bangumi 收藏中的条目（谨慎）
```

用户名优先级：`--username` > 环境变量 `BANGUMI_USERNAME` > `media.config.ts`。

### 字段映射规则

| Bangumi | media.yaml | 说明 |
| --- | --- | --- |
| `subject.name_cn \|\| subject.name` | `title` | 中文名优先 |
| `subject.name`（与中文名不同时） | `original` | 原名 |
| `subject_type` 经 `typeMap` | `type` | 未映射的类型整体跳过 |
| 收藏状态 `type` 经 `statusMap` | `status` | 搁置(4)/抛弃(5) 默认丢弃 |
| `subject.images.large \|\| common` | `cover` | Bangumi CDN 大图 |
| `subject.date` 前 4 位 | `year` | 兼容 `2023` / `2023-09` / `null` |
| `rate`（>0 时） | `score` | 个人评分；本地手工值兜底 |
| `subject.score` | `siteScore` | 站点评分 |
| `ep_status/eps`、`vol_status/volumes` | `progress` | 任一缺失时降级为单值；本地值兜底 |
| `updated_at` 前 10 位 | `date` | 排序依据 |
| `comment` | `comment` | **本地手工短评永远优先**，Bangumi 评论仅作兜底 |

### 合并与容错

- **本地字段保留**：`score` / `comment` 等手工维护字段同步时不丢；
- **手工条目保留**：link 不指向 Bangumi 的条目（TMDB、起点等）原样保留；
- **`--prune`**：仅清理「link 指向 Bangumi 但已不在收藏」的条目，纯手工条目永不删除；
- **缓存兜底**：抓取成功写 `.data/media-sync/bangumi-<type>.json`；抓取失败（限流/断网/DNS 污染）自动回退缓存并警告，**任一类无缓存则整体退出**，绝不用半份数据覆盖 `media.yaml`；
- **重试退避**：网络错误/429/5xx 指数退避重试 3 次；404（用户不存在或收藏未公开）立即失败并给出明确提示；
- **幂等**：数据无变化时二次同步零 diff，不会污染 git 历史。

### 实现要点

- 零新依赖：内置 mini YAML 解析/序列化（仅覆盖本项目扁平条目结构），字符串统一单引号包裹；
- `import.meta.dirname` 定位仓库根，缓存目录 `.data` 已在 `.gitignore`；
- 分页兼容两种响应形态：裸数组与 `{ data, total }` 包装，`total` 用于提前结束分页；
- 响应结构异常（既非数组也无 `data`）直接抛错走缓存兜底，不会写坏数据。

## 9. 改动清单与验证结果

| 文件 | 改动 |
| --- | --- |
| `media.yaml` | 新增（P0 示例数据 8 条，覆盖 4 类型 × 3 分类） |
| `media.config.ts` | 新增（P1 数据源配置，app.config 与脚本共用） |
| `app/types/media.ts` | 新增（`MediaConfig / MediaSyncConfig / MediaEntry` 等） |
| `app/composables/useMedia.ts` | 新增 |
| `app/components/media/MediaCard.vue` / `MediaListRow.vue` | 新增 |
| `app/pages/media.vue` | 新增 |
| `app/app.config.ts` | 新增 `media` 段；`nav` 追加「娱乐」入口 |
| `scripts/sync-media.ts` | 新增（P1 Bangumi 同步脚本） |
| `package.json` | 新增 `sync:media` script |
| `nuxt.config.ts` 等 | 无需改动 |

验证（2026-10-17）：

- `nuxt typecheck` 通过；ESLint 新增文件通过；`nuxt generate` 成功：48 个路由预渲染，0 错误；
- `/media/index.html` 含完整条目与筛选器；首页 HTML 含 `<a href="/media" class="sidebar-nav-item">` 娱乐按钮；
- 同步脚本真实端到端验证（Bangumi 公开用户，965 条收藏）：抓取 965 → 映射 850 → 搁置/抛弃跳过 115，字段映射（原名/封面/评分/进度/短评兜底）抽查全部正确；
- 脚本路径单测：`--help`、未配置用户名 exit 1、`--dry-run` 不写文件、合并统计（新增/更新/未变/跳过/手工保留）、幂等（二次同步零 diff）、联网失败缓存兜底、任一类无缓存整体退出保护；
- 踩坑已修复：YAML 值含英文冒号须加引号；Bangumi 现行响应为 `{data,total}` 包装；站点评分字段是 `subject.score`。

## 10. 可扩展性

1. **新媒质类型**：`media.types` 加一行 + `media.yaml` 加数据，零代码（游戏、播客、音乐同理）；
2. **新分类**：`media.categories` 加一行（如「搁置」「二刷」）；
3. **新数据源**：`sync-media.ts` 增加 adapter（AniList/Trakt/OMDb/TMDB），统一映射同一 schema，前端无感；
4. **新显示形态**：`display.mode` 枚举扩展 + 对应组件分支；
5. **升级服务端定时同步**：schema 不变，脚本逻辑搬进 Cron 函数即可。

## 11. UX 细节

- 「娱乐」按钮与既有导航完全同构（hover/active/外链规则一致），零学习成本；
- 暗色模式全部使用框架 CSS 变量；类型颜色经 `--media-color` 注入徽章与激活态；
- 筛选状态入 URL，刷新/分享可还原；列表切换有 FLIP 过渡；
- 移动端左栏为 320px 抽屉，「娱乐」入口随抽屉唤出；
- 封面懒加载、无封面降级为类型图标占位。

## 12. 风险与合规

| 风险 | 对策 |
| --- | --- |
| Bangumi 收藏非公开 | 脚本 404 时明确提示需设为公开 |
| Bangumi 限流/故障/DNS 污染 | 本地缓存兜底 + 保守节流 + 指数退避 + `apiBase` 可换镜像 |
| TMDB 署名义务 | 默认不使用；启用时页脚展示 logo 与声明；key 走环境变量 |
| 豆瓣抓取 | 不采用 |
| YAML 值含英文冒号 | 脚本统一单引号包裹；手工编辑时加引号 |
| 外域封面 | 原生 `<img>`，规避 `@nuxt/image` provider 限制 |
| 敏感配置进客户端 bundle | 数据源配置集中于 `media.config.ts`；敏感项一律走环境变量 |

## 13. 路线图

- **P0（已完成）**：左栏「娱乐」入口 + `/media` 完整库页 + 配置注册表 + 示例数据；
- **P1（已完成）**：`scripts/sync-media.ts`（Bangumi adapter + 缓存兜底 + 合并保留手工字段）+ `pnpm sync:media` + `media.config.ts`；
- **P2（可选）**：TMDB 适配器（影视元数据补全）、右栏摘要卡、nitro 代理实时刷新。
