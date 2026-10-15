---
title: Ember 主题配色配置化：移除访客取色器，统一由站点配置驱动
description: 记录 Ember 博客从访客自定义主题色迁移到构建配置色的过程：双模式色板派生、文章配色覆盖保留、旧 localStorage 清理与构建期校验。
date: 2026-07-15 00:00:00
updated: 2026-10-13 20:20:43
published: 2026-07-15T00:00:00.000Z
image: https://img.zylun.de5.net/file/blog/1784106848406.avif
permalink: /posts/02b2ea7
categories: [开发]
tags: [Ember, Astro, 主题配色, TypeScript, 配置化]
---
Ember 原本允许访客在右上角的显示设置面板里调主题色：颜色被换算成强调色和色相写进 `localStorage`，再由首屏脚本、主题工具函数和 Swup 页面切换逻辑共同恢复。

灵活是灵活，问题也不少：颜色来源不唯一（站点配置、文章配置、访客存储可能同时生效）、首屏要读好几组存储键、显示设置面板混着装了配色和文章列表布局两类功能、改了默认配色后老访客可能还看到浏览器里的旧颜色，而且浅色和深色共用一个全局色相，没法真正配两套颜色。

这次改造的目标很明确：**颜色由站点维护者在配置文件里确定，访客只负责选浅色、深色或跟随系统。**

## 最终规则

1. 全局主题色只读取 `siteConfig`，不再允许访客修改。
2. 浅色和深色模式分别配置颜色，并独立派生对应色板。
3. 保留浅色、深色、跟随系统三种模式及用户的模式偏好。
4. 保留文章 front matter 中的 `color`，进入文章时仍可覆盖全局配色。
5. 旧配色存储会自动清除，不再提供兼容回退。
6. 颜色只接受 `#RGB` 或 `#RRGGBB`，非法配置直接终止构建。
7. 显示设置入口只在允许切换文章列表布局时出现。

## 新配置结构

旧配置把色相、取色器开关和默认模式都塞在 `themeColor` 里，新配置把「视觉样式」和「模式选择」拆开。

::tab{:tabs='["旧配置","新配置"]'}
#tab1
```ts
themeColor: {
  hue: 290,
  fixed: false,
  defaultMode: "system",
},
```

#tab2
```ts
style: {
  color: {
    main: "#3b82f6",
    dark: "#60a5fa",
  },
},

theme: {
  defaultMode: "system",
},
```
::

三个字段各管一件事：`style.color.main` 是浅色模式主色，`style.color.dark` 是深色模式主色，`theme.defaultMode` 取 `light`、`dark` 或 `system`。

类型层用模板字面量约束颜色必须以 `#` 开头：

