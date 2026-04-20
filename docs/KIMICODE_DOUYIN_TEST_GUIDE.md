# KimiCode 安装、启动与抖音下载测试说明

本文档用于在另一台机器上，用 KimiCode 对 `ac_douyin` 项目做可复现的抖音下载功能验证。

## 1. 目标

验证以下链路是否可用：

1. 抖音分享文案/短链可被正确解析。
2. 能创建下载任务并成功落盘视频。
3. 下载结果可在项目目录中看到 `input.mp4`（以及可能的 `input.srt`）。
4. 专用测试页 `/douyin-test` 可独立验证该功能。

## 2. 环境要求

- 操作系统：macOS / Linux
- Python：`3.10+`（建议 `3.11`）
- Node.js：`18+`
- Redis：`6+`
- FFmpeg：已安装并在 `PATH`
- 网络：可访问抖音链接

## 3. 拉取代码

```bash
git clone https://github.com/zhangdiai/ac_douyin.git
cd ac_douyin
```

## 4. 安装依赖

### 4.1 后端依赖

```bash
python3 -m venv venv
source venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### 4.2 前端依赖

```bash
cd frontend
npm install
cd ..
```

### 4.3 环境变量

```bash
cp env.example .env
```

说明：
- 仅测试抖音下载时，不一定依赖大模型 Key。
- 如果后续要跑完整 AI 切片流程，再补齐 `.env` 里的模型相关配置。

## 5. 启动服务（推荐手动启动，便于排错）

打开 3 个终端窗口。

建议先统一设置端口环境变量（可直接复制）：

```bash
export BACKEND_PORT=8000
export FRONTEND_PORT=8080
export REDIS_PORT=16379
export REDIS_URL=redis://localhost:${REDIS_PORT}/0
```

前端网络配置说明（与当前代码一致）：
- 前端 `src` 内接口已去掉固定 `localhost:8000` 写死地址。
- 可通过 `VITE_API_TARGET` 显式指定后端地址（例如 `http://127.0.0.1:8001`）。
- 若不设置 `VITE_API_TARGET`，前端会按 `BACKEND_PORT` 组装 API 地址。

端口约束说明（重要）：
- 若测试环境限制 `8000` 以下端口不可用，请使用本文默认端口：后端 `8000`、前端 `8080`。
- 若 `8000` 也被占用，可改后端到 `8001` 或 `18000`。当前前端代理已支持从环境变量读取后端端口（`BACKEND_PORT` / `VITE_API_TARGET`）。

### 终端 A：启动 Redis

macOS（Homebrew）：

```bash
brew services start redis
redis-cli -p 6379 ping
```

Linux（systemd）：

```bash
sudo systemctl start redis
redis-cli -p 6379 ping
```

返回 `PONG` 即正常。

如果环境限制 `<8000` 端口不可用，建议直接以高端口启动 Redis（如 `16379`）：

```bash
redis-server --port 16379 --daemonize yes
redis-cli -p 16379 ping
```

并在启动后端前设置：

```bash
export REDIS_URL=redis://localhost:16379/0
```

### 终端 B：启动后端 API（端口 8000）

```bash
cd /path/to/ac_douyin
source venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

健康检查：

```bash
curl http://127.0.0.1:8000/api/v1/health/
```

### 终端 C：启动前端（端口 8080）

```bash
cd /path/to/ac_douyin/frontend
npm run dev -- --host 0.0.0.0 --port 8080
```

访问：
- 首页：`http://127.0.0.1:8080`
- 抖音测试页：`http://127.0.0.1:8080/douyin-test`

## 6. 是否需要先登录抖音（关键）

结论：

1. 公开、无登录限制的视频：可能不登录也能下载。
2. 触发风控、地域/年龄/频率限制的视频：通常需要浏览器登录态。

本项目实现方式：

- 后端使用 `yt-dlp`，支持 `cookiesfrombrowser` 参数。
- 页面中可填写浏览器名（如 `chrome` / `edge` / `firefox` / `safari`）。
- 后端会读取该浏览器本机登录态进行请求。

因此在测试机上，建议先在对应浏览器里登录抖音，再测试。

## 7. API 直测（强烈建议先做）

先准备一个抖音分享文案或短链，例如：

```text
7.53 复制打开抖音，看看【xxx】 https://v.douyin.com/xxxxxx/
```

### 7.1 解析视频信息

```bash
curl -X POST 'http://127.0.0.1:8000/api/v1/douyin/parse' \
  -F 'url=把你的抖音分享文案或链接放这里' \
  -F 'browser=chrome'
```

期望：返回 JSON，包含 `success: true` 和 `video_info`。

### 7.2 创建下载任务

```bash
curl -X POST 'http://127.0.0.1:8000/api/v1/douyin/download' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "把你的抖音分享文案或链接放这里",
    "project_name": "douyin-kimicode-test",
    "video_category": "default",
    "browser": "chrome"
  }'
```

期望：返回 `project_id` 和 `task_id`。

### 7.3 轮询任务状态

```bash
curl 'http://127.0.0.1:8000/api/v1/douyin/tasks/<task_id>'
```

持续轮询，直到：
- `status = completed`（成功）
- 或 `status = failed`（失败，查看 `error_message`）

## 8. 页面测试（/douyin-test）

1. 打开 `http://127.0.0.1:8080/douyin-test`
2. 在“抖音链接或分享文案”粘贴文本
3. `browser` 填 `chrome`（或你登录抖音的浏览器）
4. 点击 `1. 解析视频信息`
5. 点击 `2. 创建下载任务`
6. 观察任务状态 JSON，直到 `completed`

## 9. 下载结果验收

成功后检查：

```bash
ls -lah data/projects/<project_id>/raw/
```

至少应看到：
- `input.mp4`

可能看到：
- `input.srt`（若平台字幕或 Whisper 生成成功）

说明：当前后端逻辑要求字幕存在才能最终成功，若字幕链路失败，任务会被标记 `failed`。

## 10. 常见问题排查

1. `解析失败 / 创建任务失败`：
- 先确认链接可在浏览器打开。
- 尝试把 `browser` 从空改为 `chrome`。
- 确认测试机已在该浏览器登录抖音。

2. `Could not find cookies database` 类错误：
- 浏览器名写错，或当前用户下没有该浏览器 Profile。
- 改用已登录的浏览器名称。

3. `任务 failed` 且与字幕相关：
- 检查终端 B 后端日志。
- 检查 FFmpeg 是否可用：`ffmpeg -version`
- 可先换一个有公开字幕/语音清晰的视频再测。

4. 前端连不上后端：
- 确认后端在 `8000` 端口。
- 若后端不是 `8000`，启动前端前设置 `BACKEND_PORT` 或 `VITE_API_TARGET`。

## 11. 给 KimiCode 的最小执行清单

可直接把下面这段发给 KimiCode：

```text
请按 docs/KIMICODE_DOUYIN_TEST_GUIDE.md 执行抖音下载验收。
要求：
1) 启动 Redis、后端(8000)、前端(8080)
2) 先用 API 完成 parse/download/tasks 轮询验证
3) 再用 /douyin-test 页面复测同一链接
4) 输出 project_id、task_id、最终状态
5) 列出 data/projects/<project_id>/raw/ 下文件
6) 若失败，贴出关键报错和修复建议
```
