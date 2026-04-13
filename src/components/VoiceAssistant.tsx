import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AudioRecorder, encodeAudioForAPI, playAudioData } from "@/utils/VoiceAssistant";
import { supabase } from "@/integrations/supabase/client";

interface VoiceAssistantProps {
  categoryId: string;
}

const VoiceAssistant = ({ categoryId }: VoiceAssistantProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<string>("Prêt");
  const [lastSaved, setLastSaved] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      setStatus("Demande d'accès au micro...");

      // IMPORTANT: Request microphone FIRST (required for iOS)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        // Store stream for later use
        recorderRef.current = new AudioRecorder((audioData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64Audio = encodeAudioForAPI(audioData);
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            }));
          }
        });

        // Initialize with the stream
        await recorderRef.current.start();
        console.log("[Microphone] Access granted and started");

      } catch (micError) {
        console.error("[Microphone Error]", micError);
        toast({
          title: "Accès au micro refusé",
          description: "Veuillez autoriser le microphone dans les réglages de votre navigateur/téléphone",
          variant: "destructive",
        });
        return;
      }

      setStatus("Connexion...");

      // Get auth session for secure connection
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        return;
      }

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Connect to WebSocket with auth token in URL
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const wsUrl = `wss://${projectId}.functions.supabase.co/functions/v1/voice-assistant?categoryId=${categoryId}&token=${session.access_token}`;

      console.log("[Voice Assistant] Connecting to WebSocket...");
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("[Voice Assistant] Connected");
        setIsConnected(true);
        setStatus("Connecté - Parlez maintenant");
        toast({
          title: "Assistant vocal activé",
          description: "Dictez les données : nom, RPE, durée",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log(`[Message] ${data.type}`, data);

        switch (data.type) {
          case 'session.created':
            console.log("[Voice Assistant] Session started");
            break;

          case 'session.updated':
            console.log("[Voice Assistant] Session configured");
            setStatus("Prêt à écouter");
            // Microphone already started before WebSocket connection
            break;

          case 'input_audio_buffer.speech_started':
            setIsListening(true);
            setStatus("🎤 Écoute...");
            break;

          case 'input_audio_buffer.speech_stopped':
            setIsListening(false);
            setStatus("Traitement...");
            break;

          case 'response.audio.delta':
            if (audioContextRef.current && data.delta) {
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await playAudioData(audioContextRef.current, bytes);
            }
            break;

          case 'response.audio_transcript.delta':
            setTranscript(prev => prev + data.delta);
            break;

          case 'response.audio_transcript.done':
            console.log("[Transcript]", data.transcript);
            break;

          case 'response.function_call_arguments.done':
            setStatus("Enregistrement...");
            const args = JSON.parse(data.arguments);
            setLastSaved(`${args.playerName}: RPE ${args.rpe}, ${args.durationMinutes} min`);
            break;

          case 'response.done':
            setStatus("Prêt");
            setTranscript("");
            if (lastSaved) {
              toast({
                title: "✅ Données enregistrées",
                description: lastSaved,
              });
              setTimeout(() => setLastSaved(""), 3000);
            }
            break;

          case 'error':
            console.error("[Error]", data);
            setStatus("Erreur");
            toast({
              title: "Erreur",
              description: data.message || "Une erreur s'est produite",
              variant: "destructive",
            });
            break;
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("[WebSocket Error]", error);
        setStatus("Erreur de connexion");
        toast({
          title: "Erreur de connexion",
          description: "Impossible de se connecter à l'assistant vocal",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log("[Voice Assistant] Disconnected");
        setIsConnected(false);
        setIsListening(false);
        setStatus("Déconnecté");
      };

    } catch (error) {
      console.error("[Connection Error]", error);
      setStatus("Erreur");
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    }
  };


  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setStatus("Déconnecté");
    setTranscript("");
  };

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:bottom-20 sm:left-auto sm:translate-x-0 sm:right-4 z-[100] p-3 sm:p-4 w-[min(92vw,22rem)] max-w-md shadow-2xl border-2">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base">🎙️ Assistant Vocal</h3>
          {lastSaved && (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          )}
        </div>

        <div className="min-h-[40px] text-sm text-muted-foreground">
          <p className="font-medium">{status}</p>
          {transcript && (
            <p className="text-xs mt-1 italic">"{transcript}"</p>
          )}
          {lastSaved && (
            <p className="text-xs text-green-600 mt-1">✓ {lastSaved}</p>
          )}
        </div>

        {!isConnected ? (
          <Button
            onClick={connect}
            className="w-full"
            size="lg"
          >
            <Mic className="w-4 h-4 mr-2" />
            Activer l'assistant
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isListening ? (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 rounded-lg animate-pulse">
                  <Mic className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    En écoute...
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Connecté
                  </span>
                </div>
              )}
              <Button
                onClick={disconnect}
                variant="outline"
                size="sm"
              >
                <MicOff className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-secondary/50 rounded p-2">
              💡 Exemples: "Martin, RPE 7, 90 minutes" ou "Dupont, intensité 5, une heure"
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceAssistant;