```ts
export type HexColor = `#${string}`;
```

模板字面量只能完成基础约束，所以运行时还会再解析一次，确保内容确实是三位或六位 Hex。

## 两种模式独立派生色板

主色不只影响链接和按钮，还会牵动页面背景、悬停态、选中态、目录和卡片表面。只替换 `--primary` 会让主色和其他界面颜色脱节，所以需要从配置色生成一组主题 token。

```ts
const themeColorTokens = deriveThemeColorTokens(
  siteConfig.style.color.main,
  siteConfig.style.color.dark,
);
```

派生结果包含两种模式的原始强调色、各自的 OKLCH 色相、各自的表面彩度参数，以及在强调色背景上该用黑色还是白色前景色。

如果颜色解析不出来，构建会直接收到明确错误：

```ts
if (!mainOklch) {
  throw new Error(
    `siteConfig.style.color.main 必须是 #RGB 或 #RRGGBB，当前值：${JSON.stringify(main)}`,
  );
}
```

::alert{type="tip" title="让配置错误在部署前暴露"}
颜色拼错时不要悄悄回退到旧配色。直接抛错中止构建，问题会在 `pnpm build` 阶段就冒出来，而不是等线上被人发现。
::

## CSS 变量如何切换

为了让深浅模式切换时不必重新计算颜色，CSS 同时保存两套变量：

```stylus
:root
  --hue-light: var(--config-hue-light, 250)
  --hue-dark: var(--config-hue-dark, 250)
  --hue: var(--hue-light)
  --accent-light: var(--config-accent-light, #3b82f6)
  --accent-dark: var(--config-accent-dark, #60a5fa)
  --primary: var(--accent-light)

:root.dark
  --hue: var(--hue-dark)
  --primary: var(--accent-dark)
```

浅色模式用 `main` 对应的主色和色相；根元素拿到 `.dark` 后，CSS 自动切到 `dark` 那套。这样两种模式可以用完全不同的色相——浅色用蓝、深色用紫都行，而不是只能在同一色相上改亮度。

首屏阻塞脚本会在页面绘制前写入配置 token，避免先显示回退色再闪烁：

```js
rootStyle.setProperty("--config-accent-light", themeColorMain);
rootStyle.setProperty("--config-accent-dark", themeColorDark);
rootStyle.setProperty("--config-hue-light", String(themeHueMain));
rootStyle.setProperty("--config-hue-dark", String(themeHueDark));
```

## 清理旧访客配色

旧版把原始颜色和派生结果分别写进了浏览器。迁移后如果只是停止读取，这些数据会长期残留，也可能被以后的代码误用，所以首屏初始化时主动删掉：

```js
for (const storageKey of [
  "hue",
  "accentLight",
  "accentDark",
  "onAccentLight",
  "onAccentDark",
  "accentSat",
]) {
  localStorage.removeItem(storageKey);
}
```

注意这里不会删 `theme`——访客选的浅色、深色或跟随系统属于有效偏好，要继续保留。

## 保留文章级颜色覆盖

文章 front matter 的 `color` 和访客全局取色器是两回事：前者由内容作者控制，让文章页和封面形成一致的视觉氛围；后者由访客在运行时改全站颜色。所以这次只删取色器，文章颜色照旧。

构建文章页时仍会从文章颜色得到 `pageHue`，并生成亮色、深色强调色与对应前景色，通过 `MainGridLayout` 写进页面容器：

```astro
data-page-hue={hue}
data-page-accent-light={pageAccentLight}
data-page-accent-dark={pageAccentDark}
data-page-on-accent-light={pageOnAccentLight}
data-page-on-accent-dark={pageOnAccentDark}
```

进入文章时这些变量以 `important` 优先级覆盖全局配置；通过 Swup 离开文章后，内联覆盖被移除，页面自然回到 `style.color.main/dark`。

## 导航栏与显示设置收敛

取色器删掉后，原显示设置面板只剩布局设置，导航栏的渲染规则一并调整：

- `postListLayout.allowSwitch: false`：不渲染显示设置按钮和面板
- `postListLayout.allowSwitch: true`：显示布局设置入口，只提供列表与网格切换
- 深浅模式按钮始终独立保留

同时清掉了不再需要的东西：废弃的 `DisplaySettings.svelte` 色相面板、`ConfigCarrier.astro` 旧色相传递组件、五种语言里的「主题色相」文案、色相滑块的渐变 CSS 变量，以及 `setting-utils.ts` 中的颜色读写和默认色相函数。

## Open Graph 配色同步

OG 图片过去直接读 `themeColor.hue`，如果只改页面主题而漏掉这里，分享图仍会依赖已经删除的配置。现在 OG 图同样调用 `deriveThemeColorTokens()`，用深色主色做强调色，并从深色模式色相派生背景与次要文字色，页面和分享卡片共用一份配置来源。

## 验证结果

```sh
pnpm check
pnpm format
pnpm build
```

- Astro Check：154 个文件，0 errors、0 warnings、0 hints
- Formatter：执行成功
- 完整构建：成功生成 24 个页面
- 首页 HTML 中不再包含配色设置按钮和面板，深浅模式按钮仍正常渲染
- 配置的 `#3b82f6` 与 `#60a5fa` 已进入首屏主题变量

构建期间图片取色脚本有 4 个远程图片请求失败，但脚本按设计跳过，不影响主题迁移和最终构建。

## 总结

这次改造不是简单藏掉一个按钮，而是重新划定了主题颜色的所有权：

- **站点配置**负责全局品牌色
- **深浅模式**负责选择当前使用哪套颜色
- **文章 front matter** 负责局部页面氛围
- **访客存储**只保存模式偏好，不再保存配色数据

颜色来源从多层运行时状态收敛为构建配置之后，首屏初始化、页面切换和后续维护都更容易推理，同时保住了文章级的视觉表达和原有的深浅模式体验。
