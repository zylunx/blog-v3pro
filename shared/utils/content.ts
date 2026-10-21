/** 兼容页面侧与 Nitro 侧的 Content 查询构建器所需的最小接口。 */
interface DraftFilterable<TSelf> {
	where: (field: string, operator: '=', value: unknown) => TSelf
}

/**
 * 排除 frontmatter 中标记了 `draft: true` 的文章。
 * 尚未发布、但仍想在站内翻阅的草稿应放入 `content/previews/`，由 `/preview` 页面展示。
 */
export function wherePublished<T extends DraftFilterable<T>>(query: T): T {
	return query.where('draft', '=', false)
}
