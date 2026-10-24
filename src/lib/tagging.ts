import { tokenSet, jaccard } from './text';

export interface TopicLite {
  id: string;
  name: string;
  unitId: string;
}

/**
 * Suggest the best-matching syllabus topic for a question by keyword overlap.
 * Score = matched topic tokens / topic tokens, with a small Jaccard tiebreak.
 */
export function suggestTopics(question: string, topics: TopicLite[], limit = 3): { topic: TopicLite; score: number }[] {
  const q = tokenSet(question);
  const scored = topics.map((t) => {
    const tt = tokenSet(t.name);
    if (!tt.size) return { topic: t, score: 0 };
    let hit = 0;
    for (const w of tt) if (q.has(w)) hit++;
    return { topic: t, score: hit / tt.size + jaccard(q, tt) * 0.25 };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function suggestTopic(question: string, topics: TopicLite[]): TopicLite | undefined {
  const best = suggestTopics(question, topics, 1)[0];
  return best && best.score >= 0.3 ? best.topic : undefined;
}
