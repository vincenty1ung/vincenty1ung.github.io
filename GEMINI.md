# Gemini 代码助手上下文

## 项目概述

这是一个静态的个人网站和博客项目，托管在 GitHub Pages 上，使用自定义域名 `blog.vincenty1ung.com`。

该网站使用原生 HTML、CSS 和 JavaScript 构建，并使用了多个库，包括：

*   **Material Design Lite:** 用于整体设计和 UI 组件。
*   **jQuery:** 用于 DOM 操作和事件处理。
*   **DPlayer & APlayer:** 用于视频和音频播放。
*   **Valine:** 用于评论功能。
*   **LazyLoad:** 用于图片懒加载。

项目结构表明它采用单页应用（SPA）的方式，其中主 `index.html` 文件作为模板，并动态加载其他 HTML 文件（如 `web/home/index.html`）中的内容。

## 核心诉求

1. 当前项目是个人博客，但核心是web/photography/下的所有数据（这是一个摄影作品的博客）
2. 用户既是程序员，也是摄影师，
3. 后续相关的功能迭代都在web/photography/中
4. photography中所有图片作品都是静态资源，暂时没有做后端接口调用获取，并用前端渲染的方式（未来可能会考虑实现）

## 摄影作品管理指南

有关如何添加新的年份作品集的详细指南，请参阅 [PHOTOGRAPHY_GUIDE.md](PHOTOGRAPHY_GUIDE.md) 文件。
该指南包含了添加新年份照片的完整步骤，包括：
- 文件准备和目录结构
- HTML文件创建和格式要求
- JavaScript加载脚本更新
- 验证和测试步骤

## 构建与运行

这是一个静态网站，因此文件可以由任何标准的 Web 服务器提供服务。

### 依赖

该项目使用 Node.js 和 `npm` 管理开发依赖。要安装它们，请运行：

```bash
npm install
```

### 构建流程

根据 `package.json` 中的依赖项，该项目使用 `gulp` 进行资产优化（压缩 CSS、JS 和图片）。但是，项目根目录中没有找到 `gulpfile.js`。

假设是标准设置，构建过程可能会通过如下命令运行：

```bash
# TODO: 验证确切的构建命令。
gulp
```

这将处理源文件并将优化后的文件输出到 `build` 或 `dist` 目录。

## 开发约定

*   **模块化内容:** 网站不同部分的主要内容保存在单独的 HTML 文件中（例如，在 `web/home/`、`web/photography/`、`web/timeline/` 目录中），并可能被加载到主 `index.html` 模板中。
*   **资产管道:** 使用基于 `gulp` 的管道来压缩和优化资产。源文件位于 `web/css` 和 `web/js` 等目录中，优化后的文件可能会被放置在分发文件夹中。
*   **样式:** 网站以 Material Design Lite 为基础，自定义样式在 `web/css/Style.css` 中定义。
*   **JavaScript:** 用于客户端功能的自定义 JavaScript 位于 `web/js/index.js`。