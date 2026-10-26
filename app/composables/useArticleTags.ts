interface UseArticleTagOptions {
	bindQuery?: string
}

export function useArticleTags<T extends { tags?: readonly string[] | null }>(list: MaybeRefOrGetter<readonly T[]>, options?: UseArticleTagOptions) {
	const { bindQuery } = options || {}

	const tag = bindQuery
		? useHydratedQuery(bindQuery, useRouteQuery(bindQuery, undefined))
		: ref<string | undefined>()

	const tags = computed(() => {
		const counts = new Map<string, number>()
		for (const item of toValue(list))
			for (const t of item.tags ?? [])
				counts.set(t, (counts.get(t) ?? 0) + 1)

		return [...counts.entries()]
			.sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
	})

	const listTagged = computed(() => toValue(list).filter(
		item => !tag.value || item.tags?.includes(tag.value),
	))

	return {
		tag,
		tags,
		listTagged,
	}
}
