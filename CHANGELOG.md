# 变更日志

本项目的 notable 变更记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 以下部分内容由 LLM 自动生成，仅供参考

## [Unreleased]

### Added

- 表格内改中英文站名：输入经短 debounce（约 160ms）以 `patchStationName` 写入预览；Enter 或失焦定稿（trim），Esc 恢复聚焦时的原名。
- 输入法 composition：拼音组合期间不写 store / 不进撤销；`compositionend` 后再同步预览；组合中的 Enter / Esc 交给 IME，避免误失焦。

### Changed

- 站点表单元格与站名输入内左右留白略收紧，使列表更易铺满可用宽度（页面主内容 padding 保持原样）。
- 撤销 `groupBy`：同键且约 800ms 内连续编辑并成一步（站名按站与字段、弹窗换乘/类型按站；总长 / 线路号 / 标识色 / 字色按字段类型），短时连改撤销一次即可回到改前。
- 切换当前预览站（`setCurrentStation`）不再记入撤销历史；撤销 / 重做后尽量保持撤销前的当前站，若该站已不存在则回退到首站。

### Fixed

- 站名单元格改为可自动增高的换行 `textarea`：长站名在未聚焦时换行显示，点击后光标落在点击处。
- 窄屏顶栏：右侧内边距改回 `--page-gutter`，仅为左侧 Beta 标签保留较大的 start padding，避免最右按钮视觉偏左。
- 窄屏下「查看示例」按钮保持右对齐（不再清除 `margin-left: auto`）。

## [0.4.1] - 2026-08-08

对应 `package.json` 中的 `0.4.1`。相对 [0.4.0]：站点列表**表格内联改名**与行右键插入，以及 spreadsheet 风格表样式。

### Added

- 站点列表行右键菜单：「之前插入」「之后插入」。
- 中文名 / 英文名可在表格内直接编辑（失焦或 Enter 提交，Esc 取消）；新建站点不再打开弹窗，插入后聚焦新行中文名。
- 铅笔按钮打开的弹窗改为仅编辑站点类型与换乘线路；行最右侧 `x` 删除站点（删除前确认）。

### Changed

- 站点表改为无外框、行间灰色横线、表头与正文同色且字号接近的 spreadsheet 风格；触控友好的整格输入热区；去掉「当前」胶囊（当前站仍以行高亮表示）。
- 窄屏站点工具栏：四个插入按钮两两各占一行，「反转列表」单独占满一行。
- 「关于」等界面展示的版本号为 `0.4.1`。

## [0.4.0] - 2026-08-08

对应 `package.json` 中的 `0.4.0`。相对 [0.3.0]：线路图**非当前换乘中间站胶囊标记**、YAML 缺省外观选项改为保持旧版外观，以及 Unreleased 积压的车型默认 / 依赖与绘制修复。

### Added

- 生成设置「非当前换乘中间站使用胶囊标记」（默认关）：开启后，非当前且非首末站的换乘站用水平 1:2 白胶囊替代白圆，换乘箭头相对现图顺时针旋转 90°（视觉宽度 32）；当前站与终点站样式不变。
- YAML `njMetroSettings.useCapsuleTransferMarkers` 读写。
- 参考素材：`docs/capsule transfer icon.svg`、`docs/origin photos/` 示例照片。
- 对话框等叠层接入 `@umamichi-ui/chromatic-fringe` 深度色差描边。

### Changed

- 「按线路填充站点」：S2 默认车型由 B 型改为 B 型（长线路图）。
- 导入 YAML 时，若缺少 `showStationTypeIcons` / `useCapsuleTransferMarkers` / `trainType`，不再继承当前编辑器状态，分别回落为 `false` / `false` / `A型`，以保持旧版外观。
- 线路号标识块去掉 attribution 涟漪动画。
- 依赖：`@umamichi-ui/chromatic-fringe` ^0.4.4、`@umamichi-ui/common-components` ^0.4.6、`@umamichi-ui/common-css` ^0.19.4（含 FloatingMenu / action-sheet / tap-highlight 等修复）。
- 「关于」等界面展示的版本号为 `0.4.0`。

### Fixed

- 「按线路填充站点」等可滚动 `FloatingMenu`：Android Chromium 上 RGB fringe 随内容滚动错位。
- 线路图站名在中文压缩（`scaleX`）时，火车站 / 机场站类型图标（dings 字）不再与站名一并水平压扁；图标单独测宽后与压缩站名整组居中。
- 市域 D 型方向标画布宽度：先前 3400 只包括线路号和「往 xx」，未计入「下一站」段，属错误；改为 5100。

