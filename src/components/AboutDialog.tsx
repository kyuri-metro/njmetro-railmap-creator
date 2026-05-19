import packageJson from '../../package.json';
import { ConfirmDialogOverlay } from './ConfirmDialogOverlay';

const appName = '南京地铁屏蔽门上方贴纸生成器';
const appVersion = packageJson.version;
const generatorUrl = 'https://njmetro-railmap-creator.umamichi.moe/';
const githubUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator';
const docsUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';
const copyrightYear = 2026;

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <ConfirmDialogOverlay open={open} onDismiss={onClose}>
      <div
        className="confirm-dialog about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="about-dialog-title" className="confirm-dialog-title">
          关于
        </h2>
        <div className="confirm-dialog-body about-dialog-body">
          <div className="about-dialog-product">
            <p className="about-dialog-app-name">{appName}</p>
            <p className="about-dialog-version">
              版本 {appVersion}
              <span className="about-dialog-channel">（Beta 测试版）</span>
            </p>
            <p className="about-dialog-tagline">
              生成屏蔽门上方线路标识、方向与线路图贴纸，并支持导出 SVG 及常见光栅格式。
            </p>
          </div>

          <p className="about-dialog-copyright">© {copyrightYear} Umamichi</p>

          <hr className="about-dialog-divider" />

          <section className="about-dialog-section" aria-labelledby="about-dialog-credits-title">
            <h3 id="about-dialog-credits-title" className="about-dialog-section-title">
              致谢
            </h3>
            <p className="about-dialog-section-text">
              本软件在设计上受到{' '}
              <a href="https://github.com/railmapgen/rmg" target="_blank" rel="noreferrer">
                Rail Map Generator (RMG)
              </a>{' '}
              的<strong>启发</strong>，在此表示感谢。
            </p>
          </section>

          <dl className="about-dialog-meta">
            <div className="about-dialog-meta-row">
              <dt>网站</dt>
              <dd>
                <a href={generatorUrl} target="_blank" rel="noreferrer">
                  {generatorUrl}
                </a>
              </dd>
            </div>
            <div className="about-dialog-meta-row">
              <dt>源代码</dt>
              <dd>
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  {githubUrl}
                </a>
              </dd>
            </div>
            <div className="about-dialog-meta-row">
              <dt>参考资料</dt>
              <dd>
                <a href={docsUrl} target="_blank" rel="noreferrer">
                  {docsUrl}
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <div className="confirm-dialog-actions about-dialog-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            确定
          </button>
        </div>
      </div>
    </ConfirmDialogOverlay>
  );
}


