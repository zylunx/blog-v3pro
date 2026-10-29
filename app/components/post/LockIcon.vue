<script setup lang="ts">
/** 文章列表中的加密标识，与正文解锁状态无关，仅用于提前告知需要密码 */
defineProps<{
	/** 紧凑排版（归档、相邻文章）使用更小的尺寸 */
	small?: boolean
}>()
</script>

<template>
<Icon
	v-tip="'加密文章，需输入密码查看'"
	class="post-lock-icon"
	:class="{ small }"
	name="tabler:lock"
	aria-label="加密文章"
/>
</template>

<style scoped>
.post-lock-icon {
	margin-inline-start: 0.35em;
	font-size: 0.9em;
	/* 跟随所在标题的文字颜色，在深色轮播遮罩上也能保持可读 */
	opacity: 0.55;
	vertical-align: 0.05em;
	transition: opacity 0.2s;

	&.small {
		margin-inline-start: 0.25em;
		font-size: 0.8em;
	}
}
</style>
