export interface RedditPost {
	id: string;
	title: string;
	url: string;
	subreddit: string;
	author: string;
	score: number;
	numComments: number;
	createdUtc: number;
	interaction?: 'like' | 'dislike';
	thumbnail?: string;
	fullname: string;
	ourScore?: number;
	llmSummary?: string;
}

export type RedditData = RedditPost[];
