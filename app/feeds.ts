import type { FeedGroup } from './types/feed'

export default [{
	name: '大神们',
	desc: '学习的对象。',
	entries: [{
		author: '纸鹿本鹿',
		sitenick: '摸鱼处',
		title: '纸鹿摸鱼处',
		desc: '纸鹿至麓不知路，支炉制露不止漉',
		link: 'https://blog.zhilu.site/',
		feed: 'https://blog.zhilu.site/atom.xml',
		icon: 'https://www.zhilu.site/api/avatar.png',
		avatar: 'https://www.zhilu.site/api/avatar.png',
		archs: ['Nuxt', 'Vercel'],
		date: '2019-01-01',
		comment: '主题作者',
	}, {
		author: '张洪Heo',
		sitenick: '大神',
		title: 'HEO',
		desc: '产品设计师，独立开发者，设计与科技分享',
		link: 'https://blog.zhheo.com/',
		feed: 'https://blog.zhheo.com/atom.xml',
		icon: 'https://p.zhheo.com/70UxC320590881724049185405.png!cover',
		avatar: 'https://p.zhheo.com/70UxC320590881724049185405.png!cover',
		archs: ['Hexo'],
		date: '2026-10-01',
		comment: '大神',
	}],
}] satisfies FeedGroup[]
