
import { GoogleGenAI, Modality } from "@google/genai";
import { DailyRecord } from "./types.ts";
import { formatTime } from "./utils.ts";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const getAIInstance = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const getQuickInsight = async (records: DailyRecord[], balance: number): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "Sistema Operacional.";
    try {
        const status = balance >= 0 ? "positivo" : "negativo";
        const prompt = `Informe o colaborador sobre o saldo: ${formatTime(balance)}. Seja neutro e use apenas uma frase curta: "Seu saldo está ${status} em ${formatTime(balance)}."`;
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text || `Saldo ${status}: ${formatTime(balance)}`;
    } catch {
        return `Saldo: ${formatTime(balance)}`;
    }
};

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "ERRO_CHAVE_AUSENTE";
    try {
        const history = records.slice(-5).map(r => `${r.date}: ${formatTime(r.totalMinutes)}`);
        const prompt = `Auditor RH Nobel. Saldo: ${formatTime(balance)}. Histórico: ${history.join(', ')}. Pergunta: ${query}. Responda de forma técnica e curta.`;
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text || "Consulta processada.";
    } catch {
        return "Serviço indisponível.";
    }
};

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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
