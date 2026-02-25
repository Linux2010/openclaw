# Memory 目录结构

```
memory/
├── README.md              # 本文件
├── .cleanup-request       # 整理请求标记（由归档脚本生成）
│
├── YYYY-MM-DD.md         # 每日对话日志（当前月份）
│   └── 例如: 2026-02-10.md
│
└── archive/              # 归档存储
    ├── YYYY-MM-summary.md    # 月度摘要（核心教训）
    └── originals/            # 原始日志（完整记录）
        └── 例如: 2026-01-15.md
```

## 更新规则

### 自动归档（每月 1 号 03:00）
- 将上月 daily logs 移动到 `archive/originals/`
- 生成月度摘要保存到 `archive/YYYY-MM-summary.md`
- 摘要只保留核心决策和教训

### 手动触发
```bash
~/memory-archive.sh
```

### MEMORY.md 维护
- 核心身份、持续有效的规则
- 当前进行中的事项
- 目标长度: < 500 行
