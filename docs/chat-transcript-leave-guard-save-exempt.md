# 聊天记录原文

> 以下内容为 Cursor Agent 根据本对话整理的聊天记录原文；工具调用细节已省略为 `[REDACTED]`。
>
> 主题：导出 YAML 后的离开提示「保存豁免」、实现方案与落地。

---

## 用户

保存以后如果没有修改撤销栈或进行撤销或恢复操作，应该不显示离开提示
也就是保存以后设置一个 flag（「保存豁免」）为 true，在修改撤销栈或进行撤销或恢复操作的情况下再设为 false
你打算如何实现？

---

## 助手

[REDACTED：查看项目中离开提示、保存与撤销栈的现有实现]

当前离开提示只挂在 `beforeunload` 上，条件等价于「撤销栈非空」（`canUndo`）。导出 YAML（`handleExportStationYaml`）不会 `clearHistory`，所以保存后 `past.length` 仍大于 0，刷新/关页仍会弹浏览器默认确认——这正是要用「保存豁免」消掉的情况。

### 目标条件

离开是否提示：

```text
shouldWarnOnLeave = (past.length > 0) && !saveExempt
```

- `saveExempt === true`：刚保存到磁盘，且自保存以来**没有**改动撤销栈、也**没有**做过撤销/重做 → 不提示。
- 其余与现在一致：`past` 为空（新建/导入后 `clearHistory` 等）本来就不提示。

### 状态放哪

与 `autosaveScheduler.ts` 一样，用**模块级布尔**即可，例如 `src/features/leaveGuard.ts`：

```ts
let saveExempt = false;

export const markSavedExempt = () => { saveExempt = true; };
export const clearSavedExempt = () => { saveExempt = false; };

export const shouldWarnOnLeave = (state: RootState) =>
  state.generator.past.length > 0 && !saveExempt;
```

不必放进 Redux，也不必 `useState`：`beforeunload` 要在事件回调里读**当下**值，在回调里 `store.getState()` + 模块标志最稳。

### 何时置 `true`

只在**用户主动导出 railmap YAML** 成功路径末尾调用 `markSavedExempt()`，即现有的 `handleExportStationYaml`（顶栏、移动端「更多」都走同一函数即可）。

不放在：

- 定时自动保存（`autosaveScheduler`）
- Kyuri RMG 导出（若语义不是「本站文档已落盘」）
- 导入 / 新建 / 恢复自动保存（会 `clearHistory`，`past` 已空，豁免与否无影响，但可在 `clearHistory` 时顺带 `clearSavedExempt()` 保持语义干净）

### 何时置 `false`（集中在一个 listener）

在 `store.ts` 里再加一个 `createListenerMiddleware`（或扩展现有 listener），与自动保存并列：

| 触发 | 原因 |
|------|------|
| `isGeneratorMutationAction(action)` | 任何会进撤销栈的编辑 |
| `@@redux-undo/UNDO` / `@@redux-undo/REDO` | 用户撤销/重做会改变「相对上次保存」的有效内容 |
| （可选）`@@redux-undo/CLEAR_HISTORY` | 重置豁免，避免状态残留 |

`effect` 里统一 `clearSavedExempt()`。

这样不必在 `applyUndo` / `applyRedo`、每个 `dispatch` 站点操作处手写，键盘快捷键和按钮走同一条路。文档里也写过：undo/redo **不会**走 `isGeneratorMutationAction`，所以必须单独匹配 redux-undo 的 action type（可用 `ActionTypes.UNDO` 等）。

与自动保存 listener **分开** 更清晰：自动保存仍只在 mutation 时 `markAutosaveDirty`；豁免只在「导出 + 栈/undo 变化」上动。

### 改 `beforeunload`

原先 `App.tsx` 中：

```ts
useEffect(() => {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!canUndo) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  };
  // ...
}, [canUndo]);
```

改为在回调内实时判断，例如：

```ts
const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!shouldWarnOnLeave(store.getState())) return;
  event.preventDefault();
  event.returnValue = '';
};
```

`useEffect` 依赖可改为 `[]`（始终读最新 store + 豁免标志）。

### 与现有「控件草稿未提交」的关系

总长/线路号等用 `*DirtyRef` + debounce 才写入 Redux。导出用的是 `generator`（`present`），未 flush 的草稿不会进 YAML，也不会进撤销栈。豁免只跟撤销栈对齐，**不会**因为顶栏里未提交的草稿而继续豁免；若以后要「未提交草稿也算未保存」，需要另做 draft dirty，与本次 flag 正交。

### 行为核对（用例）

| 操作 | 提示？ |
|------|--------|
| 编辑 → 导出 YAML → 直接关页 | 否（有 past，但 `saveExempt`） |
| 导出 → 再改站点/参数 | 是（mutation 清豁免） |
| 导出 → Ctrl+Z | 是（UNDO 清豁免） |
| 导出 → Ctrl+Y（若曾撤销） | 是（REDO 清豁免） |
| 从未编辑 / 新建后 | 否（`past` 空） |
| 仅编辑、未导出 | 是（与现网一致） |

**小结**：`saveExempt` 模块变量 + 导出时 `mark` + store listener 在 mutation 与 UNDO/REDO 时 `clear` + `beforeunload` 用 `shouldWarnOnLeave(store.getState())`。不碰撤销栈本身，保存后仍可撤销，只是「相对磁盘基准」未变时不拦离开。

若要我在仓库里直接改，需要切换到 Agent 模式。

---

## 用户

请实现

---

## 助手

[REDACTED：实现 `src/features/leaveGuard.ts`、扩展 `src/store.ts` listener、更新 `src/App.tsx` 的 `beforeunload` 与 `handleExportStationYaml`；`npm run build` 通过]

已实现「保存豁免」逻辑，构建通过。

### 变更摘要

**`src/features/leaveGuard.ts`**（新建）

- `markSavedExempt()`：导出 YAML 后设为 true
- `clearSavedExempt()`：撤销栈有变动时清掉
- `shouldWarnOnLeave(state)`：`past.length > 0 && !saveExempt`

**`src/store.ts`**

- 增加 `leaveGuardListener`：在 generator mutation、`UNDO`、`REDO`、`CLEAR_HISTORY` 时调用 `clearSavedExempt()`

**`src/App.tsx`**

- `handleExportStationYaml` 下载成功后调用 `markSavedExempt()`
- `beforeunload` 改为用 `shouldWarnOnLeave(store.getState())` 判断（不依赖 React 里的 `canUndo` 闭包）

**`CHANGELOG.md`**

- 在 `[Unreleased]` → `Added` 中补充：导出 YAML 后、再次编辑或撤销/重做之前不再提示离开

### 行为

| 场景 | 是否提示离开 |
|------|----------------|
| 有编辑历史 → 导出 YAML → 直接关页 | 否 |
| 导出后改数据 / 撤销 / 重做 | 是 |
| 从未编辑或已 `clearHistory` | 否（与原先一致） |

自动保存、Kyuri RMG 导出不会触发豁免；只有顶栏/菜单的 YAML 导出会。

---

## 用户

请把以上聊天记录原文写进 docs/ 下的 md 文件中，编写不修改版本号的 changelog，提交

---
