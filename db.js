import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// abrir base de datos
export const db = await open({
  filename: './database.db',
  driver: sqlite3.Database
});

// crear tabla si no existe
await db.exec(`
  CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origen_lat TEXT,
    origen_lon TEXT,
    destino_lat TEXT,
    destino_lon TEXT,
    distancia TEXT,
    duracion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);