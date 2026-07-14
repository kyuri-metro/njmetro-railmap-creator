# 变更日志

本项目的 notable 变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 以下部分内容由 LLM 生成，但是经过人工检查，可以信任

## [Unreleased]

### Added

- 「按线路填充站点」下拉：线路号左侧显示标志色圆点（开通线网用官方色，简办用 `resolveJianbanLine*`，含 16/18 虚拟参考色）。

### Changed

- 站点列表 / 换乘表表头由 `--gray-*` 改为 `--theme-*`（浅色底 `theme-200`；深色底 `theme-800`），随线路标识色换肤。

## [0.2.1] - 2026-07-15

对应 `package.json` 中的 `0.2.1`。相对 [0.2.0]：界面主题随线路标识色 hue 换肤、common-css / common-components 依赖升级、方向吊板布局集中与压缩修复、字体检测 HubTile 化展示、Metro Studio 工程 iframe 导入，以及「按线路填充站点」双线网（现有开通 + 简办动态演示）与致谢。

### Added

- Metro Studio 工程导入：通过 iframe 嵌入 [kyuri-naive-from-metro-studio](https://github.com/kyuri-metro/kyuri-naive-from-metro-studio)（`KyuriMetroStudioToolModal`），将 `.metro-studio.json` 转为 Kyuri naive YAML 后走既有 YAML 确认导入流程；配置方式与 RMG 相同（`VITE_KYURI_METRO_STUDIO_IFRAME_ORIGIN`，见 `.env.example`）。
- 按线路标识色 `idColor` 的 OKLCH **hue** 运行时推导站点 `--theme-100`～`--theme-900`（[Harmonizer](https://harmonizer.evilmartians.com/) 九档 APCA / even chroma、P3；[`apcach`](https://github.com/antiflasher/apcach) 生成）。
- `useLineThemePalette`：监听 `generator.idColor`，于 `useLayoutEffect` 向文档根写入 `--theme-*`；换线、改色、导入与撤销同步更新顶栏与强调色。
- `lineThemeHarmonizerLevels.ts`、`lineThemePalette.ts` 与 `src/apcach.d.ts` 类型声明。
- `FontDetectionHubTiles`：字体检测结果以 Windows Phone HubTile 风格 120px 方形磁贴展示（Microsoft YaHei、FZHei-B01、Helvetica 各一块）。
- 「按线路填充站点」下拉菜单：分组填充 **南京地铁现有线网（截止 2026.6）** 与 **简办动态演示线网（BV1Bw41127DF）** 内置站表（`FillStationsByLineMenu`、`builtinJianbanLineStations`）。
- 简办数据来源与致谢文档：`docs/builtin-jianban-attribution.md`（含授权私信截图、片尾原文转录）；「关于」与 README 同步致谢与「在建/规划可能变化、以官方最终公布为准」警告。

### Fixed

- 方向吊板向右（`r`）时，第二轮文字压缩的可用总宽未扣除中间的线路号标识块；现从 `maxTotalWidth` 减去 `lineBadgeWidth` 与 `directionBadgeLineBadgeGap`，与「下一站—线路号—往」版式一致，避免如双「中国药科大学」等场景应压未压。

### Changed

- 依赖 `@umamichi-ui/common-css` 升至 ^0.19.0：主题原语改为 oklch 源码 + PostCSS 构建的 sRGB / Display P3 / OKLCH 回退层（npm 发布 `dist/`）等后续样式包更新。
- 依赖 `@umamichi-ui/common-components` 升至 ^0.3.3（含 `FloatingMenu` 长列表几何与滚动稳定性修复）。
- 站点主题变量输出：支持 `oklch()` 的浏览器写入 `oklch(...)`，否则降级为 `hex`（`CSS.supports('color', 'oklch(0% 0 0)')`）。
- `directionBadgeLayout.ts` 升格为方向吊板 SVG 几何规格的单一来源：画布、边距、间距、箭头、线路号块、终点站版式、锚点、标签与站名文字布局及 tier 0 默认字距等常量分组导出；`DirectionBadge`、`measureBadgeText`、`directionBadgeCondense` 改为从此引用，消除组件与测宽逻辑中的魔法数字。
- 「关于」对话框链接区新增 [变更日志](https://github.com/kyuri-metro/njmetro-railmap-creator/blob/main/CHANGELOG.md) 入口。
- 字体检测 UI：由卡片列表改为 HubTile 磁贴；检测完成后依次 flip 显示结果，成功/失败/检测中分别为绿（`#107c10`）/红（`#e81123`）/灰；「正在检测」与「已检测到 / 未检测到」共用同一状态槽位，移除磁贴外摘要文案以避免布局跳变。
- 现在线路号方块不再依赖 Helvetica，改为方正黑体。字体检测部分不再检测 Helvetica。
- 「关于」等界面展示的版本号为 `0.2.1`。

## [0.2.0] - 2026-06-10

对应 `package.json` 中的 `0.2.0`。相对 0.1.3：当前站与方向吊板文字压缩（字数初档，以及方向吊板在仍超宽时的总宽贪心第二轮）。

### Added

- `badgeTextCondense` 方向吊板压缩 **tier** 体系（中文 0/1 档、英文 0/1/2 档）及按 tier 生成字距与水平缩放。
- 方向吊板 **第二轮压缩**：在字数初档后若「往 / 下一站」区段总宽仍超布局上限，按总宽度贪心选择单线或成对进一步压缩（`directionBadgeCondense`、`directionBadgeLayout`、`measureBadgeText`）。
- 开发模式下方向压缩调试日志 `[direction-condense]`（`directionCondenseDebug`）。
- 文字水平缩放参考资料：`docs/text horizonal scaling/`。

### Changed

- **CurrentStationBadge**（当前站吊板）：中文站名 ≥ 7 字时字距 0、水平缩放 0.885；英文站名 ≥ 23 字符时字距 0、水平缩放 0.855。
- **DirectionBadge**（方向吊板）：站名按字数定初档——中文 ≥ 7 字时字距 12、水平缩放 0.825；英文 ≥ 23 字符时字距 0、水平缩放 0.815；英文 ≥ 26 字符时字距 0、水平缩放 0.8；仍超宽时接入第二轮贪心；水平缩放改为包在 `<g transform>` 内，测宽与 `getBBox` 一致。
- 「关于」等界面展示的版本号为 `0.2.0`。

## [0.1.3] - 2026-06-10

对应 `package.json` 中的 `0.1.3`。相对 0.1.2：共用 UI 组件包迁移、预览缩放体验、叠层与浏览器后退同步，以及线路号标识块生成器依赖更新。

### Added

- 结果区 SVG 大图预览：拖动「缩放」滑块时围绕当前视口**水平中心**缩放，避免画面横向跳动。
- 依赖 npm 包 [`@umamichi-ui/common-components`](https://www.npmjs.com/package/@umamichi-ui/common-components) ^0.1.0（叠层栈、History 同步、对话框壳、`FloatingMenu`、`MobileActionSheet` 等）。
- 叠层栈与浏览器后退键同步：在叠层打开时按后退可关闭最上层，而非直接离开页面。
- 聊天记录：`docs/chat-transcript-common-components-extraction.md`、`docs/chat-transcript-overlay-history-back.md`。
- 线路号标识块参考资料：`docs/lineid block/` 下 20260523 调整版 Sn 模板与说明（对应 `@kyuri-metro/njmetro-line-id-block-svg-generator@0.2.3`）。

### Changed

- 移除本仓库内已迁入 `@umamichi-ui/common-components` 的 overlay、菜单、图标与 `ConfirmDialogOverlay` 源码；`main.tsx` 改为引入 `@umamichi-ui/common-components/styles.css` 与 `OverlayStackProvider`。
- YAML 导入/导出顶栏菜单改用包内 `FloatingMenu`；「关于」改用包内 `AboutDialog` 模板。
- 依赖 `@kyuri-metro/njmetro-line-id-block-svg-generator` 升级至 ^0.2.3。
- README 增加 LLM 生成内容说明。
- 「关于」等界面展示的版本号为 `0.1.3`。

## [0.1.2] - 2026-05-22

对应 `package.json` 中的 `0.1.2`。相对 0.1.1：顶栏与窄屏「更多」、离开确认、站点弹窗即时写入、新建空白线路图，以及 GitHub Issues 反馈入口。

### Added

- README 与「关于」对话框增加 [GitHub Issues](https://github.com/kyuri-metro/njmetro-railmap-creator/issues) 链接，欢迎报告 bug、提出功能建议或分享使用体验；关于页元信息中增加「问题反馈」条目。
- 存在可撤销编辑历史时，关闭标签页、刷新或离开本站会触发浏览器默认的离开确认（`beforeunload`；与撤销栈非空一致；新建、导入、自动保存恢复等清空撤销历史后不再提示）。导出 YAML 后、在再次编辑或撤销/重做之前，不再提示离开。
- 站点列表工具栏在「导出」前增加「新建」：经确认后创建空白线路图（无站点，保留默认线路编号与生成设置），覆盖当前编辑并清空撤销历史。
- 窄屏（≤720px）顶栏最右侧「更多」（横向 ⋯）：全屏叠层 + 自底部上滑操作表，内含带图标的「设置」「关于」；宽屏仍直接在顶栏显示设置/关于。叠层 `align="bottom"`、`MobileActionSheet` 与 `topbarLayout` 断点常量；菜单项间默认无分隔线，可在 `entries` 中显式插入 `kind: 'separator'`；面板栈预留二级右滑。
- 顶栏文件操作（宽屏）：新建 / 导入 / 导出图标按钮（`TopbarFileCommands`）；导入、导出仍为浮动下拉菜单，图标右下角小号下拉提示；与撤销等操作区之间竖线分隔。
- 窄屏「更多」菜单：新建、导入/导出（右滑二级子菜单，几何描边 Chevron）、与设置/关于之间分隔线；底滑面板增加安全区与浏览器底栏留白。

### Changed

- 「关于」对话框中「反馈」区块与上一段之间增加上边距（14px），不小于标题与正文间距。
- 编辑 / 新增站点弹窗：表单修改即时写入站点列表与预览，不再需点「保存」；新增站点在打开弹窗时即插入占位行，关闭时若中英文名均为空则自动移除。
- 窄屏（≤720px）顶栏应用标题单行显示，宽度不足时以省略号截断，避免长标题折成多行撑高顶栏。
- 新建 / 导入 / 导出自站点列表标题栏移至顶栏；顶栏标题区改为 flex 自适应宽度。
- 新建文件图标改为无「+」的空白文档轮廓；导出图标箭头路径修正。
- `index.html` viewport 增加 `viewport-fit=cover`，配合底滑菜单底部内边距。
- 「关于」等界面展示的版本号为 `0.1.2`。

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

[Unreleased]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/releases/tag/v0.1.0
