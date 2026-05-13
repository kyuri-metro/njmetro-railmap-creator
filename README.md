# njmetro-railmap-creator

[![React](https://img.shields.io/badge/React-19-222222?logo=react&logoColor=61DAFB)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)](https://vite.dev/) [![Cloudflare%20Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white)](https://njmetro-railmap-creator.umamichi.moe)

南京地铁屏蔽门上方贴纸生成器的原型项目。当前仓库主要用于编辑线路、站点与方向参数，并在页面中预览生成的 SVG 结果。

本项目受到 [RMG](https://github.com/railmapgen/rmg) 项目的启发，在此表示感谢。

## 项目入口

- Cloudflare Pages：https://njmetro-railmap-creator.umamichi.moe
- GitHub 仓库：https://github.com/kyuri-metro/njmetro-railmap-creator
- 个人网站：https://umamichi.moe/
- 仓库文档：参见 [docs/](docs/)

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

## 字体策略

- 页面和 SVG 文本统一使用无衬线字体栈，中文优先尝试微软雅黑、苹方、冬青黑体、Noto Sans CJK、思源黑体等，最后回退到系统 sans-serif。
- 不直接内嵌微软雅黑、方正黑体、Helvetica 字体文件；是否可用取决于用户设备是否已安装。
- 如需跨平台保持更高一致性，应优先选用允许网页分发的开源字体，例如 Noto Sans CJK 或思源黑体；若需要绝对一致的导出效果，建议将关键文字转为路径。