# Brush Atlas

参考 `ref.mp4` 开发的动态笔刷实验网站。源代码在 `web/`，参考视频和应用由同一个 Git 仓库管理。

## 本地开发

需要 Node.js 24+（测试使用 Node 的 TypeScript 类型剥离功能）。

```powershell
cd web
npm ci
npm run dev
```

开发地址以终端实际输出为准，默认为 `http://localhost:3000`。

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## 体验

- **NYC subway lines**：平行线路、站点、换乘标记、真实纽约站名和移动列车光标。线路构图是虚构的，不是导航地图。
- **Little figures**：沿手势排列建筑立面小人，含步行、站立、举手、轮椅和宠物等变体，带轻微动态。
- **Gunpla components**：原创程序化装甲与关节零件、浇口连接、板件细节和编号。
- 支持鼠标、触屏和触控笔输入，小人尺寸支持压力变化；三种笔刷可叠加。参数应用于后续笔画。
- 自动构图、随机变体、暂停、网格开关、平移、缩放、撤销与重做。
- 导出 2400 × 1968 PNG，不包含工具栏和网格。绘画暂存在当前页面，刷新会重置。
- 快捷键：`1/2/3` 选笔刷，`B/H` 绘画/平移，空格暂停，`0` 适配画布，`Ctrl/⌘ Z` 撤销，`Ctrl/⌘ Shift Z` 重做。

## 部署

线上地址：**https://iizzaya.github.io/project-brush/**（GitHub Pages，个人网站画廊通过 iframe 同域嵌入）。

管线：push 到 `main` → `.github/workflows/deploy.yml`（npm ci → typecheck → test → `vinext build` → `prerender`）→ 部署 `web/dist/client/project-brush/` 静态产物。仓库 Pages Source 为 **GitHub Actions**。

`next.config.ts` 设有 `basePath: '/project-brush'`；vinext beta.5 的 basePath 与 `output: 'export'` 不能同用，故由 `web/scripts/prerender.mjs` 启动构建产物 worker 冻结 SSR HTML（`npm run prerender`），public 资源一并复制进产物目录。

## 实现

React 19 + TypeScript + Vinext/Vite，交互控件基于 Base UI / Shadcn。采用 Canvas 2D 绘制细线与文字，无需 WebGPU。浏览器负责画布合成。

`lib/brush-engine.ts` 将笔迹按弧长重新采样，用种子随机数生成稳定的站点、人物和零件；`hooks/use-brush-canvas.ts` 管理指针捕获、坐标转换、历史与缓存。静态画层缓存，动态列车单独绘制，小人以 12 Hz 更新；像素密度上限为 2，单笔最多 5000 个点，历史保留 30 个操作。遵循系统减少动态效果偏好。

支持可选的 `document.modelContext` 工具注册：`read_drawing` 和 `compose_drawing`。未支持该实验 API 的浏览器继续使用普通界面。契约由模拟注册器测试覆盖；未在支持该 API 的浏览器环境中验证。

## 项目结构

```text
ref.mp4                 参考视频
web/app/                工作台布局、主题、元信息
web/hooks/              画布控制与历史
web/lib/brush-engine.ts  三种生成笔刷
web/lib/webmcp.ts        可选的智能体工具
web/tests/              采样、确定性与工具契约测试
web/.openai/hosting.json Sites 项目标识
```

测试包括稀疏/密集输入的一致性、拐角余量、压力插值、随机确定性、组合几何与工具参数验证。生产构建和 TypeScript 检查单独执行。Lint 检查应用源码，不修改或检查脚手架附带但未使用的 UI 组件。没有执行浏览器端交互自动化测试。
