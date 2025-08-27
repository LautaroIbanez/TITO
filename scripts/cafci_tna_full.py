# cafci_tna_full.py
# -*- coding: utf-8 -*-

import io
import os
import re
import time
import requests
import pandas as pd

# ----------------------------
# Config
# ----------------------------
FICHA_URL = "https://api.cafci.org.ar/fondo/{fid}/clase/{cid}/ficha"
PLANILLA_URL = "https://api.cafci.org.ar/pb_get"

# Headers "browser-like" para reducir 403
BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.cafci.org.ar",
    "Referer": "https://www.cafci.org.ar/",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
}

# ----------------------------
# Utilidades
# ----------------------------
def _to_num(x):
    """'2,34%', '2.34', 0.0234 -> float | None (no explota si cambia formato)"""
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace("%", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        return None

def _scale_pct_if_needed(v):
    """Si viene 0.0234 -> 2.34; si ya es 2.34 -> 2.34"""
    if v is None:
        return None
    return v * 100.0 if v <= 1.0 else v

def _requests_session():
    s = requests.Session()
    s.headers.update(BASE_HEADERS)
    return s

# ----------------------------
# Planilla diaria (fallback)
# ----------------------------
def _fetch_planilla_df(session: requests.Session) -> pd.DataFrame:
    r = session.get(PLANILLA_URL, timeout=40)
    r.raise_for_status()
    raw = r.content
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name=0, engine="openpyxl")
    except Exception:
        df = pd.read_excel(io.BytesIO(raw), sheet_name=0)  # xls viejo

    # Normalizar nombres a lower para localizar columnas
    lowmap = {c.lower().strip(): c for c in df.columns}
    def _find(*aliases):
        for a in aliases:
            if a in lowmap:
                return lowmap[a]
        return None

    col_nombre = _find("clase", "clase fondo", "clase_fondo", "fondo", "fondo comun de inversion", "fondo común de inversión")
    col_tna = _find("tna", "tasa nominal anual", "tna (%)", "tna (%) anual")
    col_rend_m = _find("rendimiento mensual", "rend. mensual", "mensual", "month", "monthyear")

    keep = [c for c in [col_nombre, col_tna, col_rend_m] if c]
    out = df[keep].copy() if keep else df.copy()
    ren = {}
    if col_nombre: ren[col_nombre] = "nombre_clase"
    if col_tna: ren[col_tna] = "tna"
    if col_rend_m: ren[col_rend_m] = "rendimiento_mensual"
    out = out.rename(columns=ren)

    if "tna" in out.columns:
        out["tna"] = out["tna"].apply(_to_num).apply(_scale_pct_if_needed)
    if "rendimiento_mensual" in out.columns:
        out["rendimiento_mensual"] = out["rendimiento_mensual"].apply(_to_num).apply(_scale_pct_if_needed)

    # quitar duplicados por nombre (si los hubiera)
    if "nombre_clase" in out.columns:
        out = out.dropna(subset=["nombre_clase"]).drop_duplicates(subset=["nombre_clase"])
    return out

def _match_row_by_name(df_planilla: pd.DataFrame, nombre_clase: str):
    """Intenta match directo; si no, usa un match laxo (ignora espacios y mayúsculas)."""
    if df_planilla.empty or not nombre_clase:
        return None
    # 1) exacto
    m = df_planilla[df_planilla["nombre_clase"].astype(str).str.strip() == nombre_clase.strip()]
    if not m.empty:
        return m.iloc[0].to_dict()
    # 2) laxo
    def norm(s): return re.sub(r"\s+", "", str(s).lower())
    key = norm(nombre_clase)
    df_planilla = df_planilla.assign(_k=df_planilla["nombre_clase"].map(norm))
    m2 = df_planilla[df_planilla["_k"] == key]
    if not m2.empty:
        return m2.iloc[0].drop(labels=["_k"]).to_dict()
    # 3) contiene
    m3 = df_planilla[df_planilla["nombre_clase"].str.contains(re.escape(nombre_clase), case=False, na=False)]
    if not m3.empty:
        return m3.iloc[0].to_dict()
    return None

