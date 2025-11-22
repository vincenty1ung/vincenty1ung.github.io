# 自动化脚本文档

## 概述

本项目包含一组 Go 脚本，用于自动化管理摄影作品集。主要功能包括：
1.  **照片扫描与元数据提取**：扫描本地目录，提取 EXIF 信息（拍摄日期、参数、器材等）。
2.  **智能缩略图生成**：自动生成 WebP 格式的高质量缩略图。
3.  **R2 云存储同步**：将原图和缩略图自动上传到 Cloudflare R2，支持增量上传。
4.  **数据生成**：生成包含完整元数据和 CDN 链接的 `photos.json`，供前端画廊使用。

## 核心脚本

### `update_photos.go`

这是主程序，负责协调整个流程。

**功能特性：**

-   **EXIF 数据提取**：
    -   使用 `exiftool` 提取详细的拍摄参数（光圈、快门、ISO、焦距等）。
    -   **智能日期解析**：优先从 EXIF (`DateTimeOriginal`, `CreateDate`) 获取拍摄日期；如果失败，自动回退到从文件名 (`DSC_YYYY-MM-DD_*.jpg`) 解析；最后回退到目录年份。
    -   **数据优化**：为了减小 `photos.json` 体积，脚本会过滤 EXIF 数据，仅保留前端展示所需的关键字段（白名单机制）。
-   **JSON 生成**：
    -   生成 `web/photography/photos.json`。
    -   **压缩输出**：生成的 JSON 文件经过压缩（Minified），以减少网络传输大小。
-   **R2 同步集成**：调用 `r2_client.go` 处理文件上传。
-   **缩略图处理**：调用 `image_processor.go` 生成 WebP 缩略图。

### `r2_client.go`

封装了 Cloudflare R2 (S3 兼容) 的操作。

-   **增量上传**：上传前检查文件是否存在，避免重复上传。
-   **CDN 链接生成**：返回配置好的 CDN 域名链接。

### `image_processor.go`

负责图片处理。

-   **WebP 转换**：将图片转换为高效的 WebP 格式作为缩略图。
-   **尺寸调整**：默认将缩略图宽度调整为 800px，保持原始宽高比。

## 环境配置

在 `scripts/` 目录下创建 `.env` 文件（**不要提交到 Git**）：

```env
NUXT_PROVIDER_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
NUXT_PROVIDER_S3_BUCKET=photography
NUXT_PROVIDER_S3_REGION=auto
NUXT_PROVIDER_S3_ACCESS_KEY_ID=<YOUR_ACCESS_KEY>
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY>
NUXT_PROVIDER_S3_CDN_URL=https://<YOUR_CDN_DOMAIN>
```

## 使用方法

### 1. 准备照片

将处理好的照片放入 `web/photography/gallery_images/YYYY/` 目录中。
建议文件名格式：`DSC_YYYY-MM-DD_description.jpg`。

### 2. 运行脚本

在项目根目录下运行：

```bash
go run scripts/update_photos.go scripts/r2_client.go scripts/image_processor.go
```

### 3. 验证

脚本运行完成后：
1.  检查终端输出，确认没有错误 (`❌`)。
2.  查看 `web/photography/photos.json` 是否更新。
3.  启动本地服务预览网页效果。

## 数据结构 (`photos.json`)

生成的 JSON 结构如下（经过压缩，此处格式化仅供参考）：

```json
[
  {
    "year": "2025",
    "photos": [
      {
        "filename": "DSC_2025-11-09_001.jpg",
        "path": "https://cdn.../DSC_2025-11-09_001.jpg",
        "thumbnail": "https://cdn.../thumbnails/DSC_2025-11-09_001.webp",
        "date": "2025-11-09",
        "exif": {
          "Model": "NIKON Z f",
          "FNumber": 1.8,
          "ISO": 100,
          ...
        }
      }
    ]
  }
]
```

## 常见问题

-   **EXIF 读取失败**：请确保系统已安装 `exiftool`。脚本会尝试从文件名解析日期作为回退。
-   **上传失败**：检查 `.env` 配置和网络连接。
