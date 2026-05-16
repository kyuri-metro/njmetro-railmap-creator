# 聊天记录原文

自用户提问「为什么感觉在 ios 上会发虚呢」起，至「请问如何知道 maxCanvas？」相关回复为止。  
导出本文件前的后续指令（写入 `docs/`）未列入正文。

---

## 用户

为什么感觉在 ios 上会发虚呢

---

## 助手

在 iOS（尤其是用手机 Safari/WebKit）上觉得「发虚」，常见有几类原因，和你们现在的实现也对得上几条。

### 1. 屏上预览：矢量被 CSS 按屏宽缩小

预览里的 `.badge-svg` 是 **`width: 100%`**，在 **Retina** 上实际是「很宽的 viewBox → 只占屏幕逻辑宽度」，系统会用亚像素缩放来画矢量。矢量本身仍是解析的，但**细线和文字在缩小后会显得比纸上软**，这跟是不是 iOS 也有关（抗锯齿、`transform`/`scale`）。你们还有 `direction-badge-preview-wrap` 上的 **`transform: scale(0.2)`** 等小窗口预览，缩放更容易带来「肉眼发糊」的主观感受。

```951:956:src/styles.css
.badge-svg {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--site-border);
  background: var(--site-surface);
}
```

### 2. 导出图：宽幅 ×2 以后可能顶住 iOS Canvas 上限（容易真糊）

光栅导出是「按 **viewBox 尺寸 × `RASTER_EXPORT_PIXEL_SCALE`(2)**」建 `canvas`。  
方向牌大约 **7944×1600**，线位牌大约 **14824×1600** 量级（宽约 `3972×2`、`7412×2`，高 `800×2`）。

iOS Safari 对 **单行/列 canvas 的最大像素宽度**经常有上限（历史上常见到 **8192** 这档，会因系统/机型变化）。宽高一旦超限，有时会 **静默缩小、退回或走备用路径**，结果就是你看到的 **发虚**。  
这一条**和「为什么在 iPhone 上特别明显」**很吻合：桌面 Chrome 往往能撑更大 canvas，体感差异大。

你们导出里是一次性 `canvas.width / height = 缩放后像素` 再 `drawImage`，没有分块导出：

```157:209:src/App.tsx
  const logical = getSvgExportPixelSize(svgElement);
  const width = Math.round(logical.width * RASTER_EXPORT_PIXEL_SCALE);
  const height = Math.round(logical.height * RASTER_EXPORT_PIXEL_SCALE);
  // ...
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // ...
  context.drawImage(image, 0, 0, width, height);
```

### 3. 有损格式自带「软边」

**JPEG/WebP（quality 0.92）**会比 PNG 少一点锐利感，放大看更容易觉得「羽化」，这不是 iOS 独有，但在相册里放大更明显。

---

**简短结论：**  
- 若在**网页预览**里糊：多数是 **缩放 + Retina +（方向牌外层）变换**的视觉问题。  
- 若在**导出文件**里糊：要特别怀疑 **巨幅 canvas + iOS Safari 限制**，宽幅牌（方向/线路）最明显；可对比同设备用 **PNG**、以及用 **更小导出倍率试一张**验证。

若要彻底改善导出在 iPhone 上的表现，方向上一般是：**检测 `maxCanvas` / 单侧像素上限**，超标时改用 **分批绘制再拼成 Blob**或 **降低倍数/限制最大宽度**、或 **矢量下载后本地再转**。你如果说一下是「预览糊」还是「下载下来在相册里糊」、以及是哪个贴纸（当前站 / 方向 / 线路），可以针对性判断是否就是 canvas 顶格问题。

---

## 用户

请找到相应的 iOS 或 Chromium 文档

---

## 助手

下面这两条是和你前面讨论的「Canvas 画布尺寸上限 / 被拒或降级」最直接对应的 **引擎侧依据**（不是营销文档）。

---

### WebKit（驱动 iOS Safari 等）

- **源码：** [`CanvasBase.cpp` 里的 `maxCanvasArea()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp)（约第 109–117 行）  
  - 对 **`PLATFORM(IOS_FAMILY)`** 使用 **`8192 * 8192`** 作为**最大画布面积（像素乘积）**，非 iOS 族为 **`16384 * 16384`**。  
  - [`validateArea()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp) 会在超过该面积时控制台告警：  
    `Canvas area exceeds the maximum limit (width * height > …)`  