# ----------------------------
# API de Ficha (principal)
# ----------------------------
def _fetch_ficha_json(session: requests.Session, fondoId: int, claseId: int):
    url = FICHA_URL.format(fid=fondoId, cid=claseId)
    r = session.get(url, timeout=15)
    if r.status_code == 403:
        # reintento con Referer más específico
        tmp_headers = dict(session.headers)
        tmp_headers["Referer"] = f"https://www.cafci.org.ar/ficha-fondo.html?q={fondoId};{claseId}"
        r = session.get(url, headers=tmp_headers, timeout=15)
    r.raise_for_status()
    return r.json()

def _parse_ficha(js: dict, tipo="monthYear"):
    data = js.get("data", js)
    info = data.get("info", {})
    diaria = info.get("diaria", {})
    rend = diaria.get("rendimientos", {}) if isinstance(diaria.get("rendimientos", {}), dict) else {}

    tna = None
    rend_m = None

    if isinstance(rend.get(tipo), dict):
        tna = _to_num(rend[tipo].get("tna"))
        rend_m = _to_num(rend[tipo].get("rendimiento"))

    if tna is None and isinstance(rend.get("year"), dict):
        tna = _to_num(rend["year"].get("tna"))

    if rend_m is None and isinstance(rend.get("month"), dict):
        rend_m = _to_num(rend["month"].get("rendimiento")) or _to_num(rend["month"].get("tna"))

    if rend_m is None and isinstance(rend.get("monthYear"), dict):
        rend_m = _to_num(rend["monthYear"].get("rendimiento"))

    tna = _scale_pct_if_needed(tna) if tna is not None else None
    rend_m = _scale_pct_if_needed(rend_m) if rend_m is not None else None

    return tna, rend_m

# ----------------------------------------------------------
# FUNCIONES DROP-IN (firmas compatibles)
# ----------------------------------------------------------
def obtener_tna_api(fondoId, claseId, tipo="monthYear", nombre_clase_fallback=None):
    """
    Devuelve (tna, rendimiento_mensual). Si la ficha devuelve 403/estructura distinta,
    cae a planilla diaria y busca por nombre de clase (si se provee).
    """
    s = _requests_session()
    # 1) Intento ficha
    try:
        js = _fetch_ficha_json(s, fondoId, claseId)
        tna, rend_m = _parse_ficha(js, tipo=tipo)
        if tna is not None or rend_m is not None:
            return tna, rend_m
    except Exception as e:
        print(f"[WARN] ficha {fondoId};{claseId} -> {e}")

    # 2) Fallback planilla
    try:
        pl = _fetch_planilla_df(s)
        if "nombre_clase" in pl.columns and nombre_clase_fallback:
            row = _match_row_by_name(pl, nombre_clase_fallback)
            if row:
                tna = row.get("tna")
                rend_m = row.get("rendimiento_mensual")
                return (tna if pd.notna(tna) else None,
                        rend_m if pd.notna(rend_m) else None)
    except Exception as e:
        print(f"[WARN] planilla fallback -> {e}")

    return None, None


def procesar_categoria(nombre, dicc, tipo="monthYear", plot=False, color="orange"):
    """
    dicc: { 'Nombre de la Clase': (fondoId, claseId), ... }
    plot: False para no graficar (recomendado si corrés muchas clases)
    """
    resultados = []
    for nombre_fondo, (fid, cid) in dicc.items():
        tna, rendimiento_mensual = obtener_tna_api(fid, cid, tipo=tipo, nombre_clase_fallback=nombre_fondo)
        resultados.append({
            "fondo": nombre_fondo,
            "tna": tna,
            "rendimiento_mensual": rendimiento_mensual
        })
        time.sleep(0.35)

    df = pd.DataFrame(resultados)

    # Ordenar por TNA (manteniendo NaN al final, sin FutureWarning)
    if "tna" in df.columns:
        df["tna_sort"] = pd.to_numeric(df["tna"], errors="coerce").fillna(-1e12)
        df = df.sort_values("tna_sort", ascending=False).drop(columns=["tna_sort"]).reset_index(drop=True)

    print(f"\n{nombre} - TNA y Rendimiento Mensual (CAFCI ficha -> planilla fallback):")
    print(df.to_string(index=False))

    if plot:
        import matplotlib.pyplot as plt
        df_plot = df[df["tna"].notna() | df["rendimiento_mensual"].notna()].copy()
        if not df_plot.empty:
            x = range(len(df_plot))
            bar_w = 0.4
            plt.figure(figsize=(10, max(3, len(df_plot) * 0.4 + 2)))
            if df_plot["tna"].notna().any():
                plt.barh([i + bar_w for i in x], df_plot["tna"].fillna(0.0),
                         height=bar_w, label="TNA (%)", color=color)
            if df_plot["rendimiento_mensual"].notna().any():
                plt.barh(x, df_plot["rendimiento_mensual"].fillna(0.0),
                         height=bar_w, label="Rend. mensual (%)", color="skyblue")
            plt.yticks([i + bar_w/2 for i in x], df_plot["fondo"])
            plt.xlabel("Porcentaje (%)")
            plt.title(f"{nombre} – TNA vs Rendimiento Mensual")
            plt.legend()
            plt.grid(axis="x", linestyle="--", alpha=0.5)
            plt.tight_layout()
            plt.show()

    return df

