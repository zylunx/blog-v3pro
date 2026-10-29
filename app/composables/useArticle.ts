import type { ContentCollectionItem } from '@nuxt/content'
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'

/** 获取已加载的文章内容/元信息 */
export function useArticle(path?: MaybeRefOrGetter<string | undefined>) {
	const contentPath = useContentPath(path)
	const dataKey = computed(() => `content:${contentPath.value}`)
	const post = computed(() => useNuxtData<ContentCollectionItem | null | undefined>(dataKey.value).data.value)

	return {
		dataKey,
		post,
		// 加密文章在解锁前正文被替换为占位树，body 始终存在；此处仍做空值保护
		toc: computed(() => post.value?.body?.toc),
		metaSlots: computed(() => post.value?.meta.slots as Record<string, MetaSlotsTree> | undefined),
	}
}
