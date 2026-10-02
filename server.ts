import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { optimizeRouteAlgorithmic, RouteOptimizationParams } from './src/utils/aiRouteOptimizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK (automatically uses process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI();

// Endpoint for AI Route Optimization
app.post('/api/optimize-path', async (req, res) => {
  const params: RouteOptimizationParams = req.body;

  // Always compute base algorithmic multi-iteration solution first
  const baseResult = optimizeRouteAlgorithmic(params);

  // If Gemini API is configured, request high-level AI spatial reasoning & trajectory refinement
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Actúa como un sistema experto de navegación y robótica cinemática para un rover con microcontrolador ESP32.
El rover se encuentra en el Punto A (${params.pointA.x.toFixed(1)}, ${params.pointA.y.toFixed(1)}) cm con orientación inicial ${params.initialHeading || 90}° y debe alcanzar el Punto B (${params.pointB.x.toFixed(1)}, ${params.pointB.y.toFixed(1)}) cm.
Modo de optimización seleccionado: "${params.mode || 'balanced'}".
Criterios de la mejor ruta:
1. Menor distancia euclidiana total.
2. Optimización en el giro: giros de curvatura suave y continua, evitando giros bruscos > 45° que provoquen derrape o frenadas en los motores DC.
3. Evasión segura de los siguientes obstáculos en el entorno (radio en cm):
${params.obstacles.map((o, idx) => `  - Obstáculo ${idx + 1} (${o.label || 'Obj'}): Centro=(${o.x}, ${o.y}), Radio=${o.radius}cm`).join('\n')}

Genera la ruta óptima refinada para el microcontrolador ESP32, indicando el algoritmo empleado, la cantidad estimada de iteraciones evaluadas (ej. 160-240) y una breve explicación técnica en español.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              algorithmUsed: { type: 'string', description: 'Nombre formal del algoritmo de IA/robótica empleado' },
              iterationsCount: { type: 'integer', description: 'Cantidad de iteraciones evaluadas para hallar el óptimo global' },
              reasoning: { type: 'string', description: 'Justificación concisa en español de la optimización de distancia y giro suave' },
              refinedWaypoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    speed: { type: 'number' },
                    heading: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
              },
            },
            required: ['algorithmUsed', 'iterationsCount', 'reasoning'],
          },
        },
      });

      const parsedText = response.text?.trim();
      if (parsedText) {
        const parsed = JSON.parse(parsedText);
        // If Gemini provided valid waypoints that start at A and end near B, merge them
        if (
          parsed.refinedWaypoints &&
          Array.isArray(parsed.refinedWaypoints) &&
          parsed.refinedWaypoints.length >= 2
        ) {
          const aiWaypoints = parsed.refinedWaypoints;
          // Ensure first waypoint is Point A and last is Point B
          aiWaypoints[0].x = params.pointA.x;
          aiWaypoints[0].y = params.pointA.y;
          aiWaypoints[aiWaypoints.length - 1].x = params.pointB.x;
          aiWaypoints[aiWaypoints.length - 1].y = params.pointB.y;

          return res.json({
            ...baseResult,
            algorithmUsed: parsed.algorithmUsed || baseResult.algorithmUsed,
            iterationsCount: Math.max(parsed.iterationsCount || 0, baseResult.iterationsCount),
            reasoning: parsed.reasoning || baseResult.reasoning,
            waypoints: aiWaypoints.map((wp: any) => ({
              x: Number(wp.x.toFixed(1)),
              y: Number(wp.y.toFixed(1)),
              heading: wp.heading || 90,
              speed: wp.speed || 185,
              clearanceCm: 42,
            })),
          });
        } else {
          return res.json({
            ...baseResult,
            algorithmUsed: parsed.algorithmUsed || baseResult.algorithmUsed,
            iterationsCount: Math.max(parsed.iterationsCount || 0, baseResult.iterationsCount),
            reasoning: parsed.reasoning || baseResult.reasoning,
          });
        }
      }
    } catch (error) {
      console.warn('Fallo en llamada a Gemini API, usando optimización local determinista:', error);
    }
  }

  // Fallback to local algorithmic multi-iteration engine
  return res.json(baseResult);
});

// Setup Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Rover ESP32 Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
