<script setup lang="ts">
import { changelog } from '~~/shared/changelog'

// 与「更新日志」页面共用同一数据源，仅展示最近 3 条
const blogLog = computed(() => changelog.slice(0, 3).map(release => ({
  label: release.date,
  value: release.title ? `${release.title}（v${release.version}）` : `v${release.version}`,
})))
</script>

<template>
<BlogWidget card title="更新日志">
	<ZDlGroup size="large" :items="blogLog" />
</BlogWidget>
</template>
