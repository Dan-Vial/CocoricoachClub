import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface TestReminder {
  id: string;
  category_id: string;
  test_type: string;
  frequency_weeks: number;
  last_notification_date: string | null;
}

// Validate cron secret for scheduled calls
const validateCronSecret = (req: Request): boolean => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.warn("CRON_SECRET not configured - rejecting request");
    return false;
  }
  
  const providedSecret = req.headers.get("x-cron-secret");
  if (!providedSecret || providedSecret !== cronSecret) {
    console.warn("Invalid or missing cron secret");
    return false;
  }
  
  return true;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret
  if (!validateCronSecret(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Checking all reminders...');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const allNotifications: any[] = [];

    // ==========================================
    // 1. CHECK TEST REMINDERS
    // ==========================================
    const { data: reminders, error: remindersError } = await supabase
      .from('test_reminders')
      .select('*')
      .eq('is_active', true);

    if (remindersError) {
      console.error('Error fetching test reminders:', remindersError);
    } else {
      console.log(`Found ${reminders?.length || 0} active test reminders`);

      for (const reminder of reminders || []) {
        if (reminder.last_notification_date) {
          const lastNotif = new Date(reminder.last_notification_date);
          const daysSinceLastNotif = Math.floor((today.getTime() - lastNotif.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastNotif < 7) continue;
        }

        let lastTestDate: Date | null = null;
        
        if (reminder.test_type === 'VMA') {
          const { data: speedTests } = await supabase
            .from('speed_tests')
            .select('test_date')
            .eq('category_id', reminder.category_id)
            .eq('test_type', '1600m')
            .order('test_date', { ascending: false })
            .limit(1);
          
          if (speedTests && speedTests.length > 0) {
            lastTestDate = new Date(speedTests[0].test_date);
          }
        } else if (reminder.test_type === 'Force') {
          const { data: strengthTests } = await supabase
            .from('strength_tests')
            .select('test_date')
            .eq('category_id', reminder.category_id)
            .order('test_date', { ascending: false })
            .limit(1);
          
          if (strengthTests && strengthTests.length > 0) {
            lastTestDate = new Date(strengthTests[0].test_date);
          }
        } else if (reminder.test_type === 'Sprint') {
          const { data: speedTests } = await supabase
            .from('speed_tests')
            .select('test_date')
            .eq('category_id', reminder.category_id)
            .eq('test_type', '40m')
            .order('test_date', { ascending: false })
            .limit(1);
          
          if (speedTests && speedTests.length > 0) {
            lastTestDate = new Date(speedTests[0].test_date);
          }
        }

        const weeksSinceLastTest = lastTestDate 
          ? Math.floor((today.getTime() - lastTestDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
          : 999;

        if (!lastTestDate || weeksSinceLastTest >= reminder.frequency_weeks) {
          await createTestNotification(supabase, reminder, lastTestDate ? `Dernier test: il y a ${weeksSinceLastTest} semaines` : 'Aucun test effectué');
        }
      }
    }

    // ==========================================
    // 2. CHECK MEDICAL RECORDS REMINDERS
    // ==========================================
    const { data: medicalRecords, error: medicalError } = await supabase
      .from('medical_records')
      .select(`
        *,
        players:player_id (name, category_id)
      `)
      .eq('reminder_enabled', true)
      .not('next_due_date', 'is', null);

    if (medicalError) {
      console.error('Error fetching medical records:', medicalError);
    } else {
      console.log(`Found ${medicalRecords?.length || 0} medical records with reminders`);

      for (const record of medicalRecords || []) {
        if (!record.next_due_date || !record.reminder_days_before) continue;
        
        const dueDate = new Date(record.next_due_date);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - record.reminder_days_before);
        
        const reminderDateStr = reminderDate.toISOString().split('T')[0];
        
        if (reminderDateStr === todayStr && record.last_reminder_sent !== todayStr) {
          const { data: members } = await supabase
            .from('category_members')
            .select('user_id')
            .eq('category_id', record.players?.category_id);

          for (const member of members || []) {
            allNotifications.push({
              user_id: member.user_id,
              category_id: record.players?.category_id,
              title: `💊 Rappel médical - ${record.players?.name}`,
              message: `${record.name} expire le ${new Date(record.next_due_date).toLocaleDateString('fr-FR')}`,
              notification_type: 'medical_reminder',
              notification_subtype: 'expiring_record',
              priority: 'high',
              metadata: { record_id: record.id, player_id: record.player_id }
            });
          }

          await supabase
            .from('medical_records')
            .update({ last_reminder_sent: todayStr })
            .eq('id', record.id);
        }
      }
    }

    // ==========================================
    // 3. CHECK PLAYER BIRTHDAYS
    // ==========================================
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, birth_date, category_id')
      .not('birth_date', 'is', null);

    if (playersError) {
      console.error('Error fetching players:', playersError);
    } else {
      console.log(`Found ${players?.length || 0} players with birth dates`);

      for (const player of players || []) {
        if (!player.birth_date) continue;
        
        const birthDate = new Date(player.birth_date);
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();

        if (birthMonth === todayMonth && birthDay === todayDay) {
          const age = today.getFullYear() - birthDate.getFullYear();

          const { data: members } = await supabase
            .from('category_members')
            .select('user_id')
            .eq('category_id', player.category_id);

          for (const member of members || []) {
            allNotifications.push({
              user_id: member.user_id,
              category_id: player.category_id,
              title: `🎂 Anniversaire - ${player.name}`,
              message: `${player.name} fête ses ${age} ans aujourd'hui !`,
              notification_type: 'birthday',
              priority: 'low',
              metadata: { player_id: player.id, age }
            });
          }
        }
      }
    }

    // ==========================================
    // 4. CHECK RTP PROTOCOL PROGRESS
    // ==========================================
    const { data: protocols, error: protocolsError } = await supabase
      .from('return_to_play_protocols')
      .select(`
        *,
        players:player_id (name)
      `)
      .eq('status', 'in_progress');

    if (protocolsError) {
      console.error('Error fetching protocols:', protocolsError);
    } else {
      console.log(`Found ${protocols?.length || 0} active RTP protocols`);

      for (const protocol of protocols || []) {
        const { data: currentPhase } = await supabase
          .from('rtp_phase_completions')
          .select('*')
          .eq('protocol_id', protocol.id)
          .eq('phase_number', protocol.current_phase)
          .eq('status', 'in_progress')
          .single();

        if (currentPhase?.started_at) {
          const startedDate = new Date(currentPhase.started_at);
          const daysSinceStart = Math.floor((today.getTime() - startedDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceStart >= 2 && daysSinceStart % 2 === 0) {
            const { data: members } = await supabase
              .from('category_members')
              .select('user_id')
              .eq('category_id', protocol.category_id);

            for (const member of members || []) {
              allNotifications.push({
                user_id: member.user_id,
                category_id: protocol.category_id,
                title: `📝 Protocole RTP - ${protocol.players?.name}`,
                message: `Phase ${protocol.current_phase} en cours depuis ${daysSinceStart} jours. Vérifier la progression.`,
                notification_type: 'protocol_reminder',
                priority: 'medium',
                metadata: { protocol_id: protocol.id, player_id: protocol.player_id }
              });
            }
          }
        }
      }
    }

    // ==========================================
    // INSERT ALL NOTIFICATIONS (avoid duplicates)
    // ==========================================
    if (allNotifications.length > 0) {
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('title, message, user_id')
        .gte('created_at', `${todayStr}T00:00:00`);

      const existingSet = new Set(
        (existingNotifications || []).map(n => `${n.user_id}-${n.title}-${n.message}`)
      );

      const newNotifications = allNotifications.filter(
        n => !existingSet.has(`${n.user_id}-${n.title}-${n.message}`)
      );

      if (newNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(newNotifications);

        if (insertError) {
          console.error('Error inserting notifications:', insertError);
        } else {
          console.log(`Inserted ${newNotifications.length} new notifications`);
        }
      }
    }

    console.log(`Total notifications prepared: ${allNotifications.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_checked: reminders?.length || 0,
        notifications_created: allNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-test-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createTestNotification(
  supabase: any, 
  reminder: TestReminder, 
  details: string
) {
  const { data: category } = await supabase
    .from('categories')
    .select('club_id, clubs(user_id)')
    .eq('id', reminder.category_id)
    .single();

  if (!category || !category.clubs) {
    console.error('Could not find club owner for category:', reminder.category_id);
    return;
  }

  const userId = category.clubs.user_id;

  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      category_id: reminder.category_id,
      notification_type: 'test_reminder',
      title: `🏃 Rappel: Test ${reminder.test_type} à effectuer`,
      message: `Il est temps de réaliser les tests ${reminder.test_type} (fréquence: ${reminder.frequency_weeks} semaines). ${details}`,
    });

  if (notifError) {
    console.error('Error creating notification:', notifError);
    return;
  }

  await supabase
    .from('test_reminders')
    .update({ last_notification_date: new Date().toISOString().split('T')[0] })
    .eq('id', reminder.id);

  console.log(`Created notification for test ${reminder.test_type} in category ${reminder.category_id}`);
}