## [0.3.0] - 2026-08-03

对应 `package.json` 中的 `0.3.0`。相对 [0.2.1]：吊板**车型**（画布宽度档 + 按线路填充默认车型）、以及 Unreleased 积压的下载水印 / 叠层动效 / 主题表头等界面与依赖更新。版本号按 **MINOR** 递增（不低于 [0.2.0] 引入方向吊板压缩规则时的级别）。

### Added

- **车型**（生成设置）：`A型` / `B型` / `B型（长线路图）` / `市域D型`；当前站 / 方向标 / 线路图画布逻辑宽度随车型切换（A 保持原宽；B 方向与线路图 4602；B 长线路图 4602+3322；市域 D 为 2730 / 3400 / 5120）。
- 切换车型时按**线路图画布宽度差**同量调整「总长（px）」，下限钳制为 0。
- YAML `njMetroSettings.trainType` 读写；缺省回落当前工程车型。
- 「按线路填充站点」时按维基编组映射写入车型（市域 A/B → A/B；7 号线为 B 型长线路图）；16 / 18 号线编组待定：填充后提示「简办视频中编组未定」且不覆盖车型。
- 设置项「输入线路号后自动填充南京地铁线路色」（默认开启）：关闭后改主线路号或换乘线路号时不再自动套用官方色板底色 / 字色。
- `@umamichi-ui/chromatic-fringe`：指针驱动色差描边（顶栏底边、页面按钮与打开中的 `FloatingMenu` 面板）；顶栏控件跳过 box fringe。
- 「按线路填充站点」下拉：线路号左侧显示标志色圆点（开通线网用官方色，简办用 `resolveJianbanLine*`，含 16/18 虚拟参考色）。
- 依赖 `@umamichi-ui/windows-phone-motion`：为全屏浮层提供与 umamichi.moe 历史记录窗一致的 WPM 进出场时长与缓动。

### Changed

- 介绍区「个人网站」链接改为「更多工具」，指向 [umamichi.moe/tools](https://umamichi.moe/tools/)；README 项目入口同步更新。
- 贴纸下载：未勾选发布署名承诺时仍可下载，导出（PNG / JPEG / WebP / SVG）叠加水平重复的生成器水印；勾选后仍为干净导出。
- 下载弹窗排版：高度与格式并排、署名区用细线分隔；水印说明前置信息图标并提高对比度。
- 对话框排版统一：抽取共用细线分区 / 并排字段 / 信息提示样式；设置（间隔与最大项并排）、自动保存列表（列表滚动与底栏分离）、站点编辑（中英站名并排）、RMG / Metro Studio 工具窗与参考样例说明对齐下载弹窗模式。
- 中文项目名由「南京地铁屏蔽门上方贴纸生成器」改为「南京地铁屏蔽门吊板生成器」（页面标题、顶栏、「关于」、导出署名与 README）。
- 桌面端左右分栏：内容区够宽时（右栏亦可 ≥540px）左栏固定 540px、右栏占余下空间；未到移动端断点但右栏会不足 540px 时仍 1:1 分栏。
- 站点列表 / 换乘表表头由 `--gray-*` 改为 `--theme-*`（浅色底 `theme-200`；深色底 `theme-800`），随线路标识色换肤。
- 依赖 `@umamichi-ui/common-components` 升至 ^0.4.1：内容型叠层改用 `FullscreenOverlay` / 更新后的 `ConfirmDialogOverlay`（移动端全屏滑入 + 返回，桌面端居中对话框 + 关闭；叠层打开时锁定滚动并保留滚动条槽位）。
- 站点编辑 / 设置等对话框改为向壳组件传 `title` 与正文，避免移动端全屏下表单间距被拉散；设置表单在窄屏拉满宽度。
- 桌面浮层宽度改为 `width: min(100%, …)`（避免 `100vw` 含滚动条导致面板偏左）。
- 「关于」等界面展示的版本号为 `0.3.0`。

### Fixed

- 「关于」对话框：桌面端加宽至约 48rem（不再受 compact 400px 限制），链接允许换行，正文区 `overflow-x: clip`，消除窗口内水平滚动条。
- 浮层滚动锁不再使用 `body { position: fixed }`，并在断点切换时重挂毛玻璃层，修复窄屏打开再拉宽后背景变白、以及宽屏右侧多出一块毛玻璃的问题。

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

[Unreleased]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/kyuri-metro/njmetro-railmap-creator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kyuri-metro/njmetro-railmap-creator/releases/tag/v0.1.0
