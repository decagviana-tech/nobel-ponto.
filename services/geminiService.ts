
import { GoogleGenAI, Modality } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const getAIInstance = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const getQuickInsight = async (records: DailyRecord[], balance: number): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "Sistema Nobel Operacional.";

    try {
        const recent = records.slice(-3).map(r => ({ d: r.date, t: formatTime(r.totalMinutes) }));
        const prompt = `Analise brevemente: Saldo ${formatTime(balance)}, Últimos: ${JSON.stringify(recent)}. Dê um micro-insight motivador de 10 palavras para o colaborador Nobel Petrópolis.`;

        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt
        });
        return response.text?.trim() || "Mantenha o foco e a pontualidade!";
    } catch {
        return "Sua produtividade é nossa prioridade!";
    }
};

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "ERRO_CHAVE_AUSENTE";

    try {
        const history = records.slice(-10).map(r => ({
            data: r.date,
            total: formatTime(r.totalMinutes),
            saldo: formatTime(r.balanceMinutes),
            status: (r.entry && !r.exit) ? "Pendente" : "OK"
        }));

        const prompt = `Você é o "Nobel Auditor", assistente de RH da Nobel Petrópolis.
        Contexto: Saldo ${formatTime(balance)}, Histórico: ${JSON.stringify(history)}.
        Pergunta: "${query}". Responda de forma curta e profissional.`;

        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt
        });
        
        return response.text || "Não consegui processar sua dúvida agora.";
    } catch (error: any) {
        if (error?.message?.includes("429")) return "ERRO_LIMITE_ATINGIDO";
        return "Conexão instável. Tente perguntar novamente.";
    }
};

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
}

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    const ai = getAIInstance();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: text.replace(/[*#]/g, '') }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return data ? decode(data) : null;
    } catch { return null; }
};

export async function playAudioBuffer(data: Uint8Array) {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(data, ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    } catch (e) { console.error("Erro áudio:", e); }
}
