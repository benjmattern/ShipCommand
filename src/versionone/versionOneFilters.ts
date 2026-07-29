import type { VersionOneStory } from './versionOneTypes';

export function filterVersionOneStories(
  stories: VersionOneStory[],
  search: string,
  status: string,
  team: string,
) {
  const query = search.trim().toLowerCase();
  return stories.filter((story) => {
    const matchesSearch = !query
      || story.number?.toLowerCase().includes(query)
      || story.name.toLowerCase().includes(query);
    return matchesSearch
      && (!status || story.status === status)
      && (!team || story.teamName === team);
  });
}

export function storyFilterOptions(stories: VersionOneStory[], field: 'status' | 'teamName') {
  return Array.from(new Set(stories.map((story) => story[field]).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right));
}
