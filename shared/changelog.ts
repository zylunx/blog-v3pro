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
    version: '1.4.1',
    date: '2026-10-31',
    title: '订阅体验优化',
    changes: [
      { type: 'changed', text: 'atom.xml 移除 XSLT 样式表引用，规避 Chrome 弃用 XSLT 后的显示告警与失效问题' },
      { type: 'added', text: '新增人类可读的「订阅」页面（/feed），复用站点主题展示近期文章并引导订阅 Atom 源' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-29',
    title: '文章密码保护',
    changes: [
      { type: 'added', text: '新增文章密码保护：frontmatter 设置 password（支持 env: 变量）后，正文构建期以 AES-256-GCM 加密，浏览器本地解密，密码不进产物' },
      { type: 'added', text: '解锁卡片支持错误密码拒绝与 sessionStorage 记忆，刷新自动解锁' },
      { type: 'added', text: '加密文章在列表/归档/轮播/最新文章/相邻导航处显示小锁标识（PostLockIcon）' },
      { type: 'improved', text: '搜索索引、atom.xml、sitemap 与 llms.txt 自动排除加密文章，避免正文泄露' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-28',
    title: '服务状态监控',
    changes: [
      { type: 'added', text: '新增「服务状态」页面（/status），展示 Uptime Kuma 的监控分组、可用率与心跳' },
      { type: 'added', text: '页脚导航增加「服务状态」入口' },
      { type: 'improved', text: '状态页在构建期抓取快照，实时接口不可达时仍可查看最近数据' },
    ],
  },
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
