export const platforms = [
  { id: 'youtube', name: 'YouTube', color: '#FF0000', connected: true },
  { id: 'tiktok', name: 'TikTok', color: '#69C9D0', connected: true },
  { id: 'instagram', name: 'Instagram', color: '#E1306C', connected: true },
  { id: 'twitter', name: 'X / Twitter', color: '#1DA1F2', connected: false },
]

export const overviewStats = [
  { label: 'Total Followers', value: '284.6K', change: +12.4, platform: 'all' },
  { label: 'Total Views (30d)', value: '1.8M', change: +8.1, platform: 'all' },
  { label: 'Avg. Engagement', value: '5.3%', change: +1.2, platform: 'all' },
  { label: 'Shorts Published', value: '47', change: +18, platform: 'all' },
]

export const platformStats = [
  {
    platform: 'YouTube',
    color: '#FF0000',
    followers: '142K',
    followersRaw: 142000,
    views: '980K',
    engagement: '4.2%',
    topContent: 'Long-form tutorials',
    weeklyGrowth: +3.1,
  },
  {
    platform: 'TikTok',
    color: '#69C9D0',
    followers: '98.4K',
    followersRaw: 98400,
    views: '620K',
    engagement: '7.8%',
    topContent: 'Behind-the-scenes clips',
    weeklyGrowth: +11.3,
  },
  {
    platform: 'Instagram',
    color: '#E1306C',
    followers: '44.2K',
    followersRaw: 44200,
    views: '210K',
    engagement: '3.6%',
    topContent: 'Reels & carousels',
    weeklyGrowth: +2.7,
  },
]

export const weeklyPerformance = [
  { day: 'Mon', youtube: 18200, tiktok: 24100, instagram: 8800 },
  { day: 'Tue', youtube: 14900, tiktok: 31200, instagram: 6200 },
  { day: 'Wed', youtube: 22100, tiktok: 28800, instagram: 9100 },
  { day: 'Thu', youtube: 19600, tiktok: 41000, instagram: 7400 },
  { day: 'Fri', youtube: 25400, tiktok: 55200, instagram: 11200 },
  { day: 'Sat', youtube: 31000, tiktok: 62400, instagram: 14800 },
  { day: 'Sun', youtube: 28700, tiktok: 48300, instagram: 12300 },
]

export const monthlyGrowth = [
  { month: 'Jan', followers: 198000 },
  { month: 'Feb', followers: 211000 },
  { month: 'Mar', followers: 224000 },
  { month: 'Apr', followers: 238000 },
  { month: 'May', followers: 261000 },
  { month: 'Jun', followers: 284600 },
]

export const insightCards = [
  {
    id: 1,
    priority: 'high',
    platform: 'TikTok',
    title: 'Double down on TikTok Shorts',
    body: 'Your TikTok engagement rate (7.8%) is nearly double YouTube. Short clips under 45s are outperforming longer ones by 3.2x. Post at least 5 times this week.',
    action: 'Create Shorts',
    actionRoute: '/shorts-studio',
  },
  {
    id: 2,
    priority: 'high',
    platform: 'YouTube',
    title: 'Your tutorial series drives 60% of watch time',
    body: "The 'Beginner to Pro' series accounts for most of your YouTube watchtime. Your audience is hungry for the next episode — don't leave them waiting.",
    action: 'View Analytics',
    actionRoute: '/analytics',
  },
  {
    id: 3,
    priority: 'medium',
    platform: 'Instagram',
    title: 'Reels posted on Fri–Sat get 2x reach',
    body: "Your last 12 Reels show a clear pattern: content posted Friday afternoon or Saturday morning gets significantly higher organic reach. Schedule your best content then.",
    action: null,
    actionRoute: null,
  },
  {
    id: 4,
    priority: 'medium',
    platform: 'all',
    title: 'Connect X / Twitter to unlock cross-posting',
    body: 'You have an unconnected X account. Many creators see a 15–20% follower lift when cross-posting clip previews to X with a YouTube link.',
    action: 'Connect Account',
    actionRoute: '/connect',
  },
  {
    id: 5,
    priority: 'low',
    platform: 'YouTube',
    title: 'Thumbnail A/B test opportunity',
    body: "3 of your recent uploads have CTRs below 4%. Updating thumbnails with brighter contrast and a human face typically lifts CTR by 1–2 percentage points.",
    action: null,
    actionRoute: null,
  },
]

export const recentVideos = [
  {
    id: 1,
    title: 'How I edited 100 videos in a weekend',
    platform: 'YouTube',
    duration: '18:42',
    views: 84200,
    likes: 3810,
    comments: 294,
    thumbnail: null,
    uploadedAt: '2 days ago',
  },
  {
    id: 2,
    title: 'My full editing setup tour',
    platform: 'TikTok',
    duration: '0:58',
    views: 142000,
    likes: 12400,
    comments: 831,
    thumbnail: null,
    uploadedAt: '4 days ago',
  },
  {
    id: 3,
    title: 'Day in the life of a full-time creator',
    platform: 'Instagram',
    duration: '2:14',
    views: 28600,
    likes: 2100,
    comments: 142,
    thumbnail: null,
    uploadedAt: '6 days ago',
  },
]
