import type { MediaCategoryConfig, MediaEntry, MediaTypeConfig } from '~/types/media'
import mediaData from '~~/media.yaml'

export default function useMedia() {
	const appConfig = useAppConfig()

	/** 类型注册表，key 为 media.yaml 的 type 值 */
	const types = appConfig.media.types as Record<string, MediaTypeConfig>
	/** 分类注册表，key 为 media.yaml 的 status 值 */
	const categories = appConfig.media.categories as Record<string, MediaCategoryConfig>

	/** 仅保留命中注册表的条目，按标记日期倒序 */
	const entries = computed<MediaEntry[]>(() => (mediaData as MediaEntry[])
		.filter(entry => types[entry.type] && categories[entry.status])
		.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
	)

	const typeCounts = computed(() => Object.fromEntries(
		Object.keys(types).map(type => [type, entries.value.filter(entry => entry.type === type).length]),
	))

	const statusCounts = computed(() => Object.fromEntries(
		Object.keys(categories).map(status => [status, entries.value.filter(entry => entry.status === status).length]),
	))

	return {
		entries,
		types,
		categories,
		typeCounts,
		statusCounts,
	}
}
