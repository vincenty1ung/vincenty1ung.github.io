# IFLOW - Vincent's Portfolio Project

## 项目概述

这是一个个人作品集网站项目，托管在 GitHub Pages 上，使用自定义域名 `blog.vincenty1ung.com`。项目包含个人摄影作品展示、Cydia 软件仓库、以及一些实用工具页面。

## 技术栈

- **前端框架**: 原生 HTML、CSS、JavaScript
- **UI 组件**: Material Design Lite
- **媒体播放**: DPlayer & APlayer
- **评论系统**: Valine
- **图片懒加载**: LazyLoad
- **构建工具**: Gulp (用于资源优化)
- **部署平台**: GitHub Pages

## 项目结构

```
├── web/
│   ├── photography/          # 摄影作品集
│   │   ├── src/             # 源文件目录
│   │   ├── dist/            # 构建输出
│   │   └── index.html       # 主页面
│   ├── home/                # 主页相关文件
│   ├── css/                 # 样式文件
│   ├── js/                  # JavaScript 文件
│   ├── img/                 # 图片资源
│   ├── fonts/               # 字体文件
│   └── timeline/            # 时间线页面
├── cydia/                   # Cydia 软件仓库
│   ├── builddebs/           # 构建的 deb 包
│   ├── debs/                # deb 包文件
│   ├── img/                 # 相关图片
│   └── json/                # 配置文件
├── java/                    # Java 相关项目
│   ├── jmeter/              # JMeter 测试
│   └── spring/              # Spring 项目
├── index.html               # 主入口文件
├── package.json             # Node.js 依赖配置
└── README.md               # 项目说明
```

## 主要功能

### 1. 摄影作品集
- 响应式设计，支持移动端和桌面端
- 图片懒加载和预加载优化
- 使用 Fancybox 实现图片画廊效果
- 支持音乐播放器集成

有关如何添加新的年份作品集的详细指南，请参阅 [PHOTOGRAPHY_GUIDE.md](PHOTOGRAPHY_GUIDE.md) 文件。
该指南包含了添加新年份照片的完整步骤，包括：
- 文件准备和目录结构
- HTML文件创建和格式要求
- JavaScript加载脚本更新
- 验证和测试步骤

### 2. Cydia 软件仓库
- 提供 iOS 越狱应用的 deb 包托管
- 自动生成 Packages 索引文件
- 支持软件包版本管理和更新

### 3. 实用工具
- YAML 到 Properties 格式转换器
- 其他开发工具页面

## 构建和运行

### 依赖安装
```bash
npm install
```

### 开发构建
```bash
# 使用 Gulp 进行资源优化
gulp
```

### 部署
项目通过 GitHub Pages 自动部署，推送到 main 分支即可自动发布。

## 开发约定

- **模块化结构**: 不同功能模块分离到独立目录
- **资源优化**: 使用 Gulp 进行 CSS、JS 和图片压缩
- **响应式设计**: 支持多种设备屏幕尺寸
- **性能优化**: 图片懒加载、资源预加载

## 特色功能

1. **背景视频**: 主页使用全屏背景视频展示
2. **摄影作品分类**: 按年份和主题组织摄影作品
3. **音乐播放器**: 集成音乐播放功能
4. **社交链接**: 集成 Instagram、Last.fm 等社交平台
5. **暗色主题**: 支持系统暗色模式

## 注意事项

- 摄影作品目录中的图片均为静态资源，目前没有后端接口
- Cydia 仓库需要定期更新 Packages 索引文件
- 项目使用相对路径引用资源，确保部署路径正确

## 未来发展

- 考虑添加后端 API 支持动态内容加载
- 实现用户评论和互动功能
- 添加更多实用工具页面
- 优化移动端用户体验