#!/usr/bin/env python3
"""
获取股票实时数据
支持美股、港股、A股
数据源：Yahoo Finance
"""

import yfinance as yf
import sys
import json
from datetime import datetime

def get_stock_data(symbol):
    """获取单个股票数据"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 实时价格数据
        fast_info = ticker.fast_info
        
        result = {
            "symbol": symbol,
            "name": info.get("longName", info.get("shortName", symbol)),
            "currency": info.get("currency", "USD"),
            "current_price": fast_info.last_price if hasattr(fast_info, 'last_price') else info.get("currentPrice"),
            "previous_close": fast_info.previous_close if hasattr(fast_info, 'previous_close') else info.get("previousClose"),
            "day_high": fast_info.day_high if hasattr(fast_info, 'day_high') else info.get("dayHigh"),
            "day_low": fast_info.day_low if hasattr(fast_info, 'day_low') else info.get("dayLow"),
            "market_cap": info.get("marketCap"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "pb_ratio": info.get("priceToBook"),
            "eps": info.get("trailingEps") or info.get("forwardEps"),
            "dividend_yield": info.get("dividendYield"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "50_day_avg": info.get("fiftyDayAverage"),
            "200_day_avg": info.get("twoHundredDayAverage"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "website": info.get("website"),
            "timestamp": datetime.now().isoformat()
        }
        return result
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def get_multiple_stocks(symbols):
    """获取多个股票数据"""
    results = []
    for symbol in symbols:
        data = get_stock_data(symbol.strip().upper())
        results.append(data)
    return results

def format_stock_output(data):
    """格式化输出股票价格信息"""
    if "error" in data:
        return f"❌ 获取 {data['symbol']} 数据失败: {data['error']}"
    
    symbol = data['symbol']
    name = data['name']
    price = data['current_price']
    prev_close = data['previous_close']
    currency = data['currency']
    
    # 计算涨跌幅
    if price and prev_close:
        change = price - prev_close
        change_pct = (change / prev_close) * 100
        change_str = f"{change:+.2f} ({change_pct:+.2f}%)"
        emoji = "📈" if change >= 0 else "📉"
    else:
        change_str = "N/A"
        emoji = "📊"
    
    output = f"""
{emoji} {name} ({symbol})
━━━━━━━━━━━━━━━━━━━━━
💰 当前价格: {price:.2f} {currency}
📊 涨跌: {change_str}
📈 今日最高: {data.get('day_high', 'N/A')}
📉 今日最低: {data.get('day_low', 'N/A')}
"""
    
    # 添加估值指标
    pe = data.get('pe_ratio')
    pb = data.get('pb_ratio')
    peg = data.get('peg_ratio')
    
    if pe or pb or peg:
        output += f"\n📐 估值指标:\n"
        if pe:
            output += f"   PE: {pe:.2f}\n"
        if pb:
            output += f"   PB: {pb:.2f}\n"
        if peg:
            output += f"   PEG: {peg:.2f}\n"
    
    # 添加市值
    market_cap = data.get('market_cap')
    if market_cap:
        if market_cap >= 1e12:
            cap_str = f"{market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:
            cap_str = f"{market_cap/1e9:.2f}B"
        else:
            cap_str = f"{market_cap/1e6:.2f}M"
        output += f"\n💼 市值: {cap_str} {currency}\n"
    
    # 添加 52 周区间
    week_high = data.get('52_week_high')
    week_low = data.get('52_week_low')
    if week_high and week_low and price:
        position = (price - week_low) / (week_high - week_low) * 100
        output += f"\n📅 52周区间: {week_low:.2f} - {week_high:.2f}\n"
        output += f"   当前位置: {position:.1f}% (0%=最低, 100%=最高)\n"
    
    return output

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 get_stock_price.py <股票代码> [股票代码2] ...")
        print("示例:")
        print("  python3 get_stock_price.py NVDA")
        print("  python3 get_stock_price.py NVDA AAPL TSLA")
        print("  python3 get_stock_price.py 0700.HK  # 港股腾讯")
        print("  python3 get_stock_price.py 600519.SS # A股茅台")
        sys.exit(1)
    
    symbols = sys.argv[1:]
    
    # 支持通过 --json 输出 JSON 格式
    if "--json" in symbols:
        symbols.remove("--json")
        results = get_multiple_stocks(symbols)
        print(json.dumps(results, indent=2, default=str))
    else:
        for symbol in symbols:
            data = get_stock_data(symbol.strip().upper())
            print(format_stock_output(data))
            print("\n" + "="*50 + "\n")
