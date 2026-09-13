const express=require("express"),path=require("path"),OpenAI=require("openai");
require("dotenv").config(); const app=express();
app.use(express.json({limit:"4mb"})); app.use(express.static(path.join(__dirname,"public")));
const ai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
 
app.post("/api/generate",async(req,res)=>{
 try{
  const {idea,language="Español",duration=60,style="Cinemático",format="16:9",voice="Narrador"}=req.body;
  if(!idea) return res.status(400).json({error:"Escribe una idea o guion."});
  if(!ai){
   return res.json({demo:true,title:"Video generado en modo demostración",language,duration,format,
    scenes:[{n:1,seconds:12,narration:"Esta es una demostración del Generador de Video IA.",visual:"Escena cinematográfica relacionada con el tema.",text:"INTRODUCCIÓN"},
    {n:2,seconds:24,narration:"Aquí aparecería la narración creada por la inteligencia artificial.",visual:"Plano dinámico con movimiento de cámara.",text:"DESARROLLO"},
    {n:3,seconds:24,narration:"La versión conectada a una API producirá los recursos visuales y la voz.",visual:"Escena final inspiradora.",text:"CONCLUSIÓN"}],
    message:"V1 funcionando en modo demostración. Añade OPENAI_API_KEY para generación real."});
  }
  const p=`Eres director y guionista profesional de videos IA. Crea un plan de producción para esta idea: ${idea}
Idioma: ${language}. Duración: ${duration}s. Estilo: ${style}. Formato: ${format}. Voz: ${voice}.
Devuelve SOLO JSON válido con title y scenes. Cada scene: n, seconds, narration, visual, text.`;
  const r=await ai.responses.create({model:"gpt-4o-mini",input:p});
  let data; try{data=JSON.parse(r.output_text)}catch{data={title:idea,scenes:[{n:1,seconds:duration,narration:r.output_text,visual:"Visual relacionado con el guion.",text:""}]}};
  res.json({demo:false,language,duration,format,...data});
 }catch(e){res.status(500).json({error:e.message})}
});
 
app.use((req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
 
app.listen(process.env.PORT||3000,()=>console.log("V1 lista"));
 
