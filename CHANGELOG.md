# 变更日志

本项目的 notable 变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 以下部分内容由 LLM 生成，但是经过人工检查，可以信任

## [Unreleased]

### Added

- 站点列表工具栏在「导出」前增加「新建」：经确认后创建空白线路图（无站点，保留默认线路编号与生成设置），覆盖当前编辑并清空撤销历史。

### Changed

- 窄屏（≤720px）顶栏应用标题单行显示，宽度不足时以省略号截断，避免长标题折成多行撑高顶栏。

### Fixed

### Removed

## [0.1.1] - 2026-05-21

对应 `package.json` 中的 `0.1.1`。相对 0.1.0：可撤销编辑、定时自动保存，以及全站统一的叠层与 backdrop 行为。

### Added

- 顶栏 **撤销**、**重做**、**设置**（图标按钮；未产生可撤销历史时撤销/重做不可用）。
- **编辑历史**：`generator` 状态经 `redux-undo` 维护；支持 `Ctrl+Z`、`Ctrl+Y` / `Ctrl+Shift+Z`（焦点在文本输入控件时不触发）。可撤销范围包括站点增删改、列表反转、线路与生成参数、**切换当前站**等；连续调整总长、线路号、标识色/字色在短时间内的多次变更合并为一步。YAML 导入、内置线路覆盖、从自动保存恢复等**整份替换**当前数据的操作会清空撤销历史（`restoreGeneratorState` 后 `clearHistory`），导入/恢复之后的新编辑再单独计入历史。
- **自动保存**：有编辑后按间隔将当前线路图序列化写入 `localStorage`（默认每 300 秒、保留最多 10 条，相邻相同内容不重复存）。**设置** 中可改间隔与条数上限；**查看自动保存的内容** 打开列表（毛玻璃叠层），点选条目后经确认覆盖当前编辑，并清空撤销历史。
- **叠层栈**：确认框、设置/自动保存、站点表单、RMG 工具、样例与下载等全屏叠层共用 `SiteOverlayBackdrop` 与栈注册；后打开的层在上（`z-index` 自 1010 起每层 +10）。面板内容支持 **居中** 或 **顶对齐** 两种布局。仅最上层响应背景点击关闭与 `Escape`；关闭一层时其余已打开层保持不动（例如自设置打开列表后，关闭恢复确认仍回到列表）。
- 依赖 `redux-undo`。

### Changed

- 0.1.0 中各弹层各自实现 backdrop 与层级；现统一由叠层栈管理交互与 `z-index`。
- YAML 导入、内置线路覆盖等确认说明：明确覆盖将清空撤销历史，无法回到操作前（与自动保存恢复一致）。
- 「关于」等界面展示的版本号为 `0.1.1`。

### Fixed

- 页面加载后若尚未编辑，撤销按钮保持禁用（避免仅因色值规范化写入空历史）。

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

[Unreleased]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/releases/tag/v0.1.0
