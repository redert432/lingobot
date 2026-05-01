import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const PCM_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export function useLiveAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: "user" | "model", text: string, isFinal: boolean }[]>([]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Playback state
  const nextPlayTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const stopAudioCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    sourceNodesRef.current.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    sourceNodesRef.current = [];
    nextPlayTimeRef.current = audioContextRef.current?.currentTime || 0;
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    stopAudioCapture();
    stopPlayback();
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopAudioCapture, stopPlayback]);

  const connect = useCallback(async (systemInstruction: string) => {
    if (isConnected || isConnecting) return;
    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyADk3uqEBFcgnDasUxDB0n68sbqT-JGmXk";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

      const ai = new GoogleGenAI({ apiKey });

      const audioCtx = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: PCM_SAMPLE_RATE, 
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = mediaStream;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      // ScriptProcessor is deprecated but widely supported for simple PCM extraction
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          let s = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Quick base64 conversion
        const buffer = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Needed for processing to trigger

      const sessionPromise = ai.live.connect({
        model: "gemini-2.0-flash",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: systemInstruction,
          // Removed transcription fields entirely...
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryStr = atob(base64Audio);
              const buffer = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                buffer[i] = binaryStr.charCodeAt(i);
              }
              const pcm16 = new Int16Array(buffer.buffer);
              const float32 = new Float32Array(pcm16.length);
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / (pcm16[i] >= 0 ? 32767 : 32768);
              }

              const audioBuffer = audioCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
              audioBuffer.getChannelData(0).set(float32);

              const sourceNode = audioCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(audioCtx.destination);
              
              if (nextPlayTimeRef.current < audioCtx.currentTime) {
                 nextPlayTimeRef.current = audioCtx.currentTime;
              }
              sourceNode.start(nextPlayTimeRef.current);
              sourceNodesRef.current.push(sourceNode);
              nextPlayTimeRef.current += audioBuffer.duration;
              
              sourceNode.onended = () => {
                sourceNodesRef.current = sourceNodesRef.current.filter(n => n !== sourceNode);
              };
            }

            if (message.serverContent?.interrupted) {
              stopPlayback();
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError(err instanceof Error ? err.message : String(err));
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Connection failed:", err);
      setError(err instanceof Error ? err.message : String(err));
      disconnect();
    }
  }, [isConnected, isConnecting, disconnect, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    transcript
  };
}
