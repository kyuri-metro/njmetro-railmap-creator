import { AboutDialog as AboutDialogTemplate } from '@umamichi-ui/common-components/dialog';
import packageJson from '../../package.json';
import { OVERLAY_IDS } from '../overlay/overlayIds';

const appName = '南京地铁屏蔽门上方贴纸生成器';
const appVersion = packageJson.version;
const generatorUrl = 'https://njmetro-railmap-creator.umamichi.moe/';
const githubUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator';
const githubIssuesUrl = `${githubUrl}/issues`;
const changelogUrl = `${githubUrl}/blob/main/CHANGELOG.md`;
const docsUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <AboutDialogTemplate
      open={open}
      overlayId={OVERLAY_IDS.about}
      onClose={onClose}
      appName={appName}
      version={appVersion}
      channelLabel="（Beta 测试版）"
      tagline="生成屏蔽门上方线路标识、方向与线路图贴纸，并支持导出 SVG 及常见光栅格式。"
      copyrightYear={2026}
      sections={[
        {
          id: 'about-dialog-credits-title',
          title: '致谢',
          content: (
            <>
              本软件在设计上受到{' '}
              <a href="https://github.com/railmapgen/rmg" target="_blank" rel="noreferrer">
                Rail Map Generator (RMG)
              </a>{' '}
              的<strong>启发</strong>，在此表示感谢。
            </>
          ),
        },
        {
          id: 'about-dialog-feedback-title',
          title: '反馈',
          content: (
            <>
              欢迎通过{' '}
              <a href={githubIssuesUrl} target="_blank" rel="noreferrer">
                GitHub Issues
              </a>{' '}
              报告 bug、提出功能建议或分享使用体验！
            </>
          ),
        },
      ]}
      links={[
        { label: '网站', href: generatorUrl },
        { label: '源代码', href: githubUrl },
        { label: '变更日志', href: changelogUrl },
        { label: '参考资料', href: docsUrl },
        { label: '问题反馈', href: githubIssuesUrl },
      ]}
    />
  );
}
