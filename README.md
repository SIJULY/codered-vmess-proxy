# CodeRed Cloud 部署 Vmess 代理节点详细教程

本项目通过 Node.js 伪装成普通 Web 服务，并在后台隐蔽运行 Xray 内核，实现流量的 WebSocket (WS) 透传，完美适配并绕过云平台的健康检查限制。

## 目录
1. [一、环境创建 (网页控制台)](#一-环境创建)
2. [二、代码修改与防探测](#二-代码修改与防探测)
3. [三、本地 CLI 工具安装与一键部署](#三-本地-cli-工具安装与一键部署)
4. [四、节点配置与连接](#四-节点配置与连接)

---

### 一、环境创建 (网页控制台)

1. 登录 [CodeRed 控制台](https://app.codered.cloud/)，进入左侧 **Websites** 菜单，点击右上角的 **+ Create New**。
2. 按照以下步骤填写表单完成创建：
   * **Name your project**:
     * `Name`: 填入项目名称（例如 `isp`）。
     * `Handle`: 填入专属域名前缀（例如 `isp`），此操作将决定您的最终节点地址（如 `isp.codered.cloud`）。
   * **Select your Region**: 选择默认的 `United States`。
   * **Pick your app**: 选中 **Node.js (server-side)** 卡片。在卡片内的下拉框中选择 **Node.js 24 LTS**，点击 **Select**。
   * **Pick a plan**: 选中左侧的 **Free ($0/month)** 免费计划，点击 **Select**。
   * **Billing & Access**: Client 选择您的默认账号即可。
3. 点击页面最下方的红色按钮 **Launch Website**，等待系统为您初始化。

---

### 二、代码修改与防探测

在将代码部署到云端前，我们需要在本地进行简单的修改。

#### 修改 UUID 与路径（防盗用）
使用 VS Code 或文本编辑器打开项目中的 `index.js`，修改以下两处：
* **`uuid`** (约第13行)：替换为您自己的 UUID（例如 `884931a7-0245-42df-a337-4d43685e13d1`，建议自行生成新的）。
* **`wsPath`** (约第14行)：默认是 `/vmess`，建议改成更隐蔽的路径，如 `/my-secret-path`。

---

### 三、本地 CLI 工具安装与一键部署

#### 1. 安装 CodeRed CLI 工具

**macOS / Linux 系统:**
在本地终端 (Terminal) 中，依次运行以下三行命令来下载并安装 `cr` 工具：
```bash
curl -L https://www.codered.cloud/cli/cr-macos -o cr
chmod +x cr
sudo mv cr /usr/local/bin/cr
```
*(注意：第三行命令使用了 `sudo`，执行时会要求输入 Mac 的开机密码，密码不会显示，输入完直接回车即可。)*

**Windows 系统:**
建议在 PowerShell 中运行以下命令下载 Windows 版本的 CLI 工具：
```powershell
curl.exe -L https://www.codered.cloud/cli/cr-windows -o cr.exe
```
*(注意：下载完毕后，后续在 Windows 终端中执行部署命令时，请将命令中的 `cr` 替换为 `.\cr.exe`)*

#### 2. 获取 API 密钥
由于直接使用 `cr login` 有时会导致未正确保存密钥而报错 (`Error: An API key is required`)，我们推荐直接使用带 `--token` 的方式进行部署。
1. 请在浏览器中打开此链接：[https://app.codered.cloud/billing/api-key/](https://app.codered.cloud/billing/api-key/)
2. 在页面中生成或复制您的专属 **API Key**（通常是一长串字符）。

#### 3. 终端一键部署
确保您的终端当前已经进入了本项目所在的文件夹。执行以下命令进行部署：

*(注意：请将命令中的 `isp` 替换成您第一步设置的 Handle 名称，将双引号内的内容替换为您刚刚复制的真实 API 密钥)*
```bash
cr deploy isp --token="这里替换成你复制的API密钥"
```

按下回车后，CLI 工具会自动打包上传。等待进度条走完，当终端提示 `Your site is live at: https://isp.codered.cloud/` 时，说明代码已经成功推送到云端并启动！

---

### 四、节点配置与连接

应用上线后，打开您的代理客户端（如 V2rayN, V2rayNG, 小火箭 Shadowrocket），手动添加一个 **Vmess** 节点：

* **地址 (Address):** 填入您的域名 (如 `isp.codered.cloud`)
* **端口 (Port):** `443`
* **用户 ID (UUID):** 填入您在 `index.js` 中修改的 UUID
* **额外 ID (AlterId):** `0`
* **加密方式 (Security):** `auto`
* **网络 (Network):** `ws` (WebSocket)
* **伪装域名 (Host / SNI):** 与地址相同 (如 `isp.codered.cloud`)
* **路径 (Path):** 填入您在 `index.js` 中修改的路径 (如 `/vmess`)
* **传输安全 (TLS):** 开启 / `tls`

**也可以复制下方示例链接，在客户端选择“从剪贴板导入”（导入后务必把里面的域名、UUID、路径修改为您自己的）：**
```text
vmess://eyJ2IjoiMiIsInBzIjoiQ29kZVJlZC1pc3AiLCJhZGQiOiJpc3AuY29kZXJlZC5jbG91ZCIsInBvcnQiOiI0NDMiLCJpZCI6Ijg4NDkzMWE3LTAyNDUtNDJkZi1hMzM3LTRkNDM2ODVlMTNkMSIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJpc3AuY29kZXJlZC5jbG91ZCIsInBhdGgiOiIvdm1lc3MiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJpc3AuY29kZXJlZC5jbG91ZCIsImFscG4iOiIifQ==
```

🎉 **大功告成！您可以直接去小火箭里连接测试了。**
*(防封小贴士：如果直接在浏览器访问您的域名，会显示 `Welcome to the web service...`，这代表防探测伪装已生效。)*