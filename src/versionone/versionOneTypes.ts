export interface VersionOneStory {
  id: string;
  oid: string | null;
  href: string | null;
  number: string | null;
  name: string;
  assetState: string | null;
  status: string | null;
  releaseName: string | null;
  teamName: string | null;
  ownerNames: string[];
}

export interface VersionOneStoriesResponse {
  release: string;
  storyCount: number;
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
