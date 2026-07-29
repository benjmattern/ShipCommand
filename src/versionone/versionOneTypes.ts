export type VersionOneRecordType = 'story' | 'defect' | 'other';

export interface VersionOneStory {
  id: string;
  oid: string | null;
  href: string | null;
  number: string | null;
  recordType: VersionOneRecordType;
  name: string;
  assetState: string | null;
  status: string | null;
  releaseName: string | null;
  teamName: string | null;
  ownerNames: string[];
}

export interface VersionOneStoriesResponse {
  release: string;
  recordCount: number;
  storyCount: number;
  defectCount: number;
  otherCount: number;
  pageCount: number;
  retrievedAt: string;
  durationMs: number;
  stories: VersionOneStory[];
}

export interface VersionOneStoriesError {
  status: 'failed';
  message: string;
  technicalDetail: string | null;
  release: string;
}
