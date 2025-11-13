import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const validateRPE = (rpe: number): number => {
  if (typeof rpe !== 'number' || isNaN(rpe)) {
    throw new Error('RPE must be a number');
  }
  if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
    throw new Error('RPE must be an integer between 1 and 10');
  }
  return rpe;
};

const validateDuration = (duration: number): number => {
  if (typeof duration !== 'number' || isNaN(duration)) {
    throw new Error('Duration must be a number');
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
    throw new Error('Duration must be an integer between 1 and 480 minutes (8 hours)');
  }
  return duration;
};

const validatePlayerName = (name: string): string => {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Player name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw new Error('Player name must be less than 100 characters');
  }
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) {
    throw new Error('Player name can only contain letters, spaces, hyphens, and apostrophes');
  }
  return trimmed;
};

const validateSessionDate = (date: string | undefined): string => {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Session date must be in YYYY-MM-DD format');
  }
  return date;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return new Response("OPENAI_API_KEY not configured", { status: 500 });
  }

  // Get auth token from headers
  const authHeader = headers.get('authorization');
  if (!authHeader) {
    return new Response("Unauthorized: No authorization header", { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Get category ID from URL params
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId');
  
  if (!categoryId) {
    return new Response("categoryId is required", { status: 400 });
  }

  // Create Supabase client with user's JWT to check permissions
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  // Verify user has access to this category
  const { data: category, error: categoryError } = await authClient
    .from('categories')
    .select('id, club_id')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    console.error('[Auth] Category access denied:', categoryError);
    return new Response("Unauthorized: You don't have access to this category", { status: 403 });
  }

  // Verify user has access to the club
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return new Response("Unauthorized: Invalid token", { status: 401 });
  }

  const { data: clubAccess, error: clubError } = await authClient
    .from('clubs')
    .select('id')
    .eq('id', category.club_id)
    .or(`user_id.eq.${user.id},id.in.(select club_id from club_members where user_id='${user.id}')`)
    .single();

  if (clubError || !clubAccess) {
    console.error('[Auth] Club access denied:', clubError);
    return new Response("Unauthorized: You don't have access to this club", { status: 403 });
  }

  console.log(`[Voice Assistant] Session authorized for category: ${categoryId}, user: ${user.id}`);

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Connect to OpenAI Realtime API
  const openAISocket = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
    [
      "realtime",
      `openai-insecure-api-key.${OPENAI_API_KEY}`
    ]
  );

  let sessionStarted = false;
  let openAIReady = false;
  const messageQueue: string[] = [];
  let currentFunctionCall: any = {};

  openAISocket.onopen = () => {
    console.log("[Voice Assistant] Connected to OpenAI");
    openAIReady = true;
    
    // Send queued messages
    while (messageQueue.length > 0 && openAISocket.readyState === WebSocket.OPEN) {
      const msg = messageQueue.shift();
      if (msg) {
        console.log("[Queue] Sending queued message");
        openAISocket.send(msg);
      }
    }
  };

  openAISocket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log(`[OpenAI Event] ${data.type}`);

    if (data.type === 'error') {
      console.error('[OpenAI Error payload]', data);
      socket.send(JSON.stringify({ type: 'error', message: data.error?.message || 'OpenAI error' }));
      try { openAISocket.close(); } catch {}
      return;
    }

    // Configure session after receiving session.created
    if (data.type === 'session.created' && !sessionStarted) {
      sessionStarted = true;
      console.log("[Voice Assistant] Configuring session...");
      
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `Tu es un assistant vocal pour entraîneurs de rugby. Tu aides à enregistrer les données AWCR (Acute: Chronic Workload Ratio) des joueurs.

AWCR = RPE × Durée (en minutes)

Ton rôle:
- Écouter l'entraîneur dicter les données: nom du joueur, RPE (1-10), durée en minutes
- Confirmer les informations reçues
- Appeler la fonction save_awcr_data pour enregistrer dans la base

Exemples de dictées:
- "Martin, RPE 7, 90 minutes"
- "Dupont, RPE 5, durée 60"
- "Thomas, intensité 8, une heure et demie"

Sois concis et efficace. Confirme toujours les données avant d'enregistrer.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          tools: [
            {
              type: 'function',
              name: 'save_awcr_data',
              description: 'Enregistre les données AWCR d\'un joueur dans la base de données',
              parameters: {
                type: 'object',
                properties: {
                  playerName: {
                    type: 'string',
                    description: 'Nom complet du joueur'
                  },
                  rpe: {
                    type: 'number',
                    description: 'Rating of Perceived Exertion (1-10)'
                  },
                  durationMinutes: {
                    type: 'number',
                    description: 'Durée de l\'entraînement en minutes'
                  },
                  sessionDate: {
                    type: 'string',
                    description: 'Date de la session (YYYY-MM-DD), par défaut aujourd\'hui'
                  }
                },
                required: ['playerName', 'rpe', 'durationMinutes']
              }
            }
          ],
          tool_choice: 'auto',
          temperature: 0.8,
          max_response_output_tokens: 'inf'
        }
      };

      openAISocket.send(JSON.stringify(sessionConfig));
    }

    // Handle function call completion
    if (data.type === 'response.function_call_arguments.done') {
      console.log("[Function Call] Arguments received:", data.arguments);
      currentFunctionCall = {
        call_id: data.call_id,
        name: data.name || 'save_awcr_data',
        arguments: JSON.parse(data.arguments)
      };

      // Execute the function
      try {
        // Validate all inputs before processing
        const rawArgs = currentFunctionCall.arguments;
        
        const validatedData = {
          playerName: validatePlayerName(rawArgs.playerName),
          rpe: validateRPE(rawArgs.rpe),
          durationMinutes: validateDuration(rawArgs.durationMinutes),
          sessionDate: validateSessionDate(rawArgs.sessionDate)
        };

        const { playerName, rpe, durationMinutes, sessionDate } = validatedData;
        
        console.log('[Validation] All inputs validated successfully');

        // Use authenticated client instead of service role for data operations
        const supabase = authClient;
        
        // Find or create player
        const { data: players, error: playerError } = await supabase
          .from('players')
          .select('id')
          .eq('category_id', categoryId)
          .ilike('name', `%${playerName}%`)
          .limit(1);

        let playerId;
        
        if (players && players.length > 0) {
          playerId = players[0].id;
          console.log(`[DB] Player found: ${playerId}`);
        } else {
          // Create new player
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert({
              name: playerName,
              category_id: categoryId
            })
            .select()
            .single();

          if (createError) throw createError;
          playerId = newPlayer.id;
          console.log(`[DB] New player created: ${playerId}`);
        }

        // Calculate training load and insert AWCR data
        const trainingLoad = rpe * durationMinutes;

        const { error: awcrError } = await supabase
          .from('awcr_tracking')
          .insert({
            category_id: categoryId,
            player_id: playerId,
            session_date: sessionDate,
            rpe,
            duration_minutes: durationMinutes,
            training_load: trainingLoad
          });

        if (awcrError) throw awcrError;

        console.log(`[DB] AWCR data saved successfully`);

        // Send success response to OpenAI
        const functionOutput = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: data.call_id,
            output: JSON.stringify({
              success: true,
              message: `Données enregistrées: ${playerName}, RPE ${rpe}, ${durationMinutes} min, Charge ${trainingLoad}`
            })
          }
        };

        openAISocket.send(JSON.stringify(functionOutput));
        openAISocket.send(JSON.stringify({ type: 'response.create' }));

      } catch (error) {
        console.error("[Function Call Error]", error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        const functionOutput = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: data.call_id,
            output: JSON.stringify({
              success: false,
              error: errorMessage
            })
          }
        };

        openAISocket.send(JSON.stringify(functionOutput));
        openAISocket.send(JSON.stringify({ type: 'response.create' }));
      }
    }

    // Forward all messages to client
    socket.send(JSON.stringify(data));
  };

  openAISocket.onerror = (error) => {
    console.error("[OpenAI Error]", error);
    socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
  };

  openAISocket.onclose = () => {
    console.log("[Voice Assistant] OpenAI connection closed");
    socket.close();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`[Client Event] ${data.type}`);
      
      // Skip auth messages - already handled
      if (data.type === 'auth') {
        return;
      }
      
      // Queue messages if OpenAI not ready yet
      if (!openAIReady || openAISocket.readyState !== WebSocket.OPEN) {
        console.log("[Queue] Queueing message until OpenAI ready");
        messageQueue.push(event.data);
      } else {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("[Relay Error]", error);
    }
  };

  socket.onclose = () => {
    console.log("[Voice Assistant] Client disconnected");
    openAISocket.close();
  };

  socket.onerror = (error) => {
    console.error("[Client Error]", error);
    openAISocket.close();
  };

  return response;
});
