# Generador de Video IA — V2

## Qué hace ahora
- **Fase 1 (guion):** genera el plan de escenas (narración + descripción visual) a partir de tu idea.
- **Fase 2 (video real):** por cada escena genera una **imagen con DALL·E 3**, una **narración en voz con TTS de OpenAI**, y las une en un **video final .mp4** usando `ffmpeg` (imagen fija + audio por escena, luego concatenadas).

## Cómo ejecutarlo

1. Instalar dependencias:
   ```
   npm install
   ```

2. Configurar tu clave de OpenAI en `.env`:
   ```
   OPENAI_API_KEY=sk-tu-clave-aqui
   ```
   Sin esta clave, la app funciona en **modo demo** solo para el guion (Fase 1). El botón "Generar Video Real" **requiere** la clave.

3. Iniciar el servidor:
   ```
   npm start
   ```

4. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

## Notas y límites importantes
- El renderizado de video es **síncrono**: la petición espera a que se generen todas las imágenes, audios y el video final antes de responder. Para videos de muchas escenas puede tardar varios minutos.
- En plataformas como Render, si el proxy tiene un timeout corto, una petición muy larga puede cortarse antes de terminar. Si esto pasa, reduce el número de escenas/duración, o mueve el renderizado a un trabajo en segundo plano con cola (fase futura).
- Cada render consume créditos reales de tu cuenta de OpenAI (imágenes DALL·E 3 + audio TTS).
- El modelo de guion es `gpt-4o-mini`, imágenes `dall-e-3`, voz `tts-1`. Puedes cambiarlos en `server.js`.
