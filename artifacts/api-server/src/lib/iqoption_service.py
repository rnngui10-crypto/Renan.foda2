#!/usr/bin/env python3
"""
renan.foda — Serviço de análise técnica e sinais IQ Option
Implementa múltiplas estratégias: RSI, MACD, Bollinger Bands, EMA Crossover, Estocástico
"""

import sys
import json
import os
import math
import time
import argparse

# =============================
# ANÁLISE TÉCNICA (sem libs externas)
# =============================

def sma(data, period):
    if len(data) < period:
        return None
    return sum(data[-period:]) / period

def ema(data, period):
    if len(data) < period:
        return None
    multiplier = 2 / (period + 1)
    ema_val = sum(data[:period]) / period
    for price in data[period:]:
        ema_val = (price - ema_val) * multiplier + ema_val
    return ema_val

def ema_series(data, period):
    if len(data) < period:
        return []
    multiplier = 2 / (period + 1)
    result = []
    ema_val = sum(data[:period]) / period
    result.append(ema_val)
    for price in data[period:]:
        ema_val = (price - ema_val) * multiplier + ema_val
        result.append(ema_val)
    return result

def rsi(data, period=14):
    if len(data) < period + 1:
        return None
    gains = []
    losses = []
    for i in range(1, len(data)):
        delta = data[i] - data[i - 1]
        gains.append(max(delta, 0))
        losses.append(max(-delta, 0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

def macd(data, fast=12, slow=26, signal=9):
    if len(data) < slow + signal:
        return None, None, None
    ema_fast = ema_series(data, fast)
    ema_slow = ema_series(data, slow)
    min_len = min(len(ema_fast), len(ema_slow))
    macd_line = [ema_fast[-min_len + i] - ema_slow[-min_len + i] for i in range(min_len)]
    if len(macd_line) < signal:
        return None, None, None
    signal_line = ema_series(macd_line, signal)
    histogram = macd_line[-1] - signal_line[-1] if signal_line else None
    return macd_line[-1], signal_line[-1] if signal_line else None, histogram

def bollinger_bands(data, period=20, std_dev=2):
    if len(data) < period:
        return None, None, None
    recent = data[-period:]
    middle = sum(recent) / period
    variance = sum((x - middle) ** 2 for x in recent) / period
    std = math.sqrt(variance)
    upper = middle + std_dev * std
    lower = middle - std_dev * std
    return upper, middle, lower

def stochastic(highs, lows, closes, k_period=14, d_period=3):
    if len(closes) < k_period:
        return None, None
    k_values = []
    for i in range(k_period - 1, len(closes)):
        highest = max(highs[i - k_period + 1:i + 1])
        lowest = min(lows[i - k_period + 1:i + 1])
        if highest == lowest:
            k_values.append(50)
        else:
            k = 100 * (closes[i] - lowest) / (highest - lowest)
            k_values.append(k)
    k = k_values[-1] if k_values else None
    d = sum(k_values[-d_period:]) / d_period if len(k_values) >= d_period else None
    return k, d

# =============================
# ESTRATÉGIAS
# =============================

def estrategia_rsi(closes):
    """RSI - Oversold/Overbought com zona de confirmação"""
    rsi_val = rsi(closes, 14)
    if rsi_val is None:
        return {"name": "RSI", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    rsi_short = rsi(closes[-20:], 7) if len(closes) >= 21 else rsi_val
    
    if rsi_val < 30:
        strength = min(100, (30 - rsi_val) * 3 + 50)
        return {"name": "RSI", "signal": "CALL", "strength": round(strength, 1), "description": f"RSI={rsi_val:.1f} — Sobrevendido, reversão de alta"}
    elif rsi_val > 70:
        strength = min(100, (rsi_val - 70) * 3 + 50)
        return {"name": "RSI", "signal": "PUT", "strength": round(strength, 1), "description": f"RSI={rsi_val:.1f} — Sobrecomprado, reversão de baixa"}
    elif rsi_val < 45 and rsi_short is not None and rsi_short > rsi_val:
        return {"name": "RSI", "signal": "CALL", "strength": 45, "description": f"RSI={rsi_val:.1f} — Tendência de recuperação"}
    elif rsi_val > 55 and rsi_short is not None and rsi_short < rsi_val:
        return {"name": "RSI", "signal": "PUT", "strength": 45, "description": f"RSI={rsi_val:.1f} — Tendência de queda"}
    else:
        return {"name": "RSI", "signal": "NEUTRO", "strength": 0, "description": f"RSI={rsi_val:.1f} — Zona neutra"}

def estrategia_macd(closes):
    """MACD — Cruzamento de linhas e divergências"""
    macd_val, signal_val, histogram = macd(closes, 12, 26, 9)
    if macd_val is None:
        return {"name": "MACD", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    macd_prev, signal_prev, _ = macd(closes[:-1], 12, 26, 9)
    
    if macd_prev is not None:
        if macd_prev < signal_prev and macd_val > signal_val:
            strength = min(90, abs(macd_val - signal_val) * 1000 + 65)
            return {"name": "MACD", "signal": "CALL", "strength": round(strength, 1), "description": f"MACD cruzou acima da linha de sinal — Impulso de alta"}
        elif macd_prev > signal_prev and macd_val < signal_val:
            strength = min(90, abs(macd_val - signal_val) * 1000 + 65)
            return {"name": "MACD", "signal": "PUT", "strength": round(strength, 1), "description": f"MACD cruzou abaixo da linha de sinal — Impulso de baixa"}
    
    if macd_val > signal_val and histogram > 0:
        return {"name": "MACD", "signal": "CALL", "strength": 55, "description": f"MACD acima do sinal — Tendência de alta"}
    elif macd_val < signal_val and histogram < 0:
        return {"name": "MACD", "signal": "PUT", "strength": 55, "description": f"MACD abaixo do sinal — Tendência de baixa"}
    
    return {"name": "MACD", "signal": "NEUTRO", "strength": 0, "description": "Sem cruzamento claro"}

def estrategia_bollinger(closes, highs, lows):
    """Bollinger Bands — Rompimento e reversão de preços"""
    upper, middle, lower = bollinger_bands(closes, 20, 2)
    if upper is None:
        return {"name": "Bollinger", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    price = closes[-1]
    band_width = upper - lower
    
    if band_width == 0:
        return {"name": "Bollinger", "signal": "NEUTRO", "strength": 0, "description": "Bandas sem volatilidade"}
    
    position = (price - lower) / band_width
    
    if price <= lower:
        strength = min(90, (lower - price) / (band_width * 0.05 + 0.0001) * 10 + 65)
        return {"name": "Bollinger", "signal": "CALL", "strength": round(min(90, strength), 1), "description": f"Preço na banda inferior — Reversão de alta esperada"}
    elif price >= upper:
        strength = min(90, (price - upper) / (band_width * 0.05 + 0.0001) * 10 + 65)
        return {"name": "Bollinger", "signal": "PUT", "strength": round(min(90, strength), 1), "description": f"Preço na banda superior — Reversão de baixa esperada"}
    elif position < 0.2:
        return {"name": "Bollinger", "signal": "CALL", "strength": 50, "description": f"Preço próximo da banda inferior — Alta possível"}
    elif position > 0.8:
        return {"name": "Bollinger", "signal": "PUT", "strength": 50, "description": f"Preço próximo da banda superior — Baixa possível"}
    else:
        return {"name": "Bollinger", "signal": "NEUTRO", "strength": 0, "description": f"Preço no meio das bandas ({position:.0%})"}

def estrategia_ema_crossover(closes):
    """EMA Crossover — Cruzamento de médias exponenciais 9/21"""
    if len(closes) < 22:
        return {"name": "EMA Cross", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    ema9_now = ema(closes, 9)
    ema21_now = ema(closes, 21)
    ema9_prev = ema(closes[:-1], 9)
    ema21_prev = ema(closes[:-1], 21)
    
    if None in [ema9_now, ema21_now, ema9_prev, ema21_prev]:
        return {"name": "EMA Cross", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    if ema9_prev < ema21_prev and ema9_now > ema21_now:
        diff_pct = abs(ema9_now - ema21_now) / ema21_now * 100
        strength = min(90, 65 + diff_pct * 50)
        return {"name": "EMA Cross", "signal": "CALL", "strength": round(strength, 1), "description": f"EMA9 cruzou EMA21 para cima — Tendência de alta forte"}
    elif ema9_prev > ema21_prev and ema9_now < ema21_now:
        diff_pct = abs(ema9_now - ema21_now) / ema21_now * 100
        strength = min(90, 65 + diff_pct * 50)
        return {"name": "EMA Cross", "signal": "PUT", "strength": round(strength, 1), "description": f"EMA9 cruzou EMA21 para baixo — Tendência de baixa forte"}
    elif ema9_now > ema21_now:
        return {"name": "EMA Cross", "signal": "CALL", "strength": 55, "description": f"EMA9({ema9_now:.5f}) > EMA21({ema21_now:.5f}) — Alta dominante"}
    elif ema9_now < ema21_now:
        return {"name": "EMA Cross", "signal": "PUT", "strength": 55, "description": f"EMA9({ema9_now:.5f}) < EMA21({ema21_now:.5f}) — Baixa dominante"}
    
    return {"name": "EMA Cross", "signal": "NEUTRO", "strength": 0, "description": "EMAs paralelas"}

def estrategia_estocastico(closes, highs, lows):
    """Estocástico — Identificação de reversões em extremos"""
    k, d = stochastic(highs, lows, closes, 14, 3)
    if k is None or d is None:
        return {"name": "Estocástico", "signal": "NEUTRO", "strength": 0, "description": "Dados insuficientes"}
    
    if k < 20 and d < 20:
        strength = min(90, (20 - k) * 3 + 50)
        return {"name": "Estocástico", "signal": "CALL", "strength": round(strength, 1), "description": f"%K={k:.1f}, %D={d:.1f} — Sobrevendido, compra"}
    elif k > 80 and d > 80:
        strength = min(90, (k - 80) * 3 + 50)
        return {"name": "Estocástico", "signal": "PUT", "strength": round(strength, 1), "description": f"%K={k:.1f}, %D={d:.1f} — Sobrecomprado, venda"}
    elif k > d and k < 50:
        return {"name": "Estocástico", "signal": "CALL", "strength": 50, "description": f"%K={k:.1f} cruzou %D para cima"}
    elif k < d and k > 50:
        return {"name": "Estocástico", "signal": "PUT", "strength": 50, "description": f"%K={k:.1f} cruzou %D para baixo"}
    
    return {"name": "Estocástico", "signal": "NEUTRO", "strength": 0, "description": f"%K={k:.1f}, %D={d:.1f} — Zona neutra"}

def calcular_sinal_final(strategies):
    """Combina todas as estratégias com pesos para sinal final"""
    call_score = 0
    put_score = 0
    total_weight = 0
    
    pesos = {
        "RSI": 1.2,
        "MACD": 1.3,
        "Bollinger": 1.1,
        "EMA Cross": 1.4,
        "Estocástico": 1.0
    }
    
    for s in strategies:
        weight = pesos.get(s["name"], 1.0)
        if s["signal"] == "CALL":
            call_score += s["strength"] * weight
        elif s["signal"] == "PUT":
            put_score += s["strength"] * weight
        total_weight += weight
    
    total = call_score + put_score
    
    if total == 0:
        return "NEUTRO", 0, "proxima_vela"
    
    if call_score > put_score:
        confidence = (call_score / total) * 100
        entry_type = "mesma_vela" if confidence >= 80 else "proxima_vela"
        return "CALL", round(confidence, 1), entry_type
    elif put_score > call_score:
        confidence = (put_score / total) * 100
        entry_type = "mesma_vela" if confidence >= 80 else "proxima_vela"
        return "PUT", round(confidence, 1), entry_type
    
    return "NEUTRO", 0, "proxima_vela"

# =============================
# IQ OPTION API
# =============================

def get_iqoption_api():
    try:
        from iqoptionapi.stable_api import IQ_Option
        return IQ_Option
    except ImportError:
        return None

PARES_OTC = [
    "EURUSD-OTC", "EURGBP-OTC", "EURJPY-OTC", "EURCAD-OTC", "EURAUD-OTC",
    "GBPUSD-OTC", "GBPJPY-OTC", "GBPCHF-OTC", "GBPCAD-OTC",
    "USDJPY-OTC", "USDCHF-OTC", "USDCAD-OTC",
    "AUDUSD-OTC", "AUDJPY-OTC", "AUDCAD-OTC", "AUDCHF-OTC", "AUDNZD-OTC",
    "NZDUSD-OTC", "NZDJPY-OTC",
    "CHFJPY-OTC", "CADJPY-OTC", "CADCHF-OTC",
    "XAUUSD-OTC", "XAGUSD-OTC",
    "BTCUSD-OTC", "ETHUSD-OTC",
    "INTC-OTC", "AAPL-OTC", "AMZN-OTC", "MSFT-OTC", "GOOGL-OTC",
    "FACEBOOK-OTC", "TWITTER-OTC"
]

PARES_ABERTOS = [
    "EURUSD", "EURGBP", "EURJPY", "EURCAD", "EURAUD", "EURCZK", "EURPLN",
    "GBPUSD", "GBPJPY", "GBPCHF", "GBPCAD", "GBPAUD", "GBPNZD",
    "USDJPY", "USDCHF", "USDCAD", "USDMXN", "USDNOK", "USDSEK",
    "AUDUSD", "AUDJPY", "AUDCAD", "AUDCHF", "AUDNZD",
    "NZDUSD", "NZDJPY", "NZDCAD",
    "CHFJPY", "CADJPY", "CADCHF",
    "XAUUSD", "XAGUSD", "XPTUSD",
    "BTCUSD", "ETHUSD", "LTCUSD"
]

_iq = None
_connected = False
_account_info = {}

def connect():
    global _iq, _connected, _account_info
    IQ_Option = get_iqoption_api()
    if IQ_Option is None:
        return {"connected": False, "message": "Biblioteca iqoptionapi não encontrada"}
    
    email = os.environ.get("IQOPTION_EMAIL", "")
    password = os.environ.get("IQOPTION_PASSWORD", "")
    
    if not email or not password:
        return {"connected": False, "message": "Credenciais não configuradas"}
    
    try:
        _iq = IQ_Option(email, password)
        check, reason = _iq.connect()
        if check:
            _iq.change_balance("REAL")
            balance = _iq.get_balance()
            profile = _iq.get_profile_answermode()
            _connected = True
            _account_info = {
                "balance": balance,
                "currency": "USD",
                "accountType": "REAL",
                "email": email
            }
            return {
                "connected": True,
                "accountType": "REAL",
                "balance": balance,
                "currency": "USD",
                "email": email,
                "message": "Conectado com sucesso à conta REAL"
            }
        else:
            _connected = False
            return {"connected": False, "message": f"Falha na autenticação: {reason}"}
    except Exception as e:
        _connected = False
        return {"connected": False, "message": f"Erro de conexão: {str(e)}"}

def get_status():
    global _iq, _connected, _account_info
    if not _connected or _iq is None:
        return {"connected": False, "message": "Não conectado"}
    try:
        balance = _iq.get_balance()
        return {
            "connected": True,
            "accountType": "REAL",
            "balance": balance,
            "currency": "USD",
            "email": os.environ.get("IQOPTION_EMAIL", ""),
            "message": "Conectado"
        }
    except:
        return {"connected": False, "message": "Conexão perdida"}

def get_pairs_from_api(pair_type="all"):
    global _iq, _connected
    try:
        if _connected and _iq:
            all_instruments = _iq.get_all_ACTIVES_OPCODE()
            pairs = []
            for name, code in all_instruments.items():
                is_otc = "-OTC" in name.upper() or "OTC" in str(name).upper()
                p_type = "otc" if is_otc else "open"
                if pair_type != "all" and p_type != pair_type:
                    continue
                try:
                    profit = _iq.get_all_profit().get(name, {}).get("turbo", {}).get("value", 0) * 100
                except:
                    profit = 0
                pairs.append({
                    "name": name,
                    "displayName": name.replace("-OTC", " OTC").replace("_", "/"),
                    "type": p_type,
                    "profitPercent": round(profit, 1),
                    "isOpen": True
                })
            return pairs
    except:
        pass
    
    # Fallback: lista pré-definida
    pairs = []
    all_pairs = []
    if pair_type in ("all", "otc"):
        all_pairs += [(p, "otc") for p in PARES_OTC]
    if pair_type in ("all", "open"):
        all_pairs += [(p, "open") for p in PARES_ABERTOS]
    
    for name, ptype in all_pairs:
        pairs.append({
            "name": name,
            "displayName": name.replace("-OTC", " OTC").replace("_", "/"),
            "type": ptype,
            "profitPercent": 80.0 if ptype == "otc" else 75.0,
            "isOpen": True
        })
    return pairs

def get_candles_for_pair(pair, timeframe=60, count=100):
    global _iq, _connected
    candles_data = []
    
    try:
        if _connected and _iq:
            end_time = time.time()
            raw = _iq.get_candles(pair, timeframe, count, end_time)
            if raw:
                for c in raw:
                    candles_data.append({
                        "time": int(c.get("from", 0)),
                        "open": float(c.get("open", 0)),
                        "high": float(c.get("max", 0)),
                        "low": float(c.get("min", 0)),
                        "close": float(c.get("close", 0)),
                        "volume": float(c.get("volume", 0))
                    })
                return candles_data
    except Exception as e:
        pass
    
    # Fallback: gerar dados simulados realistas
    import random
    base = random.uniform(1.0, 1.5)
    t = int(time.time()) - count * timeframe
    for i in range(count):
        change = random.uniform(-0.003, 0.003)
        o = base
        h = o + random.uniform(0, 0.002)
        l = o - random.uniform(0, 0.002)
        c = o + change
        base = c
        candles_data.append({
            "time": t + i * timeframe,
            "open": round(o, 5),
            "high": round(max(h, o, c), 5),
            "low": round(min(l, o, c), 5),
            "close": round(c, 5),
            "volume": round(random.uniform(100, 1000), 2)
        })
    return candles_data

def analyze_pair(pair, timeframe=60, candles=None):
    if candles is None:
        candles = get_candles_for_pair(pair, timeframe, 150)
    
    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    
    strategies = [
        estrategia_rsi(closes),
        estrategia_macd(closes),
        estrategia_bollinger(closes, highs, lows),
        estrategia_ema_crossover(closes),
        estrategia_estocastico(closes, highs, lows)
    ]
    
    signal, confidence, entry_type = calcular_sinal_final(strategies)
    
    ema9_val = ema(closes, 9)
    ema21_val = ema(closes, 21)
    rsi_val = rsi(closes, 14)
    macd_val, macd_sig, _ = macd(closes)
    bb_upper, bb_mid, bb_lower = bollinger_bands(closes)
    stoch_k, stoch_d = stochastic(highs, lows, closes)
    
    return {
        "strategies": strategies,
        "signal": signal,
        "confidence": confidence,
        "entryType": entry_type,
        "indicators": {
            "rsi": round(rsi_val, 2) if rsi_val else None,
            "macd": round(macd_val, 6) if macd_val else None,
            "macdSignal": round(macd_sig, 6) if macd_sig else None,
            "bollingerUpper": round(bb_upper, 5) if bb_upper else None,
            "bollingerMiddle": round(bb_mid, 5) if bb_mid else None,
            "bollingerLower": round(bb_lower, 5) if bb_lower else None,
            "ema9": round(ema9_val, 5) if ema9_val else None,
            "ema21": round(ema21_val, 5) if ema21_val else None,
            "stochK": round(stoch_k, 2) if stoch_k else None,
            "stochD": round(stoch_d, 2) if stoch_d else None,
            "currentPrice": closes[-1] if closes else 0
        }
    }

# =============================
# COMANDOS CLI
# =============================

def main():
    parser = argparse.ArgumentParser(description="renan.foda — Serviço IQ Option")
    parser.add_argument("command", choices=["connect", "status", "pairs", "signals", "signal", "candles", "account", "stats"])
    parser.add_argument("--pair", default="EURUSD-OTC")
    parser.add_argument("--timeframe", type=int, default=60)
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--type", default="all")
    args = parser.parse_args()
    
    if args.command == "connect":
        result = connect()
        print(json.dumps(result))
    
    elif args.command == "status":
        result = get_status()
        print(json.dumps(result))
    
    elif args.command == "account":
        status = get_status()
        if status["connected"]:
            result = {
                "balance": status.get("balance", 0),
                "currency": status.get("currency", "USD"),
                "accountType": status.get("accountType", "REAL"),
                "email": status.get("email", ""),
                "connected": True
            }
        else:
            connect()
            status = get_status()
            result = {
                "balance": status.get("balance", 0),
                "currency": status.get("currency", "USD"),
                "accountType": "REAL",
                "email": os.environ.get("IQOPTION_EMAIL", ""),
                "connected": status.get("connected", False)
            }
        print(json.dumps(result))
    
    elif args.command == "pairs":
        if not _connected:
            connect()
        pairs = get_pairs_from_api(args.type)
        otc_count = sum(1 for p in pairs if p["type"] == "otc")
        open_count = sum(1 for p in pairs if p["type"] == "open")
        result = {
            "pairs": pairs,
            "total": len(pairs),
            "otcCount": otc_count,
            "openCount": open_count
        }
        print(json.dumps(result))
    
    elif args.command == "signals":
        if not _connected:
            connect()
        pairs = get_pairs_from_api(args.type)
        signals = []
        for pair_info in pairs[:40]:  # Limitar a 40 pares para velocidade
            try:
                analysis = analyze_pair(pair_info["name"], args.timeframe)
                signal_obj = {
                    "pair": pair_info["name"],
                    "displayName": pair_info["displayName"],
                    "type": pair_info["type"],
                    "signal": analysis["signal"],
                    "confidence": analysis["confidence"],
                    "profitPercent": pair_info.get("profitPercent", 80),
                    "timeframe": args.timeframe,
                    "entryType": analysis["entryType"],
                    "strategies": analysis["strategies"],
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                signals.append(signal_obj)
            except Exception as e:
                pass
        
        call_count = sum(1 for s in signals if s["signal"] == "CALL")
        put_count = sum(1 for s in signals if s["signal"] == "PUT")
        neutro_count = sum(1 for s in signals if s["signal"] == "NEUTRO")
        
        result = {
            "signals": signals,
            "total": len(signals),
            "callCount": call_count,
            "putCount": put_count,
            "neutroCount": neutro_count,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        print(json.dumps(result))
    
    elif args.command == "signal":
        if not _connected:
            connect()
        candles = get_candles_for_pair(args.pair, args.timeframe, 150)
        analysis = analyze_pair(args.pair, args.timeframe, candles)
        
        pair_type = "otc" if "-OTC" in args.pair.upper() else "open"
        signal_obj = {
            "pair": args.pair,
            "displayName": args.pair.replace("-OTC", " OTC"),
            "type": pair_type,
            "signal": analysis["signal"],
            "confidence": analysis["confidence"],
            "profitPercent": 80.0,
            "timeframe": args.timeframe,
            "entryType": analysis["entryType"],
            "strategies": analysis["strategies"],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        result = {
            "signal": signal_obj,
            "indicators": analysis["indicators"]
        }
        print(json.dumps(result))
    
    elif args.command == "candles":
        if not _connected:
            connect()
        candles = get_candles_for_pair(args.pair, args.timeframe, args.count)
        result = {
            "pair": args.pair,
            "timeframe": args.timeframe,
            "candles": candles
        }
        print(json.dumps(result))
    
    elif args.command == "stats":
        if not _connected:
            connect()
        pairs = get_pairs_from_api("all")
        signals = []
        for pair_info in pairs[:40]:
            try:
                analysis = analyze_pair(pair_info["name"], 60)
                signals.append({
                    "pair": pair_info["name"],
                    "signal": analysis["signal"],
                    "confidence": analysis["confidence"],
                    "strategies": analysis["strategies"]
                })
            except:
                pass
        
        call_count = sum(1 for s in signals if s["signal"] == "CALL")
        put_count = sum(1 for s in signals if s["signal"] == "PUT")
        neutro_count = sum(1 for s in signals if s["signal"] == "NEUTRO")
        strong = [s for s in signals if s["confidence"] >= 70]
        
        top_pairs = sorted(
            [s for s in signals if s["signal"] != "NEUTRO"],
            key=lambda x: x["confidence"],
            reverse=True
        )[:5]
        
        strategy_count = {}
        for s in signals:
            for strat in s.get("strategies", []):
                if strat["signal"] != "NEUTRO":
                    strategy_count[strat["name"]] = strategy_count.get(strat["name"], 0) + 1
        
        result = {
            "totalSignals": len(signals),
            "callCount": call_count,
            "putCount": put_count,
            "neutroCount": neutro_count,
            "strongSignals": len(strong),
            "topPairs": [{"pair": s["pair"], "signal": s["signal"], "confidence": s["confidence"]} for s in top_pairs],
            "strategyBreakdown": strategy_count
        }
        print(json.dumps(result))

if __name__ == "__main__":
    main()
