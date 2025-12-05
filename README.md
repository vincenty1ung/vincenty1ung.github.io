# Vincent's Personal Website & Blog

<p align="center">
  <img alt="Logo" src="web/before/img/logo1.jpg" width="100">
</p>

<p align="center">
  <strong>程序员 & 尼康摄影师</strong>
</p>

<p align="center">
  <a href="https://blog-vincent.chyu.org">🌐 访问网站</a>
</p>

## 项目概述

这是一个静态生成的个人网站，托管于 GitHub Pages。它不仅是我的技术博客，也是我的摄影作品集展示平台。

主要包含以下部分：
- **Blog**: 技术文章与生活随笔。
- **Photography**: 摄影作品画廊，支持按年份归档、EXIF 信息展示和沉浸式预览。
- **Timeline**: 个人时间轴。

## 技术栈

- **前端**: 原生 HTML/CSS/JavaScript (无重型框架依赖)
- **样式**: Material Design Lite (MDL) + 自定义 CSS
- **交互**: jQuery, Fancybox (画廊), LazyLoad (懒加载)
- **评论**: Valine
- **自动化**: Go (用于照片处理和数据生成)
- **存储**: Cloudflare R2 (图片 CDN)

## 摄影工作流 (Photography Workflow)

摄影板块采用了自动化的工作流来管理大量高画质照片：

1.  **本地管理**: 照片按年份存放在 `web/photography/gallery_images/` 目录。
2.  **自动化处理**: 使用 Go 脚本 (`scripts/update_photos.go`) 扫描目录。
    -   自动提取 EXIF 元数据（光圈、快门、ISO 等）。
    -   自动生成 WebP 格式的高效缩略图。
    -   自动上传原图和缩略图到 Cloudflare R2 对象存储。
3.  **数据驱动**: 脚本生成 `photos.json`，前端通过 JavaScript 动态渲染画廊，无需手动修改 HTML。

详细的脚本使用文档请参考：[scripts/README.md](scripts/README.md)

## 本地开发

### 依赖

- Node.js & npm
- Go (用于运行自动化脚本)
- `exiftool` (用于提取照片元数据 - 脚本会自动尝试安装，或使用 `brew install exiftool` 手动安装)

### 运行

```bash
# 安装依赖
...

# 启动本地服务器 (使用 Go 编写的简单文件服务器，解决 CORS 问题)
go run scripts/serve.go
```

访问 `http://localhost:8080` 即可预览。

## License

Apache License 2.0
