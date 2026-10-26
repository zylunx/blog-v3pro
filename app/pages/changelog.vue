<script setup lang="ts">
import { changelog, changelogTypeMeta, changelogTypeOrder, type ChangelogType } from '~~/shared/changelog'

const appConfig = useAppConfig()

useSeoMeta({
  title: '更新日志',
  description: `${appConfig.title}的功能更新与改动记录。`,
})

type Filter = ChangelogType | 'all'
const activeType = ref<Filter>('all')

const availableTypes = computed(() =>
  changelogTypeOrder.filter(type =>
    changelog.some(release => release.changes.some(change => change.type === type)),
  ),
)

const filtered = computed(() =>
  changelog
    .map(release => ({
      ...release,
      changes: activeType.value === 'all'
        ? release.changes
        : release.changes.filter(change => change.type === activeType.value),
    }))
    .filter(release => release.changes.length > 0),
)

function isActive(type: Filter) {
  return activeType.value === type
}

function activeStyle(type: Filter) {
  if (!isActive(type))
    return {}
  const color = type === 'all' ? 'var(--c-primary)' : changelogTypeMeta[type].color
  return {
    color,
    borderColor: color,
    background: `color-mix(in srgb, ${color} 15%, transparent)`,
  }
}
</script>

<template>
<BlogHeader class="hide-above-mobile" to="/" tag="h1" />

<div class="changelog">
  <header class="page-head">
    <h1>更新日志</h1>
    <p class="sub">记录 {{ appConfig.title }} 的功能迭代与改动，最新在上。</p>
  </header>

  <nav class="filters" aria-label="按改动类型筛选">
    <button
      type="button"
      class="filter-btn"
      :class="{ active: isActive('all') }"
      :style="activeStyle('all')"
      @click="activeType = 'all'"
    >
      全部
    </button>
    <button
      v-for="type in availableTypes"
      :key="type"
      type="button"
      class="filter-btn"
      :class="{ active: isActive(type) }"
      :style="activeStyle(type)"
      @click="activeType = type"
    >
      <Icon :name="changelogTypeMeta[type].icon" />
      {{ changelogTypeMeta[type].label }}
    </button>
  </nav>

  <ol v-if="filtered.length" class="timeline">
    <li v-for="release in filtered" :key="release.version" class="release">
      <span class="node" aria-hidden="true" />
      <article class="card release-card">
        <header class="release-header">
          <span class="version">v{{ release.version }}</span>
          <h2 v-if="release.title" class="release-title">{{ release.title }}</h2>
          <time class="release-date" :datetime="release.date">{{ release.date }}</time>
        </header>

        <ul class="changes">
          <li
            v-for="(change, index) in release.changes"
            :key="index"
            class="change"
            :class="change.type"
          >
            <span class="badge">{{ changelogTypeMeta[change.type].label }}</span>
            <span class="change-text">{{ change.text }}</span>
          </li>
        </ul>
      </article>
    </li>
  </ol>

  <p v-else class="empty text-center">
    当前筛选条件下暂无更新记录。
  </p>
</div>
</template>

<style scoped>
.changelog {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
}

.page-head {
  margin: clamp(1rem, 2vw, 2rem) 0 1rem;

  > h1 {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--c-text);
  }

  > .sub {
    margin-top: 0.35rem;
    color: var(--c-text-3);
    font-size: 0.9rem;
  }
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0 1.75rem;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-bg-2);
  color: var(--c-text-2);
  font-size: 0.85rem;
  transition: color 0.2s, background 0.2s, border-color 0.2s;

  > .iconify {
    font-size: 1em;
  }

  &:hover {
    color: var(--c-text-1);
  }

  &.active {
    font-weight: 600;
  }
}

.timeline {
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 2px;
    background: var(--c-border);
    z-index: 0;
  }
}

.release {
  position: relative;
  padding-left: 2.25rem;
  margin-bottom: 1.75rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.node {
  position: absolute;
  left: 0.15rem;
  top: 0.85rem;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 4px var(--c-bg-1);
  z-index: 1;
}

.release-card {
  padding: 1rem 1.25rem;
}

.release-header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;

  > .version {
    font-family: var(--font-monospace);
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--c-primary);
  }

  > .release-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--c-text);
  }

  > .release-date {
    margin-left: auto;
    color: var(--c-text-3);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
}

.changes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.change {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;

  > .badge {
    flex-shrink: 0;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.6;
    white-space: nowrap;
    color: var(--c-text-2);
    background: var(--c-bg-2);
  }

  > .change-text {
    line-height: 1.6;
    color: var(--c-text-1);
  }
}

.change.added > .badge { color: var(--c-success); background: var(--c-success-soft); }
.change.improved > .badge { color: var(--c-primary); background: var(--c-primary-soft); }
.change.changed > .badge { color: var(--c-warning); background: var(--c-warning-soft); }
.change.fixed > .badge { color: var(--c-accent); background: var(--c-accent-soft, var(--c-primary-soft)); }
.change.removed > .badge { color: var(--c-error); background: var(--c-error-soft); }
.change.deprecated > .badge { color: var(--c-text-3); background: var(--c-bg-2); }

.empty {
  padding: 3rem 1rem;
  color: var(--c-text-3);
}
</style>
