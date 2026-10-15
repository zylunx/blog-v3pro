---
title: Firefly 分类页面美化
description: 把 Firefly 的分类标签页从简单卡片网格升级为可视化聚合页：新增分类玫瑰图与标签共现图谱，配套数据工具、专属样式与五语言文案，并处理暗色适配与 Swup 生命周期。
date: 2026-07-03 00:00:00
updated: 2026-10-13 20:20:43
published: 2026-07-03T00:00:00.000Z
image: https://img.zylun.de5.net/file/blog/1784032900107.avif
permalink: /posts/aec1d95
categories: [开发]
tags: [Firefly, 主题美化, 分类页, ECharts, i18n]
---
`/categories/` 是博客的分类标签聚合页，改造前只是一个卡片网格。这次把它升级成「分类玫瑰图 + 标签关系图谱」的可视化页面：新增三个组件、一个数据工具、一份专属样式和五语言文案，路由页本身则瘦身为薄壳。

## 改动文件清单

新增 5 个文件：

| 路径 | 作用 |
| :--- | :--- |
| `src/utils/tag-graph-data.ts` | 标签共现图谱构建算法 |
| `src/components/common/PageTitle.astro` | 通用页面标题组件（stacked / inline） |
| `src/components/widget/CategoryRose.astro` | 分类玫瑰图 + 列表 |
| `src/components/widget/TagGraph.astro` | 标签关系图谱 |
| `src/styles/pages/categories.css` | 分类页专属样式 |

修改 9 个文件：

| 路径 | 改动 |
| :--- | :--- |
| `src/pages/categories/index.astro` | 重写为薄壳路由页，仅组合子组件 |
| `src/utils/content-utils.ts` | 新增 `getTagGraphData()` |
| `src/styles/main.css` | 引入 `./pages/categories.css` |
| `src/i18n/i18nKey.ts` | 新增 8 个枚举 key |
| `src/i18n/languages/{zh_CN,zh_TW,en,ja,ru}.ts` | 五种语言翻译 |

## 数据层：标签共现图谱

新建 `src/utils/tag-graph-data.ts`，思路是**遍历文章 → 聚合标签 → 枚举两两组合生成边**：

```ts
// 伪代码
function buildTagGraphData(posts, getTagUrl, threshold = 2) {
  for (const post of posts) {
    const tags = unique(post.data.tags);
    // 节点：每个标签的 value = 文章数，posts = 文章列表
    for (const tag of tags) nodeMap[tag].value += 1;
    // 边：任意两标签组合，统计共现次数
    for (let i = 0; i < tags.length; i++)
      for (let j = i + 1; j < tags.length; j++)
        edgeMap[`${min(a,b)}\0${max(a,b)}`] += 1;
  }
  // 过滤掉 value < threshold 的边
  return { nodes, links, threshold };
}
```

再在 `content-utils.ts` 里暴露一个面向页面的封装，由它负责注入 `getTagUrl`：

```ts
export async function getTagGraphData(threshold = 2) {
  const posts = await getSortedPostsList();
  return buildTagGraphData(posts, getTagUrl, threshold);
}
```

## 通用标题组件

`PageTitle.astro` 支持 `stacked`（eyebrow 在上、title 在下）和 `inline`（横排）两种变体，BEM 命名，颜色绑定主题变量：

```astro
---
interface Props {
  title: string;
  eyebrow?: string;
  variant?: "stacked" | "inline";
}
const { title, eyebrow, variant = "stacked" } = Astro.props;
---
<div class:list={["page-title", `page-title--${variant}`]}>
  {eyebrow && <span class="page-title__eyebrow">{eyebrow}</span>}
  <h1 class="page-title__title">{title}</h1>
</div>
```

## 分类玫瑰图

ECharts 南丁格尔玫瑰图的关键配置：

```ts
{
  tooltip: { trigger: "item", /* 显示百分比 */ },
  series: [{
    type: "pie",
    radius: ["20%", "75%"],
    roseType: "area",           // 玫瑰图核心
    itemStyle: { borderRadius: 6 },
    label: { color: isDark() ? "..." : "..." },
    data: [...],
    animationType: "scale",     // 入场动画
    animationDelay: i => i * 100
  }]
}
```

ECharts 通过 CDN 延迟加载，事件监听用全局标记保证只绑定一次，避免 Swup 路由切换后重复绑定：

```ts
if (!window.__categoryRoseBound) {
  window.__categoryRoseBound = true;
  document.addEventListener("astro:page-load", ensureEchartsThenInit);
  document.addEventListener("swup:contentReplaced", ensureEchartsThenInit);
  document.addEventListener("swup:willReplaceContent", destroyCategoryRose);
}
```

