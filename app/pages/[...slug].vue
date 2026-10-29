<script setup lang="ts">
import type { MinimarkTree } from '@nuxt/content'

const route = useRoute()
const contentPath = useContentPath().value

const { data: post } = await useAsyncData(
	`content:${contentPath}`,
	() => queryCollection('content').path(contentPath).first(),
)

/** 加密文章在输入正确密码前不渲染正文 */
const unlocked = ref(false)
const isLocked = computed(() => !!post.value?.locked && !unlocked.value)

const excerpt = computed(() => post.value?.description || '')
const asideWidgetNames = computed<WidgetName[]>(() => {
	if (!post.value)
		return ['blog-log']
	const configured = (post.value.meta?.aside as WidgetName[] | undefined) ?? ['toc', 'tag-cloud', 'recent-posts']
	// 未解锁时正文不在页面里，目录无从生成，先隐藏避免出现空壳
	return isLocked.value ? configured.filter(name => name !== 'toc') : configured
})
const { widgets } = useWidgets(asideWidgetNames)

const appConfig = useAppConfig()
const postCategory = computed(() => post.value?.categories?.[0])
const postAccent = computed(() =>
	appConfig.article.categories[postCategory.value ?? '']?.color ?? '#3B82F6',
)

/** 解密成功后把正文写回同一份文章数据，目录等依赖它的组件会一起恢复 */
function handleUnlocked(body: MinimarkTree) {
	if (!post.value)
		return
	post.value = { ...post.value, body } as typeof post.value
	unlocked.value = true
}

if (post.value) {
	useSeoMeta({
		title: post.value.title,
		ogType: 'article',
		description: post.value.description,
	})
	defineOgImage('BlogPost', {
		title: post.value.title,
		description: post.value.description,
		category: postCategory.value ?? '未分类',
		author: appConfig.author.name,
		date: post.value.updated || post.value.date || '',
		accent: postAccent.value,
		site: appConfig.title,
	})
	// 草稿可从直链访问以便校对，但不允许被搜索引擎收录；加密文章同理
	useRobotsRule(post.value.draft || post.value.locked ? 'noindex, nofollow' : undefined)
}
else {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
	route.meta.title = '404'
}
</script>

<template>
<template #aside>
	<!-- 每篇文章拥有独立的目录状态，并在具名插槽内自然入场。 -->
	<component :is="widget.comp" v-for="widget in widgets" :key="`${post?.path ?? route.path}:${widget.name}`" />
</template>

<template v-if="post">
	<PostHeader v-bind="post" />
	<PostExcerpt v-if="excerpt" :excerpt />

	<PostLocked
		v-if="isLocked"
		:lock-id="post.lockId ?? ''"
		@unlocked="handleUnlocked"
	/>
	<!-- 正文使用纯透明度入场，保证 URL 锚点和目录测量不受位移影响。 -->
	<ContentRenderer
		v-else
		class="article"
		data-transition-enter
		:class="getPostTypeClassName(post?.type, { prefix: 'md' })"
		:value="post"
		tag="article"
	/>

	<PostFooter v-bind="post" />
	<PostSurround />
	<PostComment />
</template>

<ZError
	v-else
	icon="line-md:document-delete-twotone"
	title="内容为空或页面不存在"
/>
</template>