# ----------------------------
# PRUEBA CON TUS LISTAS
# ----------------------------
if __name__ == "__main__":
    # --- FONDOS ---
    fondos_money_market = {
        "Schroder Liquidez - Clase B": (1343, 3831),
        "MAF Liquidez - Clase A": (1500, 4486),
        "Chaco FCI Money Market - Clase A": (1465, 4332),
        "Delta Pesos - Clase X": (394, 3919),
        "Balanz Capital Money Market - Clase A": (1213, 3355),
        "Mercado Fondo - Clase A": (798, 1982),
        "Cocos Ahorro - Clase A": (1469, 4337),
        "IOL Dólar Ahorro Plus - Clase D": (1570, 5100),
    }

    fondos_renta_fija = {
        "MAF Ahorro Plus - Clase C": (655, 1354),
        "Compass Opportunity - Clase F": (317, 1867),
        "Compass Renta Fija III - Clase F": (429, 1879),
        "IOL Dólar Ahorro Plus - Clase C": (1570, 5099),
    }

    fondos_renta_variable = {
        "Alpha Latam - Clase A": (1235, 3422),
        "Fima Acciones Latinoamerica - Clase A": (851, 2426),
        "Delta Select - Clase G": (419, 1926),
        "Alpha Latam - Clase Q Ley N° 27.743": (1235, 5036),
    }

    fondos_renta_mixta = {
        "Schroder Retorno Absoluto Dólares - Clase B": (555, 2199),
        "Delta Multimercado I - Clase G": (466, 1922),
        "Gainvest Balanceado - Clase E": (545, 2638),
        "Alpha Renta Balanceada Global - Clase D": (502, 1838),
        "Alpha Retorno Total - Clase I": (184, 1848),
        "Gainvest Balanceado - Clase F": (545, 2639),
    }

    # Ejecutar cada categoría (sin gráficos para correr rápido)
    df_mm = procesar_categoria("Money Market", fondos_money_market, tipo="monthYear", plot=False)
    df_rf = procesar_categoria("Renta Fija", fondos_renta_fija, tipo="monthYear", plot=False)
    df_rv = procesar_categoria("Renta Variable", fondos_renta_variable, tipo="monthYear", plot=False)
    df_rm = procesar_categoria("Renta Mixta", fondos_renta_mixta, tipo="monthYear", plot=False)

    # Unir todo en un solo DataFrame y guardar
    df_all = pd.concat([
        df_mm.assign(categoria="Money Market"),
        df_rf.assign(categoria="Renta Fija"),
        df_rv.assign(categoria="Renta Variable"),
        df_rm.assign(categoria="Renta Mixta"),
    ], ignore_index=True)

    print("\nResumen combinado (primeras filas):")
    print(df_all.head(12).to_string(index=False))

    # Guardar CSV con rutas relativas basadas en la raíz del proyecto
    outfile = os.path.join(os.getcwd(), "data", "fondos_tna_rendimiento.csv")
    df_all.to_csv(outfile, index=False, encoding="utf-8")
    print(f"\nArchivo guardado: {outfile}")
