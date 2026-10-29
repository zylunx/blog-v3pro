<script setup lang="ts">
import { orderBy } from 'es-toolkit/array'
import { queryArticleIndex } from '~/utils/article'

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 6 })

const { data: list } = await useAsyncData('recent:posts', () => queryArticleIndex(), { default: () => [] })

const recent = computed(() => orderBy(list.value, ['date'], ['desc']).slice(0, props.limit))
</script>

<template>
<BlogWidget card title="最新文章">
	<ol class="recent-list">
		<li v-for="post in recent" :key="post.path">
			<UtilLink :to="post.path" class="recent-link">
				<span class="recent-title">
					{{ post.title }}
					<PostLockIcon v-if="post.locked" small />
				</span>
				<UtilDate class="recent-date" :date="post.date ?? post.updated" relative />
			</UtilLink>
		</li>
	</ol>
	<p v-if="!recent.length" class="no-post">
		暂无文章
	</p>
</BlogWidget>
</template>

<style scoped>
.recent-list {
	display: flex;
	flex-direction: column;
	gap: 0.15em;
	padding: 0.2rem 0.3rem;
}

.recent-link {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: 0.5em;
	padding: 0.35em 0.45em;
	border-radius: 0.5em;
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--c-bg-soft);
	}
}

.recent-title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--c-text);
}

.recent-date {
	flex-shrink: 0;
	font-size: 0.78em;
	color: var(--c-text-3);
}

.no-post {
	padding: 1em;
	text-align: center;
	color: var(--c-text-3);
}
</style>
