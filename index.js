import express from 'express';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app = express();

// Variables de entorno
const PORT = process.env.PORT || 3000;
const UA = process.env.USER_AGENT || 'LabUCSM/1.0';

app.use(express.json());
app.use(express.static('public'));

// Helper fetch con User-Agent
const osmFetch = url =>
  fetch(url, {
    headers: { 'User-Agent': UA }
  }).then(r => r.json());

/* ──────────────── */
/*  GEOCODIFICACIÓN */
/* ──────────────── */
app.get('/api/geocode', async (req, res) => {

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Se requieren lat y lon' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

    const data = await osmFetch(url);

    res.json({
      direccion: data.display_name,
      ciudad: data.address?.city || data.address?.town,
      pais: data.address?.country
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ──────────────── */
/*  RUTA + GUARDADO */
/* ──────────────── */
app.get('/api/ruta', async (req, res) => {

  const { oLat, oLon, dLat, dLon } = req.query;

  if (!oLat || !oLon || !dLat || !dLon) {
    return res.status(400).json({ error: 'Faltan coordenadas' });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=false`;

    const data = await osmFetch(url);

    if (data.code !== 'Ok') {
      return res.status(502).json({ error: data.code });
    }

    const ruta = data.routes[0];

    // ✅ Guardar en la base de datos
    await db.run(
      `INSERT INTO historial 
       (origen_lat, origen_lon, destino_lat, destino_lon, distancia, duracion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [oLat, oLon, dLat, dLon, ruta.distance, ruta.duration]
    );

    res.json({
      distancia_km: (ruta.distance / 1000).toFixed(2),
      duracion_min: (ruta.duration / 60).toFixed(1)
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ──────────────── */
/* HISTORIAL */
/* ──────────────── */
app.get('/api/historial', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM historial ORDER BY fecha DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ──────────────── */
/* SERVIDOR */
/* ──────────────── */
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

/* ELIMINAR HISTORIAL */
app.delete('/api/historial', async (req, res) => {
  try {
    await db.run('DELETE FROM historial');
    res.json({ mensaje: 'Historial eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});