import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

// Configuración de rutas
const PYTHON_BIN = "python"; // o "python3" según el sistema
const PY_SCRIPT = path.join(process.cwd(), "scripts", "cafci_tna_full.py");
const CACHE_FILE = path.join(process.cwd(), "data", "fondos_tna_rendimiento.csv");
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en ms

interface CacheInfo {
  exists: boolean;
  age: number;
  isValid: boolean;
}

interface FundData {
  fondo: string;
  tna: number | null;
  rendimiento_mensual: number | null;
  categoria: string;
}

export class CafciCache {
  private static instance: CafciCache;
  private lastUpdate: number = 0;
  private cacheData: FundData[] | null = null;

  private constructor() {}

  public static getInstance(): CafciCache {
    if (!CafciCache.instance) {
      CafciCache.instance = new CafciCache();
    }
    return CafciCache.instance;
  }

  /**
   * Verifica el estado del caché
   */
  private async getCacheInfo(): Promise<CacheInfo> {
    try {
      const stats = await fs.stat(CACHE_FILE);
      const age = Date.now() - stats.mtime.getTime();
      const isValid = age < CACHE_DURATION;
      
      return {
        exists: true,
        age,
        isValid
      };
    } catch (error) {
      return {
        exists: false,
        age: Infinity,
        isValid: false
      };
    }
  }

  /**
   * Ejecuta el script de Python para actualizar datos
   */
  private async updateCache(): Promise<void> {
    console.log("🔄 Actualizando caché de CAFCI...");
    
    try {
      const command = `${PYTHON_BIN} "${PY_SCRIPT}"`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 300000 // 5 minutos timeout
      });

      if (stderr) {
        console.warn("⚠️ Advertencias del script Python:", stderr);
      }

      console.log("✅ Caché de CAFCI actualizado exitosamente");
      this.lastUpdate = Date.now();
      this.cacheData = null; // Invalidar caché en memoria
      
    } catch (error) {
      console.error("❌ Error actualizando caché de CAFCI:", error);
      throw new Error(`Error ejecutando script Python: ${error}`);
    }
  }

  /**
   * Lee los datos del archivo CSV
   */
  private async readCacheFile(): Promise<FundData[]> {
    try {
      const content = await fs.readFile(CACHE_FILE, "utf-8");
      const lines = content.trim().split("\n");
      const headers = lines[0].split(",");
      
      const data: FundData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const row: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || "";
          row[header.trim()] = value === "" ? null : parseFloat(value) || value;
        });
        
        data.push(row as FundData);
      }
      
      return data;
    } catch (error) {
      console.error("❌ Error leyendo archivo de caché:", error);
      throw new Error(`Error leyendo archivo CSV: ${error}`);
    }
  }

  /**
   * Obtiene los datos de fondos, actualizando el caché si es necesario
   */
  public async getFundData(): Promise<FundData[]> {
    // Si tenemos datos en memoria y son recientes, los devolvemos
    if (this.cacheData && (Date.now() - this.lastUpdate) < 60000) { // 1 minuto
      return this.cacheData;
    }

    const cacheInfo = await this.getCacheInfo();
    
    // Si el caché no existe o no es válido, lo actualizamos
    if (!cacheInfo.exists || !cacheInfo.isValid) {
      await this.updateCache();
    }
    
    // Leemos los datos del archivo
    this.cacheData = await this.readCacheFile();
    this.lastUpdate = Date.now();
    
    return this.cacheData;
  }

  /**
   * Obtiene datos filtrados por categoría
   */
  public async getFundDataByCategory(category: string): Promise<FundData[]> {
    const data = await this.getFundData();
    return data.filter(fund => fund.categoria === category);
  }

  /**
   * Busca un fondo específico por nombre
   */
  public async findFund(fundName: string): Promise<FundData | null> {
    const data = await this.getFundData();
    return data.find(fund => 
      fund.fondo.toLowerCase().includes(fundName.toLowerCase())
    ) || null;
  }

  /**
   * Fuerza la actualización del caché
   */
  public async forceUpdate(): Promise<void> {
    await this.updateCache();
  }

  /**
   * Obtiene estadísticas del caché
   */
  public async getCacheStats(): Promise<{
    lastUpdate: number;
    cacheAge: number;
    isValid: boolean;
    fundCount: number;
  }> {
    const cacheInfo = await this.getCacheInfo();
    const data = await this.getFundData();
    
    return {
      lastUpdate: this.lastUpdate,
      cacheAge: cacheInfo.age,
      isValid: cacheInfo.isValid,
      fundCount: data.length
    };
  }
}

// Exportar instancia singleton
export const cafciCache = CafciCache.getInstance();






