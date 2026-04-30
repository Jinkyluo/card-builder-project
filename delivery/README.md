# Card Studio（card-studio）源码交付说明

本目录用于存放对外交付的 **源码压缩包**（不含 `node_modules`、不含 `.next` 构建产物、不含 `.git` 历史），便于同事解压后按标准流程安装依赖并运行。

## 包内应包含

- 完整项目源码与 `package-lock.json`
- 项目根目录 `README.md`（功能与技术栈说明）
- 本文件与打包时生成的 `BUILD_INFO.txt`（版本与打包记录）

## 环境要求

- **Node.js**：建议 **18.18+** 或 **20 LTS**（与 `package.json` 中 `engines` 一致）
- **npm**：**9+**（建议使用 `npm ci` 复现 lockfile）

无需额外 `.env` 文件即可本地开发与构建（当前仓库未使用服务端密钥类环境变量）。

## 解压后操作（首次）

在解压后的项目根目录（可见 `package.json`）执行：

```bash
npm ci
```

若本地无 lockfile 同步需求，也可使用：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

浏览器访问：<http://localhost:3000>

生产构建与本地启动生产模式：

```bash
npm run build
npm run start
```

代码检查：

```bash
npm run lint
```

## 常见问题

- **安装很慢或失败**：检查 Node 版本、网络；必要时切换 npm 镜像或公司内源。
- **PDF 导出相关**：依赖服务端路由 `app/api/export/pdf`，需在 Node 环境运行（`next dev` / `next start`），而非纯静态托管。
- **需要 Git 历史**：请直接向仓库克隆对应分支/标签，而不是仅依赖本 zip。

## 重新生成交付包

在项目根目录执行：

```bash
./scripts/package-delivery.sh
```

生成的 zip 位于 `delivery/` 目录，文件名形如：`card-studio-v<版本>-source.zip`。
