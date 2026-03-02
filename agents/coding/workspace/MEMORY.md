# Coding Agent - Core Memory

## OpenClaw Repository Locations

### Primary Source Repository
- **Local path**: `/Users/hope/IdeaProjects/openclaw`
- **GitHub**: https://github.com/openclaw/openclaw
- **Purpose**: Main OpenClaw source code repository for monitoring and contributing

### Documentation Repository  
- **Local path**: `/Users/hope/IdeaProjects/ai-note`
- **Purpose**: AI-friendly technical documentation and solution guides

## GitHub 开源贡献完整工作流程

### 标准贡献流程（已验证有效）
1. **Fork 项目** - 在 GitHub 网页上 fork 官方仓库
2. **克隆个人 Fork** - 克隆自己的 fork 而不是官方仓库
3. **配置 Upstream** - 添加官方仓库作为 upstream 远程
4. **同步最新代码** - 确保基于最新官方代码开发
5. **创建特性分支** - 基于 main/master 创建专门的修复分支
6. **开发和测试** - 实现修复并进行本地测试
7. **提交 PR** - 推送到个人 fork 并创建 Pull Request

### 关键工具和技能
- **github-contribution 技能**: 自动化处理 fork、同步、分支创建
- **参数要求**: `./github-contribution.sh <username> <owner/repo> <issue-number> <branch-name> [projects-root]`
- **自定义根目录**: 支持指定项目存储位置，避免硬编码路径

## 常见陷阱和解决方案

### 🔴 高风险陷阱
1. **直接克隆官方仓库** 
   - **问题**: 无法推送代码，权限错误
   - **解决方案**: 必须克隆个人 fork

2. **缺少 Upstream 配置**
   - **问题**: 无法同步官方最新代码
   - **解决方案**: 自动添加 upstream 远程

3. **硬重置丢失本地更改**
   - **问题**: `git reset --hard` 会丢弃未推送的更改
   - **解决方案**: 在干净目录中工作，或先备份

### 🟡 中等风险陷阱
4. **钩子集成缺失**
   - **问题**: Provider 未正确集成命令处理系统（如 Issue #31275）
   - **解决方案**: 检查事件触发机制，确保正确调用钩子

5. **分支命名不规范**
   - **问题**: PR 被拒绝或难以理解
   - **解决方案**: 使用 `fix/issue-number-description` 格式

## 成功贡献的关键要素

### 问题分析方法
- **根本原因分析**: 不仅修复表面问题，要找到架构层面的原因
- **影响范围评估**: 确定修复是否会影响其他功能
- **向后兼容性**: 确保修复不会破坏现有功能

### 代码质量标准
- **遵循项目规范**: 遵守 CONTRIBUTING.md 和代码风格指南
- **充分测试**: 本地验证修复效果
- **清晰提交信息**: 使用语义化提交格式

### PR 最佳实践
- **关联 Issue**: 使用 `Fixes #123` 语法自动关闭 issue
- **详细描述**: 说明问题背景、解决方案和技术细节
- **及时响应**: 积极回应维护者的反馈和建议

## 监控配置
- **Target repositories**: openclaw/openclaw (primary focus)
- **Contribution areas**: GitHub issues, PR reviews, documentation improvements
- **Local workspace**: Uses local repository at `/Users/hope/IdeaProjects/openclaw` for development

## Session Management
- **Subagent isolation**: Use `sessions_spawn(runtime="subagent")` for long-running tasks to prevent interruption
- **Heartbeat interval**: 4 hours with defined monitoring tasks in HEARTBEAT.md
- **Task reliability**: Complex operations should be delegated to isolated subagent sessions

## 经验教训（2026-03-02）
- **Issue #31275 修复成功**: Feishu provider session-memory hook 问题
- **关键发现**: Provider 必须正确集成命令处理系统才能触发钩子
- **验证方法**: 通过创建特性分支、实现修复、提交 PR 的完整流程
- **自动化价值**: github-contribution 技能显著提高贡献效率

## Fork 保护分支最佳实践

### 核心原则
- **main 分支作为保护分支**: 个人 fork 的 main 分支必须始终保持与官方仓库完全一致
- **禁止直接提交**: 绝不在 main 分支上进行任何开发或提交
- **特性分支开发**: 所有开发工作必须在基于 main 创建的特性分支上进行
- **定期同步**: 定期将官方 upstream/main 同步到个人 fork 的 main 分支

### 具体操作流程
1. **初始化设置**:
   ```bash
   git remote add upstream https://github.com/openclaw/openclaw.git
   git fetch upstream
   ```

2. **保持 main 分支同步**:
   ```bash
   git checkout main
   git fetch upstream
   git reset --hard upstream/main
   git push origin main --force
   ```

3. **创建特性分支**:
   ```bash
   git checkout main
   git checkout -b fix/issue-number-description
   ```

4. **开发和提交**:
   - 在特性分支上进行所有开发工作
   - 提交 PR 时选择官方仓库的 main 分支作为目标

### 优势
- **避免冲突**: 确保 PR 基于最新官方代码，减少合并冲突
- **简化维护**: 不需要处理 main 分支上的个人提交
- **提高效率**: CI/CD 检查更容易通过，因为基于干净的官方代码
- **团队协作**: 符合开源项目标准工作流程

## 每日工作总结流程

### 工作总结内容来源
- **主要来源**: `/Users/hope/.openclaw/agents/coding/sessions/` 目录中的会话记录（.jsonl 格式）
- **提取内容**: GitHub issue 监控、PR 创建、代码审查、社区互动等开源贡献活动
- **输出位置**: 结构化输出到 `agents/coding/workspace/memory/YYYY-MM-DD.md`
- **交付方式**: 每日 23:30 发送摘要报告到 Telegram 群组

### 总结内容要素
1. **Issue 处理**: 新发现的 issues、已修复的 bugs、PR 状态
2. **代码贡献**: 提交的 PR、代码审查参与、文档改进
3. **技能开发**: 新创建或改进的技能、工具优化
4. **社区互动**: GitHub 讨论参与、维护者反馈响应
5. **学习收获**: 技术难点突破、架构理解深化、最佳实践积累

### 质量标准
- **具体性**: 包含具体的 issue 编号、PR 链接、技术细节
- **可追溯性**: 所有工作都有对应的 commit hash 或 PR URL
- **价值导向**: 重点记录对开源社区有实际贡献的工作
- **反思性**: 包含问题分析、解决方案和经验教训

### 自动化支持
- **Heartbeat 监控**: 每 4 小时检查一次 GitHub 活动
- **会话记录分析**: 自动从 session 日志提取贡献活动
- **模板化输出**: 使用标准化格式确保总结质量一致性
- **定时交付**: 23:30 自动发送到指定渠道