import type { VersionOneRecordType, VersionOneStory } from './versionOneTypes';

export function filterVersionOneStories(
  stories: VersionOneStory[],
  search: string,
  recordType: '' | VersionOneRecordType,
  status: string,
  team: string,
) {
  const query = search.trim().toLowerCase();
  return stories.filter((story) => {
    const matchesSearch = !query
      || story.number?.toLowerCase().includes(query)
      || story.name.toLowerCase().includes(query);
    return matchesSearch
      && (!recordType || story.recordType === recordType)
      && (!status || story.status === status)
      && (!team || story.teamName === team);
  });
}

export function naturalRecordNumberCompare(left: VersionOneStory, right: VersionOneStory) {
  return (left.number ?? '').localeCompare(right.number ?? '', undefined, {
    numeric: true,
    sensitivity: 'base',
  }) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

export function storyFilterOptions(stories: VersionOneStory[], field: 'status' | 'teamName') {
  return Array.from(new Set(stories.map((story) => story[field]).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right));
}
