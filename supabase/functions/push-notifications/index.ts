import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isSuperAdmin, error: roleError } = await authClient.rpc('is_super_admin', {
      _user_id: user.id,
    });

    if (roleError || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const notifications: Array<{
      user_id: string;
      category_id: string;
      title: string;
      message: string;
      notification_type: string;
      notification_subtype: string;
      priority: string;
    }> = [];

    // Get all category members to notify
    const { data: categoryMembers, error: membersError } = await supabase
      .from('category_members')
      .select('user_id, category_id');

    if (membersError) {
      console.error('Error fetching category members:', membersError);
      throw membersError;
    }

    // 1. Birthday notifications
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    const { data: birthdayPlayers, error: birthdayError } = await supabase
      .from('players')
      .select('id, name, category_id, birth_date')
      .not('birth_date', 'is', null);

    if (!birthdayError && birthdayPlayers) {
      for (const player of birthdayPlayers) {
        const birthDate = new Date(player.birth_date);
        if (birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay) {
          const age = today.getFullYear() - birthDate.getFullYear();
          const members = categoryMembers?.filter(m => m.category_id === player.category_id) || [];
          
          for (const member of members) {
            notifications.push({
              user_id: member.user_id,
              category_id: player.category_id,
              title: `🎂 Anniversaire de ${player.name}`,
              message: `${player.name} fête ses ${age} ans aujourd'hui !`,
              notification_type: 'birthday',
              notification_subtype: 'player_birthday',
              priority: 'normal',
            });
          }
          console.log(`Birthday notification created for ${player.name}`);
        }
      }
    }

    // 2. Injury return notifications (players returning soon)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const { data: returningPlayers, error: injuryError } = await supabase
      .from('injuries')
      .select(`
        id,
        player_id,
        estimated_return_date,
        injury_type,
        category_id,
        players(name)
      `)
      .eq('status', 'recovering')
      .not('estimated_return_date', 'is', null)
      .gte('estimated_return_date', today.toISOString().split('T')[0])
      .lte('estimated_return_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (!injuryError && returningPlayers) {
      for (const injury of returningPlayers) {
        const returnDate = new Date(injury.estimated_return_date);
        const daysUntilReturn = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const playerName = (injury.players as any)?.name || 'Joueur';
        
        const members = categoryMembers?.filter(m => m.category_id === injury.category_id) || [];
        
        for (const member of members) {
          notifications.push({
            user_id: member.user_id,
            category_id: injury.category_id,
            title: `🏥 Retour imminent de ${playerName}`,
            message: `${playerName} devrait être de retour dans ${daysUntilReturn} jour(s) après sa blessure (${injury.injury_type})`,
            notification_type: 'injury',
            notification_subtype: 'return_imminent',
            priority: 'high',
          });
        }
        console.log(`Return notification created for ${playerName}`);
      }
    }

    // 3. Test reminders (tests not done in 30+ days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Check for players without recent speed tests
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, category_id');

    if (!playersError && players) {
      const { data: recentTests } = await supabase
        .from('speed_tests')
        .select('player_id')
        .gte('test_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const testedPlayerIds = new Set(recentTests?.map(t => t.player_id) || []);
      
      for (const player of players) {
        if (!testedPlayerIds.has(player.id)) {
          const members = categoryMembers?.filter(m => m.category_id === player.category_id) || [];
          
          for (const member of members) {
            // Check if notification already exists for this player today
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', member.user_id)
              .eq('notification_type', 'test_reminder')
              .eq('notification_subtype', 'speed_test')
              .gte('created_at', today.toISOString().split('T')[0])
              .limit(1);

            if (!existing?.length) {
              notifications.push({
                user_id: member.user_id,
                category_id: player.category_id,
                title: `📊 Rappel de test - ${player.name}`,
                message: `${player.name} n'a pas effectué de test de vitesse depuis plus de 30 jours`,
                notification_type: 'test_reminder',
                notification_subtype: 'speed_test',
                priority: 'low',
              });
            }
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }
      console.log(`Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsCreated: notifications.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in push-notifications function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
