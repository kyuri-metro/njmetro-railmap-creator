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
const jianbanAttributionUrl = `${githubUrl}/blob/main/docs/builtin-jianban-attribution.md`;
const jianbanVideoUrl = 'https://www.bilibili.com/video/BV1Bw41127DF';

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
              <p>
                本软件在设计上受到{' '}
                <a href="https://github.com/railmapgen/rmg" target="_blank" rel="noreferrer">
                  Rail Map Generator (RMG)
                </a>{' '}
                的<strong>启发</strong>，在此表示感谢。
              </p>
              <p>
                「简办」内置站点模板来自 B 站「简办动态演示」{' '}
                <a href={jianbanVideoUrl} target="_blank" rel="noreferrer">
                  BV1Bw41127DF
                </a>
                （公开建设规划等为依据），经作者私信授权用于本站；并致谢 @纵横金陵、@萝铁杂谈、@油坊桥上的灯、@北落师门b0125
                等对数据表、线路图等提出建议及修正的简办视频贡献者，以及私信或评论对简办动态演示提供信息的网友。详情见{' '}
                <a href={jianbanAttributionUrl} target="_blank" rel="noreferrer">
                  docs/builtin-jianban-attribution.md
                </a>
                。
              </p>
              <p>
                <strong>
                  其中包含在建或规划研究中线路，站点设置与线路走向都有可能变化；请以市政府或地铁官方最终公布为准。
                </strong>
              </p>
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
