const express = require("express"), path = require("path"), fs = require("fs"), os = require("os"), crypto = require("crypto");
const OpenAI = require("openai");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

require("dotenv").config();
const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

const ai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ---------- FASE 1: generar guion / plan de escenas ----------
app.post("/api/generate", async (req, res) => {
  try {
    const { idea, language = "Español", duration = 60, style = "Cinemático", format = "16:9", voice = "Narrador" } = req.body;
    if (!idea) return res.status(400).json({ error: "Escribe una idea o guion." });
    if (!ai) {
      return res.json({
        demo: true, title: "Video generado en modo demostración", language, duration, format, style, voice,
        scenes: [
          { n: 1, seconds: 12, narration: "Esta es una demostración del Generador de Video IA.", visual: "Escena cinematográfica relacionada con el tema.", text: "INTRODUCCIÓN" },
          { n: 2, seconds: 24, narration: "Aquí aparecería la narración creada por la inteligencia artificial.", visual: "Plano dinámico con movimiento de cámara.", text: "DESARROLLO" },
          { n: 3, seconds: 24, narration: "La versión conectada a una API producirá los recursos visuales y la voz.", visual: "Escena final inspiradora.", text: "CONCLUSIÓN" }
        ],
        message: "V1 funcionando en modo demostración. Añade OPENAI_API_KEY para generación real."
      });
    }
    const p = `Eres director y guionista profesional de videos IA. Crea un plan de producción para esta idea: ${idea}
Idioma: ${language}. Duración: ${duration}s. Estilo: ${style}. Formato: ${format}. Voz: ${voice}.
Devuelve SOLO JSON válido con title y scenes. Cada scene: n, seconds, narration, visual, text.`;
    const r = await ai.responses.create({ model: "gpt-4o-mini", input: p });
    let data;
    try { data = JSON.parse(r.output_text); }
    catch { data = { title: idea, scenes: [{ n: 1, seconds: duration, narration: r.output_text, visual: "Visual relacionado con el guion.", text: "" }] }; }
    res.json({ demo: false, language, duration, format, style, voice, ...data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- FASE 2: generar video real (imágenes + voz + ensamblado) ----------
const SIZE_MAP = { "16:9": "1792x1024", "9:16": "1024x1792", "1:1": "1024x1024" };
const OUT_SIZE_MAP = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "1080:1080" };
const VOICE_MAP = { "Narrador": "alloy", "Voz femenina": "nova", "Voz masculina": "onyx" };
const CHARACTER_VOICES = ["alloy", "nova", "onyx", "fable"];

app.post("/api/render", async (req, res) => {
  if (!ai) return res.status(400).json({ error: "Se requiere OPENAI_API_KEY configurada en el servidor para generar video real." });
  const { project } = req.body;
  if (!project || !Array.isArray(project.scenes) || !project.scenes.length) {
    return res.status(400).json({ error: "Falta el proyecto con escenas para renderizar." });
  }

  const jobId = crypto.randomUUID();
  const dir = path.join(os.tmpdir(), "render-" + jobId);
  fs.mkdirSync(dir, { recursive: true });

  try {
    const imgSize = SIZE_MAP[project.format] || "1024x1024";
    const outScale = OUT_SIZE_MAP[project.format] || "1080:1080";
    const clipPaths = [];

    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];

      // 1. Imagen de la escena (DALL·E 3)
      const imgResp = await ai.images.generate({
        model: "dall-e-3",
        prompt: `${scene.visual}. Estilo: ${project.style || "cinemático"}. Sin texto, sin marcas de agua, alta calidad, fotograma de video.`,
        size: imgSize,
        response_format: "b64_json"
      });
      const imgPath = path.join(dir, `scene${i}.png`);
      fs.writeFileSync(imgPath, Buffer.from(imgResp.data[0].b64_json, "base64"));

      // 2. Narración en voz (TTS)
      const voiceName = project.voice === "Personajes" ? CHARACTER_VOICES[i % CHARACTER_VOICES.length] : (VOICE_MAP[project.voice] || "alloy");
      const speech = await ai.audio.speech.create({ model: "tts-1", voice: voiceName, input: scene.narration || " " });
      const audioPath = path.join(dir, `scene${i}.mp3`);
      fs.writeFileSync(audioPath, Buffer.from(await speech.arrayBuffer()));

      // 3. Clip de video: imagen fija + audio
      const clipPath = path.join(dir, `clip${i}.mp4`);
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(imgPath).inputOptions([`-loop 1`])
          .input(audioPath)
          .outputOptions([
            "-c:v libx264", "-tune stillimage", "-c:a aac", "-b:a 192k",
            "-pix_fmt yuv420p", "-shortest", `-vf scale=${outScale}`
          ])
          .save(clipPath).on("end", resolve).on("error", reject);
      });
      clipPaths.push(clipPath);
    }

    // 4. Concatenar todas las escenas en un solo video
    const listPath = path.join(dir, "list.txt");
    fs.writeFileSync(listPath, clipPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const finalPath = path.join(dir, "final.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg().input(listPath).inputOptions(["-f concat", "-safe 0"]).outputOptions(["-c copy"])
        .save(finalPath).on("end", resolve).on("error", reject);
    });

    res.download(finalPath, "video-ia.mp4", () => {
      fs.rm(dir, { recursive: true, force: true }, () => {});
    });
  } catch (e) {
    console.error(e);
    fs.rm(dir, { recursive: true, force: true }, () => {});
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(process.env.PORT || 3000, () => console.log("V2 lista (guion + imagen + voz + video)"));
