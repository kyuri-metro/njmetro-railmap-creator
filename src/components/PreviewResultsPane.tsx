import type { GeneratorState } from '../features/generatorSlice';
import { CurrentStationBadge } from './CurrentStationBadge';
import { DirectionBadge } from './DirectionBadge';
import { DownloadableBadgeCard } from './DownloadableBadgeCard';
import { RouteBadge } from './RouteBadge';

export type PreviewResultsPaneProps = {
  previewGenerator: GeneratorState;
  previewLoading: boolean;
};

export const PreviewResultsPane = ({ previewGenerator, previewLoading }: PreviewResultsPaneProps) => (
  <aside className="app-column app-column-preview" aria-label="结果预览">
    <div className="preview-column-root">
      {previewLoading ? (
        <div className="preview-loading-overlay" aria-live="polite" aria-busy="true">
          <span className="preview-loading-label">加载中</span>
        </div>
      ) : null}
      <section className="panel result-panel">
        <h2 className="site-content-heading">结果</h2>

        <DownloadableBadgeCard title="当前站吊板" fileName="current-station-badge.svg">
          <CurrentStationBadge data={previewGenerator} />
        </DownloadableBadgeCard>

        <DownloadableBadgeCard title="方向吊板" fileName="direction-badge.svg">
          <DirectionBadge data={previewGenerator} />
        </DownloadableBadgeCard>

        <DownloadableBadgeCard title="线路图吊板" fileName="route-badge.svg">
          <RouteBadge data={previewGenerator} />
        </DownloadableBadgeCard>
      </section>
    </div>
  </aside>
);
