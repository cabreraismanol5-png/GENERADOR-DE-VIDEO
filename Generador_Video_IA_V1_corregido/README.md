# Generador de Video IA — V1

## Cómo ejecutarlo

1. Instalar dependencias:
   ```
   npm install
   ```

2. Configurar tu clave de OpenAI en `.env`:
   ```
   OPENAI_API_KEY=sk-tu-clave-aqui
   ```
   Si dejas `OPENAI_API_KEY` vacío, la app funciona en **modo demo** (genera un guion de ejemplo, sin llamar a la API).

3. Iniciar el servidor:
   ```
   npm start
   ```

4. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

## Notas
- El modelo usado por defecto es `gpt-4o-mini`. Puedes cambiarlo en `server.js` (línea con `ai.responses.create`) por otro modelo de tu cuenta de OpenAI.
- Esta versión (V1) solo genera el **plan de escenas** (guion + descripción visual). La generación real de imágenes, video y voz se conecta en una fase posterior.
