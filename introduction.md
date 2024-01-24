# 接口说明

该文档描述了我们的 RESTful API，用于访问我们的服务。API 基于 HTTP 协议，支持 JSON 格式。

## 基本信息

- **Base URL**: `https://api.example.com`
- **认证方式**: API 密钥

## 认证

在每个请求的 Header 中添加以下认证信息：

```bash
tk: YOUR_TOKEN
```