- **这一上限在 iOS 上如何从 4096×4096「面积语义」升级到 8192×8192 的变更记录：**  
  - [WebKit Bug 271002](https://bugs.webkit.org/show_bug.cgi?id=271002)  
  - 合并 PR：[WebKit/WebKit #25901 – [iOS] Increase the limit on the canvas size to 8192x8192](https://github.com/WebKit/WebKit/pull/25901)（正文写明：原先 iOS **4096×4096**，后因 jetsam 限制放宽而将 canvas 上限加倍。）

Apple 没有像 MDN 那样单独写一篇「Safari Canvas 最大尺寸」的开发者手册；**数值以 WebKit 源码为准**，上面是第一个权威入口。

---

### Chromium（Blink，Chrome / Android Chrome / 多数 Chromium 内核浏览器）

- **源码：** [`canvas_rendering_context_host.cc` 中的 `CanvasRenderingContextHost::IsValidImageSize()`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/canvas/canvas_rendering_context_host.cc)（约第 154–173 行）  
  - 最大面积为 **`32768 * 8192`**（注释里写明按**面积**限制、并与 Firefox 的维度上限策略对比）。  
  - 另有一条 **Skia 侧宽高上限 `65535`**（同函数内）。

可读的在线浏览同源文件：  
https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/canvas/canvas_rendering_context_host.cc

---

### 规格说明（不规定具体像素上限）

- **HTML：** [Canvas § bitmap dimensions（WHATWG）](https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-bitmap.dimensions)  

标准只描述「位图宽高」语义，**不规定**各家引擎的最大宽高/面积——所以查「Safari/Chromium 允许多大」时必须落到 **WebKit/Blink 源码**或上述议题/PR。

若你还关心 **`toBlob` / WebP**，那是另一条线（MIME 与编码支持），可查 [MDN `HTMLCanvasElement.toBlob()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)（附实现说明）；需要的话我也可以帮你对那条再补官方/引擎链接。

---

## 用户

请问如何知道 maxCanvas？

---

## 助手

浏览器**没有公开标准属性**会直接告诉你「maxCanvas 是多少」。实务上只能靠 **引擎源码/发行说明（已知常数）** 或 **`try`/`probe`（未知环境）**。

## 1. 查「已知」上限（你已盯 WebKit/Chromium）

- **WebKit（含 iOS）：** [`CanvasBase.cpp` → `maxCanvasArea()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp)（iOS 族当前是 **`8192 * 8192` 的面积上限**）。
- **Chromium：** [`canvas_rendering_context_host.cc` → `IsValidImageSize()` 里的 `kMaxCanvasArea` / `kMaxSkiaDim`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/canvas/canvas_rendering_context_host.cc)。

这是唯一能**精确对上数字**的途径；运行时 API 没有这个数。

## 2. 在页面里「量出来」（任意浏览器/机型）

思路：逐级放大 `canvas.width` / `height`，看 **是否真的可用**——常见判据任选其一或多选：

1. `getContext('2d')` 是否为 `null`（一般不会因尺寸大变 null，不可靠单用）。
2. 设宽大后 `canvas.width`、`canvas.height` 读回是否与设定一致（部分环境会静默改小）。
3. 画一两笔后 **`toDataURL` / `toBlob` 能否得到非极简数据**，或 **`getImageData`** 不报异常。

面积型限制可以这样探（和你们导出类似：大尺寸 `width × height`）：

```ts
function probeMaxCanvasSide(maxSide = 16384): number {
  for (let s = maxSide; s >= 1; s = Math.floor(s / 2)) {
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    ctx.fillRect(0, 0, 1, 1);
    try {
      if (c.toDataURL('image/png').length > 300) return s;
    } catch {
      continue;
    }
  }
  return 0;
}
```

要测的是 **你们要用的那一组 `(w, h)`**，最好按**真实导出宽高**测，因为限制多是 **`width × height` 面积**，不是「单边 ≤ 8192」这种简单形状。

## 3. 注意误差点

- **超限**有时是 **整块失败/读回变小/控制台告警**，体感是「导出糊／空白／失败」，要配合探针或对失败路径打日志。
- **设备像素比 DPR** 一般改变的是 CSS 缩放，和你们设置的 **bitmap `width`/`height`** 不是一回事；探测要用与导出一致的逻辑像素宽高。
- 不同页（主文档 / iframe / WKWebView / 隐私模式）内存压力不同，**上限可能略浮动**，所以不要假设「台式机探一次就够」——若产品是 **iPhone 导出**，应在 **同源的真实 Safari** 里探或使用遥测采样。

如果你们要在项目里加一个「导出前 `_capSizeForCanvas`」的辅助函数，可以说一下希望的 API（同步测一次 / 缓存结果 / 按比例缩小），我可以按你们 `App.tsx` 的流程直接接上。
