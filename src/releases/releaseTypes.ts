export interface Release {
  id: string;
  name: string;
  versionOneRelease?: string;
  tslcProjectId?: string;
  almReleaseId?: string;
  status?: string;
  storyCount?: number;
  defectCount?: number;
  raidCount: number;
  lastRefresh?: string;
  owner?: string;
  promotionDate?: string;
  environment?: string;
  notes?: string;
}

export type ReleaseMetadataUpdate = Partial<Omit<Release, 'id' | 'name' | 'raidCount'>>;

export interface ReleaseStore {
  releases: Release[];
  selectedRelease: Release | null;
  selectRelease: (releaseId: string | null) => void;
  updateRelease: (releaseId: string, update: ReleaseMetadataUpdate) => void;
}
