---
title: Firefly 归档页面美化
description: 对 Firefly 主题归档页做一次收敛改造：去掉双层卡片嵌套、把 oklch 强色换成主题 CSS 变量、放宽整体排版，并修复 hover 色块溢出与虚线连接断裂。
date: 2026-07-03 00:00:00
updated: 2026-10-13 20:20:43
published: 2026-07-03T00:00:00.000Z
image: https://img.zylun.de5.net/file/blog/1784032909144.avif
permalink: /posts/a68324e
categories: [开发]
tags: [Firefly, 主题美化, 归档页, CSS 变量, 明暗模式]
---
`/archive/` 是 Firefly 的归档页面，结构是年 → 月 → 文章，外加筛选与 hover 高亮 SVG。这次改造的目标只有一个：让它在明暗模式和任意主题色相下都好看，同时把排版放宽。

原来的 `ArchivePanel.svelte` 里有大量强制黑白色（`oklch(0.15 0 0)`、`oklch(0.9 0 0)`、`white`、`#0d0d0d`），和项目基于 `--hue` 色相的主题系统天然冲突。下面按改动点整理做了什么、为什么这么做。

## 改动范围

本次只改了两个文件，没有新增文件：

| 路径 | 改动 |
| :--- | :--- |
| `src/pages/archive.astro` | 去掉双层 `card-base` 嵌套；调整内边距 |
| `src/components/controls/ArchivePanel.svelte` | 颜色变量化、整体排版、修复虚线、移除 translateX |

以下部分保持不动：

| 结构 | 说明 |
| :--- | :--- |
| 数据源 `getSortedPostsList()` | `content-utils.ts` 已就绪 |
| i18n 键 | `archive` 早已存在，无新增 |
| `MainGridLayout`、Swup 路由切换 | 基础设施不动 |
| 渲染树（year / month / post） | 仅增补 `:hover`、`:last-child` 类 |
| SVG hover 高亮 path | 只把颜色换成 `--primary` |
| 响应式 ≤ 768px 隐藏时间线 | 保留原有策略 |

## 去掉双层卡片框

原页面是 `card-base` 套 `card-base`，外层还包了一层 `flex + rounded`，于是出现两道实线圆角框叠加。改法是移除中间层：外层交给 `MainGridLayout`，卡片由 `ArchivePanel` 自己负责。

::tab{:tabs='["改动前","改动后"]'}
#tab1
```astro
<MainGridLayout title={title}>
  <div class="flex w-full rounded-(--radius-large) overflow-hidden relative min-h-32">
    <div class="card-base z-10 px-4 py-6 md:px-9 relative w-full">
      <h1 class="sr-only">{title}</h1>
      <ArchivePanel sortedPosts={sortedPostsList} client:load />
    </div>
  </div>
</MainGridLayout>
```
#tab2
```astro
<MainGridLayout title={title}>
  <div class="w-full py-4 md:py-6 relative">
    <h1 class="sr-only">{title}</h1>
    <ArchivePanel sortedPosts={sortedPostsList} client:load />
  </div>
</MainGridLayout>
```
::

Firefly 的 `MainGridLayout` 已自带 Banner 标题，水平 padding 交给 panel 内部的 `padding: 1.25rem 1.5rem`，避免双重间距。

## 颜色变量化

组件里的强色全部映射到 `variables.styl` 中已有的主题变量。`:root` 与 `:root.dark` 会自动切换明暗与色相，所以组件内不再需要 `:global(.dark)` 覆写。

```css [ArchivePanel.svelte]
.archive-panel {
  --tw: 2rem;
  --lc: var(--line-color);     /* 虚线 */
  --lh: var(--primary);        /* 高亮线：主色，自动适配明暗 */
  --nc: var(--meta-divider);   /* 普通节点 */
  --nh: var(--primary);        /* 高亮节点：主色 */
  --lw: 2.5px;
}
```

| 原值（强制） | 现值（项目变量） | 用途 |
| :--- | :--- | :--- |
| `oklch(0.15 0 0)` | `var(--primary)` | 高亮线 / 高亮节点 |
| `oklch(0.82 0 0)` | `var(--line-color)` | 虚线回退 |
| `oklch(0.82 0 0)` | `var(--meta-divider)` | 普通节点回退 |
| `var(--page-bg, white)` | `var(--card-bg)` | 年节点打孔背景、SVG drop-shadow |
| `var(--page-bg, #0d0d0d)` | `var(--card-bg)` | 暗色 drop-shadow |
| `:global(.dark) { --lh / --nh }` | 删除 | 由 `:root.dark` 自动切换 |

一句话总结：4 个 `oklch` 强色、2 处暗色覆写和若干硬编码回退，收敛成 4 个主题变量，明暗与色相切换全部自动生效。

## 放宽整体排版

