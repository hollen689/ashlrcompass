export interface ShowcaseItem {
  id: string
  /** Real thumbnail when we have one; falls back to the gradient below. */
  thumbnailUrl?: string
  /** Caption burned over the frame, in the usual short-form style. */
  caption?: string
  captionColor?: string
  gradient: string
}

/**
 * Placeholder screens shown before any real uploads exist. Generic
 * short-form caption patterns, warmed to sit alongside the amber accent.
 */
export const PLACEHOLDER_ITEMS: ShowcaseItem[] = [
  { id: 'p1', caption: 'PART 4', captionColor: '#ffffff', gradient: 'linear-gradient(170deg,#1a1512,#4a3826 55%,#8a6b46)' },
  { id: 'p2', caption: 'wait for the end', captionColor: '#f5a524', gradient: 'linear-gradient(170deg,#101418,#25353f 50%,#4d7280)' },
  { id: 'p3', caption: 'NOBODY TELLS YOU THIS', captionColor: '#ffffff', gradient: 'linear-gradient(170deg,#1c1620,#3f2f4a 55%,#7a6088)' },
  { id: 'p4', caption: 'day 41', captionColor: '#f5a524', gradient: 'linear-gradient(170deg,#0d1114,#1f2d33 45%,#456068)' },
  { id: 'p5', caption: 'RANKED', captionColor: '#ffffff', gradient: 'linear-gradient(170deg,#20140f,#59301c 50%,#a5643c)' },
  { id: 'p6', caption: 'the fix took 3 seconds', captionColor: '#f5a524', gradient: 'linear-gradient(170deg,#111713,#26382a 50%,#4e7357)' },
  { id: 'p7', caption: 'ROUND 2', captionColor: '#ffffff', gradient: 'linear-gradient(170deg,#17171a,#333338 55%,#66666e)' },
]
