# njmetro-railmap-creator

[![React](https://img.shields.io/badge/React-19-222222?logo=react&logoColor=61DAFB)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)](https://vite.dev/) [![Cloudflare%20Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white)](https://njmetro-railmap-creator.umamichi.moe)

南京地铁屏蔽门上方贴纸生成器的原型项目。当前仓库主要用于编辑线路、站点与方向参数，并在页面中预览生成的 SVG 结果。

本项目受到 [RMG](https://github.com/railmapgen/rmg) 项目的**启发**，在此表示感谢。

「简办」内置站点模板来自 B 站「简办动态演示」[BV1Bw41127DF](https://www.bilibili.com/video/BV1Bw41127DF)（公开建设规划等为依据），经作者私信授权用于本站；并致谢 @纵横金陵、@萝铁杂谈、@油坊桥上的灯、@北落师门b0125 等对数据表、线路图等提出建议及修正的简办视频贡献者，以及私信或评论对简办动态演示提供信息的网友。详情见 [docs/builtin-jianban-attribution.md](docs/builtin-jianban-attribution.md)。

**其中包含在建或规划研究中线路，站点设置与线路走向都有可能变化；请以市政府或地铁官方最终公布为准。**

## 项目入口

- Cloudflare Pages：https://njmetro-railmap-creator.umamichi.moe
- GitHub 仓库：https://github.com/kyuri-metro/njmetro-railmap-creator
- GitHub Issues：https://github.com/kyuri-metro/njmetro-railmap-creator/issues
- 个人网站：https://umamichi.moe/
- 仓库文档：参见 [docs/](docs/)

## 反馈

欢迎通过 [GitHub Issues](https://github.com/kyuri-metro/njmetro-railmap-creator/issues) 报告 bug、提出功能建议或分享使用体验。

## 项目内容

- 基于 Vite + React + TypeScript 构建
- 页面内可编辑生成参数、站点列表与当前站
- 支持预览 CurrentStationBadge、DirectionBadge、RouteBadge 三类输出
- docs/ 目录用于存放现有资料、方向说明、路线图与参考 SVG

## 示例

### 终点站示例

![Terminus example](public/assets/terminus-badge.webp)

### 方向贴纸示例

![Direction badge example](public/assets/direction-badge.webp)

### 路线图示例

![Route map example](public/assets/route-badge.webp)

## TODO

- 在火车站或机场是当前站时添加火车站或机场标识
- 比较方正黑体的数字是否比 Helvetica 更符合现实中南京地铁线路号方块实际

## 字体策略

- 页面和 SVG 文本统一使用无衬线字体栈，中文优先尝试微软雅黑、苹方、冬青黑体、Noto Sans CJK、思源黑体等，最后回退到系统 sans-serif。
- 不直接内嵌微软雅黑、方正黑体、Helvetica 字体文件；是否可用取决于用户设备是否已安装。
- 如需跨平台保持更高一致性，应优先选用允许网页分发的开源字体，例如 Noto Sans CJK 或思源黑体；若需要绝对一致的导出效果，建议将关键文字转为路径。

## LLM 生成代码说明

本项目架构和大体方向由人工把控，具体代码由 GitHub Copilot、Cursor 等 LLM 生成。本项目以展示和功能为主，具体代码可能经不起推敲，请注意。