::alert{type="warning" title="有路由切换就必须有销毁"}
只监听初始化会内存泄漏：`swup:willReplaceContent` 时要 dispose 图表、disconnect observer、移除 resize 监听。主题切换则用 `MutationObserver` 监听 `<html>` 的 `class` 变化，重新 `setOption()` 重算颜色。
::

## 标签关系图谱

力导向图用 `type: graph` + `layout: force`：

```ts
{
  tooltip: { /* 节点/边不同 formatter */ },
  legend: { data: ["高频", "常用", "低频"] },
  series: [{
    type: "graph",
    layout: "force",
    roam: true,            // 可拖拽缩放
    draggable: true,
    focusNodeAdjacency: true,  // 悬停聚焦
    emphasis: { focus: "adjacency", /* 线条变粗 */ },
    blur: { opacity: 0.15 },  // 非邻节点灰化
    force: { repulsion: 220, edgeLength: [60, 160] },
    categories: [...],     // 3 个分类
    data: nodes, links: links
  }]
}
```

节点大小用 `sqrt` 缩放，避免小节点变得看不见，最终夹在 24~78px 之间：

```ts
function nodeSymbolSize(value) {
  const scaled = Math.sqrt(value) * 14;
  return Math.max(24, Math.min(78, scaled));
}
```

节点颜色按文章数分三档：

| 文章数 | 类别 | 颜色 |
| :--- | :--- | :--- |
| `value >= 5` | 高频 | `#fb7185`（红） |
| `value >= 2` | 常用 | `#fbbf24`（黄） |
| `value < 2` | 低频 | `#94a3b8`（灰） |

## 薄壳路由页

`src/pages/categories/index.astro` 只有 30 行左右，负责并行取数据再组合组件：

```astro
---
const [categories, tagGraph] = await Promise.all([
  getCategoryList(),
  getTagGraphData(),
]);
---
<MainGridLayout title={i18n(I18nKey.categoriesPageTitle)}>
  <div class="categories-page card-base">
    <PageTitle title={...} eyebrow="Taxonomy" variant="stacked" />
    <CategoryRose categories={categories} />
    {categories.length > 0 && tagGraph.nodes.length > 0 && (
      <Fragment>
        <hr class="categories-page__divider" />
        <TagGraph data={tagGraph} />
      </Fragment>
    )}
  </div>
</MainGridLayout>
```

## 样式与暗色适配

- 用 `card-base` 提供圆角与背景，自定义 padding 交给 `.categories-page`
- `.category-rose__layout` 桌面端横排（图表 `flex: 1` + 列表 220px），≤ 768px 上下排列
- `.tag-graph__chart` 固定高度 620px，响应式递减到 360px
- 暗色模式走项目约定的 `:where(.dark)` 选择器

```css
.category-rose__list a { color: rgba(0,0,0,0.85); }
:where(.dark) .category-rose__list a { color: rgba(255,255,255,0.85); }
```

## i18n 国际化

新增 8 个 key，覆盖五种语言：

```ts
enum I18nKey {
  taxonomy = "taxonomy",                       // eyebrow 副标题
  categoriesPageTitle = "categoriesPageTitle", // "分类标签"
  tagGraphTitle = "tagGraphTitle",             // 标签图谱标题
  tagGraphCount = "tagGraphCount",             // "N 个标签"
  totalPostsLabel = "totalPostsLabel",         // "共 N 篇文章"
  highFrequencyTag = "highFrequencyTag",
  commonTag = "commonTag",
  lowFrequencyTag = "lowFrequencyTag",
}
```

| 语言 | categoriesPageTitle |
| :--- | :--- |
| zh_CN | 分类标签 |
| zh_TW | 分類標籤 |
| en | Categories & Tags |
| ja | カテゴリとタグ |
| ru | Категории и теги |

## 验收结果

- `pnpm check`：0 errors / 0 warnings / 0 hints
- `pnpm lint`：通过
- 暗色模式：分类名、汇总行、图例文字均正确切换为白色

## 关键设计点

1. **数据先行**：`buildTagGraphData` 是纯函数便于单测，`getTagGraphData` 负责注入 `getTagUrl`，职责分离。
2. **薄壳路由**：页面文件只组合不实现，后续要换成 Svelte 实现也不影响其他部分。
3. **生命周期管理**：`astro:page-load` 初始化、`swup:willReplaceContent` 销毁，避免 Swup 切换后内存泄漏。
4. **共享 ECharts 加载**：两个组件共用 `window.echarts` 与 `__echartsLoading`，不重复加载。
5. **CDN 兜底**：ECharts 5.6.0 通过 `cdn.jsdelivr.net` 延迟加载，首屏不阻塞。
6. **可访问性**：用 `aria-label`、`role="img"` 给图表命名，列表用 `<nav>` 包裹。
