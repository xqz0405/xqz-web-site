# XQZ 技术知识库

个人技术学习笔记网站，基于 Astro 构建，通过 GitHub Actions 自动部署。

## 技术栈

- **框架**: Astro (静态站点生成)
- **内容**: Markdown 文章，通过 Git 子模块管理
- **部署**: GitHub Actions → rsync 到服务器

## 项目结构

```
xqz-web-site/
├── src/
│   ├── components/    # 组件 (Sidebar 等)
│   ├── content/       # 文章内容 (由脚本从子模块预处理生成)
│   ├── layouts/       # 页面布局
│   ├── pages/         # 路由页面
│   └── styles/        # 全局样式
├── scripts/
│   ├── preprocess.mjs       # 预处理：从子模块复制文章到 content
│   └── update-submodule.mjs # 一键更新子模块并推送
├── xqz-web/                 # 文章子模块 (xqz-Knowledge_base)
├── .github/workflows/       # CI/CD 配置
└── astro.config.mjs
```

## 知识分类

| 分类 | 图标 | 路径 |
|------|------|------|
| Go | 🟢 | `/go` |
| Node.js | 🟠 | `/nodejs` |
| Python | 🔵 | `/python` |
| Web 前端 | 🟡 | `/web-前端` |

## 本地开发

```bash
npm install
npm run dev
```

## 文章更新流程

文章在 [xqz-Knowledge_base](https://github.com/xqz0405/xqz-Knowledge_base) 仓库维护，本仓库通过子模块引用。

文章仓库有新提交后，运行：

```bash
node scripts/update-submodule.mjs
```

脚本会自动更新子模块指针、提交并推送，CI/CD 随即重新构建部署。

## 手动构建

```bash
npm run build     # 预处理 + 构建
npm run preview   # 本地预览构建结果
```
