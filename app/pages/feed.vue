<script setup lang="ts">
import { queryArticleIndex } from '~/utils/article'

const appConfig = useAppConfig()
const feedUrl = new URL('/atom.xml', appConfig.url).toString()
const opmlUrl = new URL('/subscriptions.opml', appConfig.url).toString()

useSeoMeta({
	title: '订阅',
	description: `通过 Atom 订阅 ${appConfig.title} 的更新，或在此查看近期文章列表。`,
})

const { data: posts } = await useAsyncData('feed:recent', () => queryArticleIndex(), { default: () => [] })
const recent = computed(() => posts.value.slice(0, appConfig.feed.limit))

const copied = ref(false)
async function copyFeed() {
	try {
		await navigator.clipboard.writeText(feedUrl)
		copied.value = true
		setTimeout(() => (copied.value = false), 2000)
	}
	catch {}
}
</script>

<template>
<div class="feed proper-height">
	<header class="feed-head">
		<h1 class="feed-title">
			<Icon name="tabler:rss" />
			<span>订阅 {{ appConfig.title }}</span>
		</h1>
		<p class="feed-sub">{{ appConfig.subtitle || appConfig.description }}</p>

		<div class="feed-actions card">
			<div class="feed-actions-text">
				<p>把本站添加到你的 RSS / Atom 阅读器，第一时间获取更新。</p>
				<code class="feed-url">{{ feedUrl }}</code>
			</div>
			<div class="feed-buttons">
				<a class="btn" :href="feedUrl" target="_blank" rel="noopener">
					<Icon name="tabler:rss" /> 打开 Atom 源
				</a>
				<button class="btn ghost" type="button" @click="copyFeed">
					<Icon :name="copied ? 'tabler:check' : 'tabler:copy'" /> {{ copied ? '已复制' : '复制地址' }}
				</button>
				<a class="btn ghost" :href="opmlUrl" target="_blank" rel="noopener">
					<Icon name="tabler:file-export" /> 导出 OPML
				</a>
			</div>
		</div>
	</header>

	<section class="feed-list">
		<h2 class="feed-list-title">近期文章</h2>
		<menu class="feed-archive-list">
			<PostArchive
				v-for="article in recent"
				:key="article.path"
				v-bind="article"
				:to="article.path"
				:show-category="true"
				:use-updated="true"
			/>
		</menu>
	</section>
</div>
</template>

<style scoped>
.feed {
	max-width: 50rem;
	margin-inline: auto;
	padding: 1rem;
}

.feed-head {
	margin-bottom: 1.5rem;
}

.feed-title {
	display: flex;
	align-items: center;
	gap: 0.4em;
	font-size: 1.8em;
	margin: 0;
}

.feed-sub {
	opacity: 0.7;
	margin: 0.3em 0 1em;
}

.feed-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 1em;
	justify-content: space-between;
	align-items: center;
	padding: 1em;
}

.feed-actions-text {
	flex: 1 1 16rem;
	min-width: 0;
}

.feed-actions-text p {
	margin: 0 0 0.4em;
}

.feed-url {
	display: inline-block;
	font-size: 0.8em;
	opacity: 0.8;
	word-break: break-all;
}

.feed-buttons {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em;
}

.btn {
	display: inline-flex;
	align-items: center;
	gap: 0.3em;
	padding: 0.45em 0.9em;
	border-radius: 0.5em;
	border: 1px solid var(--c-border, #d0d0d0);
	text-decoration: none;
	color: var(--c-text, #333);
	background: var(--c-bg-soft, #f3f3f3);
	cursor: pointer;
	font: inherit;
}

.btn:hover {
	border-color: var(--c-primary, #33aaff);
	color: var(--c-primary, #33aaff);
}

.feed-list-title {
	font-size: 1.2em;
	margin: 1.5em 0 0.5em;
}

.feed-archive-list {
	list-style: none;
	padding: 0;
	margin: 0;
}
</style>
