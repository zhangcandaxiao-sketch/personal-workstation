# 工作台本地启动器（workbench:// 协议）

工作台是网页，浏览器默认无权启动本机程序。本目录通过注册一个仅当前 Windows 用户生效的自定义协议 `workbench://`，让工作台页面上的按钮可以唤起本机程序（如 WPS）打开指定文件。

## 安装（仅需一次）

在本目录上右键 →「在终端中打开」，执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

无需管理员权限。若以后 `my-workbench` 文件夹被移动/改名，重新运行一次即可。

## 使用

- `workbench://open/<id>`：用 `files.json` 中该条目指定的程序打开文件

浏览器首次唤起时会询问“是否打开 workbench 链接”，勾选“始终允许”后不再提示。

> 本地 `npm run dev` 时页面默认走 Vite 内置接口 `/api/local/launch`（见 `vite-plugin-local-launcher.mjs`），无需注册协议；协议仅用于构建部署后的兜底场景。

## 新增可打开的文件

在 `files.json` 的 `files` 数组中增加一条：

```json
{
  "id": "唯一英文标识",
  "name": "显示名称",
  "path": "文件完整路径（双反斜杠）",
  "app": "可选，指定打开程序的完整路径；不填则用系统默认程序",
  "appArgs": ["/prometheus", "/wps"]
}
```

协议只接受 `files.json` 白名单中的 id，不能被网页用来打开任意文件。
