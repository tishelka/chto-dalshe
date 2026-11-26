export type Category = {
  id: number;
  name: string;
  description: string | null;
};

export type Activity = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  category_id: number;
  duration_min: number | null;
  budget_level: number;
  is_outdoor: boolean;
  created_at: string;
  category: Category | null;
};

export type UserInterests = {
  interests: Category[];
};

export type SearchParams = {
  category_ids?: number[] | null;
  duration_min?: number | null;
  budget_level?: number | null;
  is_outdoor?: boolean | null;
};

export type Favorite = {
  id: number;
  activity_id: number;
  created_at: string;
  activity: Activity;
};

export type RecommendationHistory = {
  id: number;
  activity_id: number;
  action: 'shown' | 'accepted' | 'skipped';
  created_at: string;
  activity: Activity;
};

export type RecommendationResult =
  | {
      kind: 'success';
      recommendation: { activity: Activity; score: number; reasons: string[] };
      eligible_count: number;
      remaining_count: number;
    }
  | { kind: 'empty' | 'exhausted'; eligible_count: number }
  | { kind: 'invalid'; errors: string[] };
