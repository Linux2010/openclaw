---
name: github-contribution
description: GitHub开源项目代码贡献完整工作流程。使用场景：当需要为开源项目解决issue或bug时，提供从fork验证、同步、开发到提交PR的完整指导。包含Chrome浏览器PR提交支持。
---

# GitHub 开源项目代码贡献技能

## 🚨 重要前提：必须先 Fork 项目

**在使用本技能前，你必须先在 GitHub 网页上手动 Fork 目标项目！**

这是因为：
- 你通常没有官方仓库的写入权限
- PR 必须从你的 Fork 提交到官方仓库
- 这是 GitHub 开源贡献的标准安全流程

### 手动 Fork 步骤
1. 访问官方项目页面（如 `https://github.com/openclaw/openclaw`）
2. 点击右上角的 **"Fork"** 按钮
3. 确认 Fork 到你的 GitHub 账户下
4. 现在你有了自己的副本：`https://github.com/your-username/repository-name`

## 工作流程概述

完整的开源贡献流程：
1. **验证 Fork** - 确认你已经 Fork 了项目并能访问
2. **克隆你的 Fork** - 克隆你自己的 Fork（不是官方仓库）
3. **配置 Upstream** - 添加官方仓库作为上游远程
4. **同步 Fork** - 确保你的 Fork 与官方 main/master 分支保持一致  
5. **创建特性分支** - 基于最新代码创建专门的开发分支
6. **开发和测试** - 在特性分支上实现解决方案
7. **提交 PR** - 向官方项目提交拉取请求

## 详细步骤指南

### 1. 验证 Fork 和设置环境

```bash
# 确认你的 GitHub 用户名
GITHUB_USERNAME="your-username"  # 替换为你的实际用户名
OWNER_REPO="original-owner/repository-name"  # 如 openclaw/openclaw

# 验证你能否访问你的 Fork
curl -s "https://api.github.com/repos/${GITHUB_USERNAME}/${OWNER_REPO##*/}" | grep -q '"id"' && echo "✅ Fork exists" || echo "❌ Fork not found - please fork first!"
```

### 2. 克隆你的 Fork 并配置远程

```bash
# 克隆你的 Fork（关键：不是官方仓库！）
git clone https://github.com/${GITHUB_USERNAME}/${OWNER_REPO##*/}.git
cd ${OWNER_REPO##*/}

# 添加官方仓库作为 upstream 远程
git remote add upstream https://github.com/${OWNER_REPO}.git

# 验证远程配置
git remote -v
# 应该显示：
# origin   https://github.com/your-username/repository-name.git (fetch/push)
# upstream https://github.com/original-owner/repository-name.git (fetch)
```

### 3. 同步你的 Fork 到最新状态

```bash
# 切换到 main 分支（或 master）
git checkout main 2>/dev/null || git checkout master

# 从官方仓库获取最新更改
git fetch upstream

# 将官方更改合并到本地 main
git merge upstream/main

# 推送到你的 Fork，确保它是最新的
git push origin main
```

### 4. 创建特性分支

```bash
# 基于最新的 main 创建新分支
# 分支命名建议：fix/issue-number-brief-description 或 feature/brief-description
git checkout -b fix/123-bug-description

# 验证当前分支
git branch
```

### 5. 开发和测试解决方案

- 在特性分支上编写代码修复 issue
- 运行项目的测试套件确保没有破坏现有功能
- 遵循项目的代码风格和贡献指南
- 提交有意义的 commit 信息

```bash
# 添加更改的文件
git add .

# 提交更改（使用描述性提交信息）
git commit -m "Fix: brief description of what was fixed"

# 推送到你的 Fork 的特性分支
git push origin fix/123-bug-description
```

### 6. 提交 Pull Request

#### 使用 Chrome 浏览器提交 PR

1. **访问你的 Fork 页面**：`https://github.com/your-username/repository-name`
2. **切换到特性分支**：在分支选择器中选择你的特性分支
3. **点击 "Compare & pull request" 按钮**
4. **填写 PR 模板**：
   - 标题：清晰描述变更内容
   - 描述：详细说明问题和解决方案
   - 关联 issue：使用 `Closes #123` 或 `Fixes #123` 语法
   - 检查项目：确认满足贡献要求
5. **提交 PR**：点击 "Create pull request"

#### PR 最佳实践

- **标题格式**：使用语义化前缀如 `fix:`, `feat:`, `docs:`, `chore:`
- **描述内容**：
  - 问题背景和影响
  - 解决方案的技术细节  
  - 测试方法和结果
  - 相关 issue 链接
- **代码审查准备**：
  - 确保代码符合项目风格
  - 添加必要的注释和文档
  - 更新 README 或 CHANGELOG（如果适用）

## 常见问题处理

### Fork 同步冲突解决

如果在同步过程中遇到冲突：

```bash
# 在 main 分支上
git fetch upstream
git merge upstream/main

# 如果有冲突，手动解决后
git add .
git commit
git push origin main
```

### 特性分支更新

如果官方仓库有新提交，需要更新你的特性分支：

```bash
# 切换到 main 并同步
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# 切换回特性分支并 rebase
git checkout your-feature-branch
git rebase main

# 如果有冲突，解决后继续
git add .
git rebase --continue

# 强制推送到你的 Fork（因为 rebase 改变了历史）
git push --force-with-lease origin your-feature-branch
```

### 权限错误排查

**错误：`remote: Permission denied`**
- 原因：尝试推送到官方仓库而不是你的 Fork
- 解决：确认 `git remote -v` 显示 origin 指向你的 Fork

**错误：`fatal: remote error: access denied or repository not exported`**
- 原因：项目不存在或你没有访问权限
- 解决：确认你已经正确 Fork 了项目

## 贡献检查清单

在提交 PR 前，请确保：

- [ ] **已经手动 Fork 了项目**（最重要！）
- [ ] 代码通过所有测试
- [ ] 遵循项目代码风格指南  
- [ ] 添加了必要的测试用例
- [ ] 更新了相关文档
- [ ] PR 描述清晰完整
- [ ] 关联了相关 issue
- [ ] 本地测试验证通过

## 参考资源

- **GitHub 官方贡献指南**：每个项目通常在 CONTRIBUTING.md 中有详细说明
- **项目特定要求**：检查项目的 README、文档和已有 PR 的模式
- **社区规范**：了解项目的沟通方式和期望

使用此技能时，请根据具体项目的实际情况调整工作流程。