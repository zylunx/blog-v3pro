import type { FeedGroup } from './types/feed'

export default [{
	name: '不止现在',
	desc: '使用 zhilu 博客主题构建的网站。',
	entries: [{
		author: '月月',
		sitenick: 'Space',
		title: 'EmberSpace',
		desc: '人间烟火散尽，唯留心底余烬',
		link: 'https://blog.tuuki.top/',
		feed: 'https://blog.tuuki.top/atom.xml',
		icon: 'https://blog.tuuki.top/logo.png',
		avatar: 'https://blog.tuuki.top/logo.png',
		archs: ['Nuxt', 'CF'],
		date: '2019-01-01',
		comment: '旅客',
	}],
}] satisfies FeedGroup[]
