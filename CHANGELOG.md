# 变更日志

本项目的 notable 变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 以下部分内容由 LLM 生成，但是经过人工检查，可以信任

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.1.0] - 2026-05-20

首个文档化版本（Beta）。对应 `package.json` 中的 `0.1.0`。

### Added

- 南京地铁屏蔽门上方贴纸生成器 Web 界面：编辑线路、站点、方向与当前站，实时预览三类输出。
- **CurrentStationBadge**、**DirectionBadge**、**RouteBadge** 预览与导出（SVG 及常见光栅格式）。
- 0–99、S0-9 号段 **LineIdBadge** 线路号标识块，并与方向、路线图贴纸集成（依赖 `@kyuri-metro/njmetro-line-id-block-svg-generator`）。
- 站点列表表格编辑；内置线路数据与自定义站点管理。
- 站点列表 YAML 导入/导出（`railmap.yml`，支持 schema version 1–3）。
- 与 [Rail Map Generator (RMG)](https://github.com/railmapgen/rmg) 的参数互通（[kyuri-naive-from-and-to-rmg](https://github.com/kyuri-metro/kyuri-naive-from-and-to-rmg) 工具弹窗）。
- 光栅导出：按 1:1 viewBox 比例、每 4096px 宽高分块渲染。
- 浅色/深色主题切换。
- 「关于」对话框：版本号、致谢、站点与仓库链接。
- 贴纸下载流程（含确认与导出相关 UI）。
- 部署至 Cloudflare Pages（[njmetro-railmap-creator.umamichi.moe](https://njmetro-railmap-creator.umamichi.moe/)）。
- 基于 [@umamichi-ui/common-css](https://www.npmjs.com/package/@umamichi-ui/common-css) 的界面样式与弹层交互。

[Unreleased]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/releases/tag/v0.1.0
