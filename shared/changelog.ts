/**
 * 博客更新日志数据源（单一事实来源）
 *
 * 新增一条更新：在 `changelog` 数组顶部追加一个对象即可。
 * - version：语义化版本号，如 "1.2.0"
 * - date：ISO 日期 "YYYY-MM-DD"，用于排序与展示
 * - title：可选，本次更新的主题
 * - changes：改动列表，每项 type 见下方 ChangelogType，text 为改动描述
 *
 * 侧边栏的「更新日志」小组件（WidgetBlogLog）也会读取本文件，
 * 因此只需在此维护，页面与组件自动同步。
 */

export type ChangelogType =
  | 'added'
  | 'improved'
  | 'changed'
  | 'fixed'
  | 'removed'
  | 'deprecated'

export interface ChangelogChange {
  type: ChangelogType
  text: string
}

export interface ChangelogRelease {
  version: string
  date: string
  title?: string
  changes: ChangelogChange[]
}

/** 各类改动的展示元信息：标签文案、主题色变量、图标 */
export const changelogTypeMeta: Record<ChangelogType, { label: string, color: string, icon: string }> = {
  added: { label: '新增', color: 'var(--c-success)', icon: 'tabler:plus' },
  improved: { label: '优化', color: 'var(--c-primary)', icon: 'tabler:trending-up' },
  changed: { label: '变更', color: 'var(--c-warning)', icon: 'tabler:refresh' },
  fixed: { label: '修复', color: 'var(--c-accent)', icon: 'tabler:bug' },
  removed: { label: '移除', color: 'var(--c-error)', icon: 'tabler:trash' },
  deprecated: { label: '弃用', color: 'var(--c-text-3)', icon: 'tabler:alert-triangle' },
}

/** 用于筛选栏的稳定顺序 */
export const changelogTypeOrder: ChangelogType[] = [
  'added',
  'improved',
  'changed',
  'fixed',
  'removed',
  'deprecated',
]

export const changelog: ChangelogRelease[] = [
  {
    version: '1.2.0',
    date: '2026-10-26',
    title: '更新日志与标签云',
    changes: [
      { type: 'added', text: '新增「更新日志」页面，记录站点的功能迭代与改动' },
      { type: 'added', text: '侧边栏新增标签云组件，可按热度浏览文章标签' },
      { type: 'improved', text: '优化深色模式下的文本对比度，提升长文阅读体验' },
      { type: 'fixed', text: '修复归档页年份锚点在大屏下的轻微偏移' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-18',
    title: '娱乐媒体库',
    changes: [
      { type: 'added', text: '新增个人媒体库（/media），支持动漫、电影、剧集、小说' },
      { type: 'improved', text: '友链页面支持分组内随机排序' },
      { type: 'changed', text: '调整首页精选文章轮播的抽取逻辑' },
      { type: 'fixed', text: '修复移动端侧边栏遮罩偶尔无法关闭的问题' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-15',
    title: '站点上线',
    changes: [
      { type: 'added', text: '基于 zhilu博客 搭建全新的博客框架' },
      { type: 'added', text: '支持文章归档、分类与标签筛选' },
      { type: 'added', text: '接入 Twikoo 评论系统' },
      { type: 'improved', text: '适配明暗双主题与系统跟随' },
    ],
  },
]
