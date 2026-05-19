# 博客小程序

使用微信小程序 `web-view` 组件嵌入 [luliming.xyz](https://www.luliming.xyz/) 博客网站。

## 项目结构

```
├── app.js                  # 小程序入口
├── app.json                # 全局配置
├── app.wxss                # 全局样式
├── project.config.json     # 项目配置
├── sitemap.json            # 小程序索引配置
└── pages/
    └── index/
        ├── index.js        # 首页逻辑
        ├── index.json      # 页面配置
        ├── index.wxml      # 页面模板
        └── index.wxss      # 页面样式
```

## 使用方法

1. 打开 **微信开发者工具**
2. 导入本项目目录
3. 在 `project.config.json` 中将 `appid` 替换为你的小程序 AppID
4. 在微信公众平台的 **开发管理 → 开发设置 → 业务域名** 中添加 `https://www.luliming.xyz/`

## 注意事项

- `web-view` 组件要求嵌入的 URL 必须在小程序管理后台配置为**业务域名**
- 业务域名配置需要在目标网站根目录放置校验文件
- 个人类型小程序暂不支持 `web-view` 组件，需使用**企业/组织**类型的小程序
