# CodeRed Cloud 部署 Vmess 代理节点详细教程

本项目通过 Node.js 伪装成普通 Web 服务，并在后台隐蔽运行 Xray 内核，实现流量的 WebSocket (WS) 透传，完美适配并绕过云平台的健康检查限制。

## 目录
1. [一、环境创建 (网页控制台)](#一-环境创建-网页控制台)
2. [二、将项目下载到本地电脑](#二-将项目下载到本地电脑)
3. [三、代码修改与防探测](#三-代码修改与防探测)
4. [四、本地 CLI 工具安装与一键部署](#四-本地-cli-工具安装与一键部署)
5. [五、节点配置与连接](#五-节点配置与连接)

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

### 二、将项目下载到本地电脑

对于小白用户，最简单的方式是直接在 GitHub 上下载项目的压缩包，然后解压到本地：

1. 打开本项目 GitHub 页面：[https://github.com/SIJULY/codered-vmess-proxy](https://github.com/SIJULY/codered-vmess-proxy)
2. 点击页面右上角绿色的 **Code** 按钮，然后在下拉菜单中选择 **Download ZIP**。
3. 下载完成后，在您的电脑上找到这个 ZIP 文件并**解压**。
4. 解压后，您会得到一个文件夹（例如命名为 `codered-vmess-proxy-main`）。
5. **非常重要**：请双击进入这个解压好的文件夹，确保您能看到里面的 `index.js`、`cr-run.sh`、`package.json` 等文件。接下来的所有操作，都将在这个文件夹内进行！

*(进阶用户也可以直接使用 Git 命令行克隆仓库：`git clone https://github.com/SIJULY/codered-vmess-proxy.git`)*

---

### 三、代码修改与防探测

在将代码部署到云端前，我们需要在本地进行简单的修改。请不要直接在网页上修改，而是使用您电脑上的文本编辑器。

1. **找到文件**：在您刚刚解压的文件夹（里面有 `index.js` 的那个目录）中，找到名为 `index.js` 的文件。
2. **编辑文件**：鼠标右键点击 `index.js`，选择使用“记事本”（Windows）或者“文本编辑”（Mac），推荐使用专业的代码编辑器如 **VS Code** 打开它。
3. **修改内容**：
   找到以下两行代码进行修改（分别在大约第 13 行和第 14 行）：
   * **`uuid`**：将其中的字符串替换为您自己的 UUID。
     * *原代码示例*：`const uuid = '884931a7-0245-42df-a337-4d43685e13d1';`
     * *如何获取新 UUID*：您可以访问 [UUID 生成网站](https://www.uuidgenerator.net/) 生成一个新的，替换掉单引号里面的内容。（注意：千万不要删掉两边的单引号 `'`）。
   * **`wsPath`**：默认是 `/vmess`，为了防止别人扫描盗用您的节点，建议改成别人猜不到的隐蔽路径。
     * *原代码示例*：`const wsPath = '/vmess';`
     * *修改示例*：改成诸如 `/my-secret-path` 或 `/abc12345`。同样保留两边的单引号 `'`。
4. **保存文件**：修改完成后，务必保存文件 (快捷键 `Ctrl + S` 或 `Cmd + S`)。

---

### 四、本地 CLI 工具安装与一键部署

#### 1. 安装 CodeRed CLI 工具

根据您的电脑系统，选择对应的方法安装部署工具：

**macOS / Linux 系统:**
打开本地终端 (Terminal)，依次复制运行以下三行命令（每复制一行就按一次回车）：
```bash
curl -L https://www.codered.cloud/cli/cr-macos -o cr
chmod +x cr
sudo mv cr /usr/local/bin/cr
```
*(注意：第三行使用了 `sudo`，执行时会要求输入您电脑的开机密码，输入时屏幕上不会显示密码，输完直接回车即可。)*

**Windows 系统:**
打开 PowerShell，运行以下命令下载工具：
```powershell
curl.exe -L https://www.codered.cloud/cli/cr-windows -o cr.exe
```
*(注意：下载完毕后，这会在当前目录下生成一个 `cr.exe` 文件。后续部署时需要将命令写成 `.\cr.exe`)*

#### 2. 获取 API 密钥
1. 在浏览器中打开并登录此链接：[https://app.codered.cloud/billing/api-key/](https://app.codered.cloud/billing/api-key/)
2. 在页面中点击生成或复制您的专属 **API Key**（一长串字符，请妥善保管）。

#### 3. 终端一键部署 (关键步骤)

在部署之前，必须确保您的终端 (命令提示符/PowerShell/Terminal) **当前路径正处于项目代码文件所在的最内层目录**（也就是能看到 `cr-run.sh` 文件的那个文件夹），否则会报错“Missing cr-run.sh file”导致部署失败！

* **检查并进入路径的方法**：
  * **Windows**: 打开您刚刚解压的那个含有 `index.js` 文件的文件夹，在文件资源管理器的地址栏中输入 `powershell` 并回车。这样打开的 PowerShell 就自动定位到正确的路径了。
  * **Mac**: 打开“终端”应用，输入 `cd ` (注意 cd 后面有一个空格)，然后直接把包含 `index.js` 的那个文件夹用鼠标拖拽进终端窗口中，按下回车键。

* **执行部署命令**：
确认路径无误后，执行以下部署命令：

*(注意：将命令中的 `isp` 替换成您在网页控制台创建的 Handle 名称；将双引号内的内容替换为您刚刚复制的真实 API 密钥)*

**Mac / Linux 部署命令:**
```bash
cr deploy isp --token="这里替换成你复制的APIKey"
```

**Windows 部署命令:**
```powershell
.\cr.exe deploy isp --token="这里替换成你复制的APIKey"
```

按下回车后，CLI 工具会自动打包上传。等待进度条走完，当终端提示 `Your site is live at: https://isp.codered.cloud/`，说明代码已经成功推送到云端并启动！

---

### 五、节点配置与连接

应用上线后，打开您的代理客户端（如 V2rayN, V2rayNG, 小火箭 Shadowrocket），手动添加一个 **Vmess** 节点：

* **地址 (Address):** 填入您的专属域名 (如 `isp.codered.cloud`)
* **端口 (Port):** `443`
* **用户 ID (UUID):** 填入您在修改 `index.js` 时自己填写的那个新 UUID
* **额外 ID (AlterId):** `0`
* **加密方式 (Security):** `auto`
* **网络 (Network):** `ws` (WebSocket)
* **伪装域名 (Host / SNI):** 与地址相同 (如 `isp.codered.cloud`)
* **路径 (Path):** 填入您在 `index.js` 中修改的隐蔽路径 (如 `/my-secret-path`)
* **传输安全 (TLS):** 开启 (选择 `tls`)

**也可以复制下方示例链接，在客户端选择“从剪贴板导入”（导入后务必修改节点里的地址、UUID、路径）：**
```text
vmess://eyJ2IjoiMiIsInBzIjoiQ29kZVJlZC1pc3AiLCJhZGQiOiJpc3AuY29kZXJlZC5jbG91ZCIsInBvcnQiOiI0NDMiLCJpZCI6Ijg4NDkzMWE3LTAyNDUtNDJkZi1hMzM3LTRkNDM2ODVlMTNkMSIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJpc3AuY29kZXJlZC5jbG91ZCIsInBhdGgiOiIvdm1lc3MiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJpc3AuY29kZXJlZC5jbG91ZCIsImFscG4iOiIifQ==
```

🎉 **大功告成！您可以直接去代理软件里连接测试了。**
*(防封小贴士：如果直接在浏览器访问您的域名，会显示 `Welcome to the web service...`，这代表防探测伪装已生效。)*