目标是让文字与卡片边缘、年月块之间、标签之间都有舒展的间距。

```css
/* 卡片内边距 */
.archive-panel { padding: 1.25rem 1.5rem; }

/* 块间距 */
.ap-year-block       { margin-bottom: 2.75rem; }
.ap-year-block:last-child   { margin-bottom: 0; }
.ap-month-block      { margin-bottom: 1rem; }
.ap-month-block:last-child  { margin-bottom: 0; }
.ap-post-row                { min-height: 2.5rem; }
.ap-post-row:not(:last-child){ margin-bottom: 0.15rem; }

/* 标题行 */
.ap-year-header, .ap-month-header {
  min-height: calc(var(--tw) + 0.5rem);
}
.ap-year-label, .ap-month-label {
  gap: 0.75rem; padding-left: 0.75rem;
}

/* 文章链接 */
.ap-post-link {
  min-height: 2.75rem;
  padding: 0.4rem 1rem;
  gap: 1rem;
}

/* 子元素 */
.ap-date     { width: 3rem; }       /* 原 2.8rem */
.ap-meta     { gap: 0.45rem; }      /* 原 0.35rem */
.ap-meta-gap { width: 0.625rem; }   /* 原 0.5rem */

/* 移动端 */
@media (max-width: 768px) {
  .ap-post-link { padding: 0.45rem 0.7rem 0.5rem; }
}
```

## 修复 hover 色块溢出

`.ap-post-row:hover` 原本带 `transform: translateX(0.375rem)`，整行右移 6px。而 `.ap-post-link` 是 `flex: 1`，右边缘已经贴齐容器，一移就溢出。

删掉这条规则，hover 反馈改由三种机制承担：

- `btn-plain` 的背景色变化
- `.ap-post-node` 节点放大（`scale(1.6)`）
- SVG `<path>` 高亮线从年节点连到悬停的文章

`btn-plain` 的圆角背景由 `::before { inset: 0 }` 限制在 link 内部，`.ap-post-link` 自身也有 `overflow: hidden + border-radius` 兜底。

::alert{type="warning" title="删除比兜底更干净"}
这里没有用 `overflow: hidden` 去掩盖溢出——那正是下一节虚线断裂的直接原因。先删掉造成位移的规则，再换一套反馈机制，问题才真正消失。
::

## 修复虚线断裂

修上一项时给 `.ap-post-list` 加过 `overflow: hidden`，结果 `.ap-post-hline` 需要向左延伸 `tw/2` 去接月竖线的部分被裁掉，横线和竖线断开。另外年、月两个 `::before` 的 `bottom: 1rem` 让竖线没走到最后一个分支节点的中心，视觉上也有断点。

```css
/* 移除 overflow:hidden，由 .ap-post-link 自身 border-radius + overflow:hidden 兜底 */
.ap-post-list { list-style: none; margin: 0; padding: 0; }

/* 年竖线延伸到年块底部附近 */
.ap-year-block::before { bottom: 0.5rem; }  /* 原 1rem */

/* 月竖线精确止于最后一个文章节点中心（行高 2.5rem / 2） */
.ap-month-block::before { bottom: 1.25rem; } /* 原 1rem */
```

修复后的连接关系：

```text
年节点 ●────┬─────● 月节点 ●───┬───● 文章节点 1
           │                  ├───● 文章节点 2
           │                  └───● 文章节点 N
           │
           └─────● 月节点 2 ──┬───● ...
                              └───● ...
```

- 年竖线（X = `tw/2`）从年节点中心贯穿到年块底部
- 月横线（长度 `tw`）从年主干向右连到月节点
- 月竖线（X = `tw + tw/2`）从月节点贯穿到最后一个文章节点中心
- 文章横线从月分支向右连到各文章节点

## 验收结果

- `pnpm check`：0 errors / 0 warnings / 0 hints
- `pnpm build`：构建通过
- 明暗模式：虚线、节点、高亮线、SVG drop-shadow 均自动切换，无强色残留
- 主题色相：切换 `--hue` 时高亮线与节点跟随
- 移动端：时间线隐藏，列表垂直排列正常

## 关键设计点

1. **颜色变量化优先**：组件内不出现任何 `oklch` 或十六进制强色，全部依赖 `variables.styl` 的 CSS 变量，主题切换零成本。
2. **删除代替覆写**：溢出问题用「删规则 + 换反馈机制」解决，比叠一层 `overflow: hidden` 干净。
3. **几何精确化**：竖线 `bottom` 取 `1.25rem`（= 文章行高 2.5rem 的一半），精确对齐节点中心。
4. **避免双重 `card-base`**：薄壳路由 + 单层卡片是项目内的常见范式，归档页统一遵循。
5. **保留响应式策略**：≤ 768px 时时间线、节点、SVG 全部 `display: none`，但内边距保留以维持视觉密度。
