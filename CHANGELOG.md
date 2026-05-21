# 变更日志

本项目的 notable 变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 以下部分内容由 LLM 生成，但是经过人工检查，可以信任

## [Unreleased]

### Added

- 存在可撤销编辑历史时，关闭标签页、刷新或离开本站会触发浏览器默认的离开确认（`beforeunload`；与撤销栈非空一致；新建、导入、自动保存恢复等清空撤销历史后不再提示）。导出 YAML 后、在再次编辑或撤销/重做之前，不再提示离开。
- 站点列表工具栏在「导出」前增加「新建」：经确认后创建空白线路图（无站点，保留默认线路编号与生成设置），覆盖当前编辑并清空撤销历史。
- 窄屏（≤720px）顶栏最右侧「更多」（横向 ⋯）：全屏叠层 + 自底部上滑操作表，内含带图标的「设置」「关于」；宽屏仍直接在顶栏显示设置/关于。叠层 `align="bottom"`、`MobileActionSheet` 与 `topbarLayout` 断点常量；菜单项间默认无分隔线，可在 `entries` 中显式插入 `kind: 'separator'`；面板栈预留二级右滑。
- 顶栏文件操作（宽屏）：新建 / 导入 / 导出图标按钮（`TopbarFileCommands`）；导入、导出仍为浮动下拉菜单，图标右下角小号下拉提示；与撤销等操作区之间竖线分隔。
- 窄屏「更多」菜单：新建、导入/导出（右滑二级子菜单，几何描边 Chevron）、与设置/关于之间分隔线；底滑面板增加安全区与浏览器底栏留白。

### Changed

- 编辑 / 新增站点弹窗：表单修改即时写入站点列表与预览，不再需点「保存」；新增站点在打开弹窗时即插入占位行，关闭时若中英文名均为空则自动移除。
- 窄屏（≤720px）顶栏应用标题单行显示，宽度不足时以省略号截断，避免长标题折成多行撑高顶栏。
- 新建 / 导入 / 导出自站点列表标题栏移至顶栏；顶栏标题区改为 flex 自适应宽度。
- 新建文件图标改为无「+」的空白文档轮廓；导出图标箭头路径修正。
- `index.html` viewport 增加 `viewport-fit=cover`，配合底滑菜单底部内边距。

### Fixed

- 修复窄屏顶栏因样式表顺序导致「更多」与设置/关于同时不显示的问题；顶栏收窄阈值与 `TOPBAR_COMPACT_MAX_WIDTH_PX`（720px）及 `matchMedia` 一致，拉宽视口时自动关闭「更多」菜单。
- 修复窄屏未隐藏顶栏文件图标的问题；修复「更多」内导入/导出二级面板横向滑动空白（双栏 200% 轨道 + `translateX(-50%)`）。

### Removed

- 编辑 / 新增站点弹窗底部的「取消」「保存」按钮（关闭仍用标题栏 × 或点击背景；编辑模式下关闭不撤销已写入的修改）。
- 站点列表标题栏中的新建 / 导入 / 导出按钮组（改由顶栏与「更多」菜单提供）。

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
