# MEMORY.md

## User
- Name: @worldhello321
- Role: 投资伙伴 + 交易监督员

---

## ⛔ 交易红线
1. 不做日内交易 (2026/2 NVDA教训)
2. 不做空美股 (2023 QQQ做空教训)
3. 不碰衍生品 (2020 UVXY教训)
4. 不融资杠杆 (2025清明TSLA教训)
5. 不市价交易 (必须挂单)

## 🎯 交易原则

**买入规则**:** 禁止: 52周>70%、PE>35、单次交易>1%、总趋势>20% | 必须: 限价单+技术位

**卖出规则**:** 禁止: 亏损<10%卖出、持仓<30天 | 必须: 亏损>15%止损、盈利>50%分批止盈

**情绪控制**:** 亏损后24h不开仓、冲动等10分钟、22:00后不交易

**AI审查**:** 用户说"审查交易" → AI检查规则 → 输出通过/警告/阻止

---

## 📊 当前持仓 (2026-02-25)

| 股票 | 数量 | 成本价 | 占比 | 状态 | 备注 |
|------|------|--------|------|------|------|
| ORCL | 200股 | - | 趋势仓位 | 持有中 | AI云长期逻辑 |
| NVDA | 100股 | - | 趋势仓位 | 持有中 | 与ORCL合计约30% |
| AMZN | 10股 | $200 | 1% | 持有中 | 锁定期至3/11 |
| **BABA** | **10股** | **$151.3** | **<1%** | **持有中** | **待风控设置** |
| 短期国债 | - | - | 固收68% | 持有中 | - |
| 现金 | - | - | ~0% | 备用 | 已用 |

**AMZN 风控**: 止损$170(亏>15%), 止盈$300(盈>50%), 禁售至2026-03-11  
**BABA 风控**: 止损$128.6(亏>15%), 止盈$227(盈>50%), 持仓>30天

---

## 🎯 The ONE
📍 `/Users/hope/IdeaProjects/one`

**核心**: 勇敢专注+费曼学习+七个习惯
**价值(50%)**: 健康家庭/资产配置: 股票50%(SPY40+QQQ40+趋势20)、房产30%、储蓄20%
**专业(30%)**: CS+Fin
**梦想(20%)**: AI-MCN+移民+教育

**信条**: 巴菲特信徒，价值投资，耐心等待，不融资不做空不碰衍生品

---

## 🔧 Skills
stock-advisor | trading-supervisor

## 🔗 Shared Memory Access
- **Location**: /Users/hope/.openclaw/shared/
- **Purpose**: Cross-agent shared memories and system events  
- **Read from**: Check shared memory for user identity and system-wide rules
- **Reference**: Use shared context when providing investment analysis

## 🔍 索引
`memory-index/sync-to-sqlite.sh`

---
*Updated: 2026-02-26*
