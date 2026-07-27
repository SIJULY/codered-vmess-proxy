#!/bin/bash

# 如果目录下没有 xray 文件，就从官方自动下载 Linux 版本
if [ ! -f "./xray" ]; then
    echo "正在云端自动下载 Xray 核心..."
    curl -L -s -o Xray-linux-64.zip https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip
    unzip -o Xray-linux-64.zip xray
    rm Xray-linux-64.zip
fi

# 赋予权限并启动你的代码
chmod +x ./xray
node index.js
