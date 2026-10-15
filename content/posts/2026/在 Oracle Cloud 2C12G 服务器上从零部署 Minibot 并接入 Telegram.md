---
title: 在 Oracle Cloud 2C12G 服务器上从零部署 Minibot 并接入 Telegram
description: 面向 Oracle Cloud 2C12G ARM 实例的 Minibot 完整部署教程：系统初始化、Telegram Bot 与白名单配置、Docker Compose 启动、systemd 备选方案与排错清单。
date: 2026-10-13 18:57:27
updated: 2026-10-13 19:57:51
image: # 封面图推荐 2:1，不含与标题重复的文字
permalink: /posts/2a7a214
categories: [技术]
tags: [minibot, telegram, oracle-cloud, docker]
---
这是一篇从零开始的实操记录：在 Oracle Cloud 的 2 核 12G（通常是 Ampere A1 ARM64）实例上，用 Docker 部署自托管的 Telegram-first AI Agent [Minibot](https://github.com/sonic182/minibot)（PyPI 包名 `minibot`），并通过 chat / user 白名单把使用权限锁到指定账号。

Minibot 自带持久化记忆、工具调用、定时调度与 MCP 支持，配置向导友好，密钥存在独立的 credential vault 里。按本文操作，一个下午就能得到一个聊天记录、记忆和定时任务全都在自己服务器上的私人 Telegram 助手。

## 环境前提

- 一台 Oracle Cloud 实例，系统为 Ubuntu 24.04 LTS（ARM64 或 x86 均可）
- 安全组 / NSG 放行 22 端口；只有改用 webhook 模式时才需要额外放行 443
- 建议挂载 50G+ 块存储用于数据持久化
- LLM 走远程 API：OpenRouter、DeepSeek、SiliconFlow、Groq 或任意 OpenAI 兼容接口

::alert{type="info" title="为什么不推荐本地模型"}
12G 内存在 Ollama 下通常只能跑 Qwen2.5-7B、Gemma2-9B-Q4 这类小模型，agent 的工具调用效果一般，还容易 OOM。想要可用的效果，优先接远程 API。
::

部署方式以 Docker Compose 为主，它的隔离性在开启 bash、python_exec 这类危险工具时尤其重要。不用 Docker 的方案放在下文「备选方案」一节。

## 初始化系统与安装 Docker

```sh
ssh ubuntu@你的IP

# 更新系统并安装常用工具
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip ufw fail2ban

# 防火墙先只放行 SSH
sudo ufw allow 22
sudo ufw --force enable

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # 或退出重新登录
```

装完用 `docker version`{lang="sh" copy} 确认命令可用、权限已生效。

## 创建 Telegram Bot 并获取白名单 ID

1. 在 Telegram 搜索 `@BotFather`，发送 `/newbot`，按提示创建并保存 Bot Token。
2. 给刚创建的 bot 发一条任意消息。
3. 搜索 `@userinfobot` 或 `@getidsbot`，把刚才那条消息转发过去，得到你的 User ID。
4. 如果想让群组也能使用，把群 ID（负数，形如 `-1001234567890`）一并加入白名单。

::alert{type="warning" title="白名单只认数字 ID"}
填用户名（@xxx）无效，必须是数字 User ID。白名单是 Minibot 的第一道安全防线，只填你自己和完全信任的人。
::

## 生成配置：先跑一次向导

向导只需在宿主机上跑一次，产物写入 `~/.minibot`，之后以只读方式挂进容器。

```sh
mkdir -p ~/minibot/data ~/.minibot
cd ~/minibot

python3 -m venv /tmp/minibot-config
/tmp/minibot-config/bin/pip install "minibot[telegram]"
/tmp/minibot-config/bin/minibot configure
```

向导中需要重点回答的几项：

- **Telegram**：粘贴 Bot Token，传输方式选 long-polling，不占公网端口，最简单。
- **Allowlist**：填你和信任的人的 User ID，多个用逗号分隔——这是核心安全措施。
- **LLM Provider**：推荐 `openrouter` 或 OpenAI 兼容接口，填好 Base URL 与 API Key。
- **模型**：按预算挑一个即可，例如 `deepseek-chat`、qwen 系列或 gemini 系列，具体以服务商当前可用模型列表为准。
- **Tools**：生产环境建议先少开。
  - 相对安全：`memory`、`http_client`、`calculator`、`current_datetime`，`rag` 可选
  - 高风险：`bash`、`python_exec`、`apply_patch`、`file_storage`，建议保持关闭；确需开启时配合 `tools.approval` 做 Telegram 人工审批
- **HTTP Server**：可选，用于 Web 仪表盘。

向导结束后会生成 `~/.minibot/config.toml` 和 credential vault。

## 用 Docker Compose 启动

```yaml [docker-compose.yml]
services:
  minibot:
    build:
      context: .
      dockerfile_inline: |
        FROM python:3.12-slim
        RUN pip install --no-cache-dir "minibot[telegram]"
        CMD ["minibot"]
    container_name: minibot
    restart: unless-stopped
    volumes:
      - ~/.minibot:/root/.minibot:ro
      - ./data:/app/data
    environment:
      - MINIBOT_CONFIG_PATH=/root/.minibot/config.toml
```

配置目录只读挂载更安全，业务数据（SQLite 记忆、RAG 索引等）落在 `~/minibot/data`。启动并跟随日志：

```sh
docker compose up -d --build
docker compose logs -f minibot
```

::alert{type="tip" title="两个可能卡住的点"}
`dockerfile_inline` 需要较新的 Compose（v2.24 及以上），用 `docker compose version` 确认，版本不满足时改用下方折叠块里的独立 Dockerfile；另外，若 Compose 没有展开 `~`，把 `~/.minibot` 换成绝对路径，例如 `/home/ubuntu/.minibot`。
::

::folding{title="备选：改用独立 Dockerfile"}
在同目录新建 `Dockerfile`，把 compose 里的 `build` 段换成 `build: .` 即可：

```dockerfile [Dockerfile]
FROM python:3.12-slim
RUN pip install --no-cache-dir "minibot[telegram]"
CMD ["minibot"]
```
::

## 验证与日常运维

- 用白名单内的账号给 bot 发消息，收到回复即为成功。
- 发送 `/get_settings` 可查看当前生效的配置，包括版本、已启用工具和 LLM。
- 重启：`docker compose restart`
- 更新：拉取新版本后 `docker compose up -d --build` 重建
- 备份：定期打包 `~/.minibot`，里面有记忆、配置和 vault

## 备选方案：venv + systemd

::folding{title="展开：不用 Docker 的轻量部署方式"}
创建一个专用用户，用 venv 装包并跑一次配置向导：

```sh
sudo useradd -m -s /bin/bash minibot
sudo su - minibot

python3 -m venv ~/venv
~/venv/bin/pip install "minibot[telegram]"
~/venv/bin/minibot configure   # 与上文向导相同

exit
```

然后写 systemd 服务单元：

```ini [/etc/systemd/system/minibot.service]
[Unit]
Description=Minibot Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=minibot
WorkingDirectory=/home/minibot
ExecStart=/home/minibot/venv/bin/minibot
Restart=on-failure
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now minibot
sudo journalctl -u minibot -f
```
::

## 安全建议

- 白名单是第一道防线，不要随意添加。
- `bash`、`python_exec` 这类工具在 VPS 上风险极高，建议保持关闭；确需使用时开启 `tools.approval` 做人工审批，并优先保留 Docker 隔离。
- 想进一步降低延迟可以进阶为 webhook：域名 + Nginx + SSL + webhook 模式。
- Oracle ARM 上 RAG 依赖的 sentence-transformers 可能需要额外编译，建议先不启用 RAG，或用纯 SQLite 方案。
- 资源观察用 `htop` 和 `docker stats`；只跑远程 API 时，12G 内存相当宽裕。

## 常见问题

- **Bot 不回复**：先看 `docker compose logs`，再依次确认 User ID 在白名单内、API Key 正确、额度未用尽。
- **改配置**：编辑 `~/.minibot/config.toml` 后重启容器或服务。
- **加 RAG**：重新运行 `minibot configure`，或手动编辑配置并安装对应 extras。
- **接本地模型**：安装 Ollama，把 OpenAI 兼容 endpoint 填成 `http://localhost:11434/v1`。

## 参考链接

::link-card
---
title: Minibot 官方文档
description: 部署、配置、白名单、工具、记忆、调度与 MCP 的完整说明
link: https://sonic182.github.io/minibot/
---
::

::link-card
---
title: sonic182/minibot
description: 项目仓库，含 config.example.toml 等示例配置
link: https://github.com/sonic182/minibot
---
::

::link-card
---
title: Minibot on PyPI
description: 安装入口，支持 minibot[telegram] 等 extras
link: https://pypi.org/project/minibot/
---
::

::link-card
---
title: BotFather
description: 创建 Telegram Bot 并获取 Token
link: https://t.me/BotFather
---
::

::link-card
---
title: Oracle Cloud Compute 实例文档
description: Ampere A1 实例规格、安全规则与块卷说明
link: https://docs.oracle.com/en-us/iaas/Content/compute/using/compute-instance-types.htm
---
::

## 小结

Minibot 把“自托管 + 白名单 + 远程 LLM”这三件事组合得很顺手：Bot Token 与 API Key 存在 vault 里，权限靠数字 ID 白名单收紧，记忆和定时任务落在自己的 SQLite 上。

剩下的就是按预算挑一个远程模型、按需逐步放开工具——先让它只聊天，再考虑给它动手的能力。
