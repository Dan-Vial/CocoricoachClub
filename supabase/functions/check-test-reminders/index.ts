import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestReminder {
  id: string;
  category_id: string;
  test_type: string;
  frequency_weeks: number;
  last_notification_date: string | null;
}

interface LastTest {
  test_date: string;
  test_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Checking test reminders...');

    // Récupérer tous les rappels actifs
    const { data: reminders, error: remindersError } = await supabase
      .from('test_reminders')
      .select('*')
      .eq('is_active', true);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} active reminders`);

    const today = new Date();
    const notificationsCreated = [];

    for (const reminder of reminders || []) {
      // Vérifier si une notification a déjà été envoyée dans les 7 derniers jours
      if (reminder.last_notification_date) {
        const lastNotif = new Date(reminder.last_notification_date);
        const daysSinceLastNotif = Math.floor((today.getTime() - lastNotif.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastNotif < 7) {
          console.log(`Skipping reminder ${reminder.id} - notification sent ${daysSinceLastNotif} days ago`);
          continue;
        }
      }

      // Récupérer le dernier test du type concerné
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

      // Si aucun test n'a été fait, envoyer une notification
      if (!lastTestDate) {
        await createNotification(supabase, reminder, 'Aucun test effectué');
        notificationsCreated.push({ reminder_id: reminder.id, reason: 'no_test' });
        continue;
      }

      // Calculer le nombre de semaines depuis le dernier test
      const daysSinceLastTest = Math.floor((today.getTime() - lastTestDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceLastTest = Math.floor(daysSinceLastTest / 7);

      console.log(`Test ${reminder.test_type} for category ${reminder.category_id}: ${weeksSinceLastTest} weeks since last test`);

      // Si le délai est dépassé, créer une notification
      if (weeksSinceLastTest >= reminder.frequency_weeks) {
        await createNotification(supabase, reminder, `Dernier test: il y a ${weeksSinceLastTest} semaines`);
        notificationsCreated.push({ 
          reminder_id: reminder.id, 
          reason: 'overdue',
          weeks_overdue: weeksSinceLastTest 
        });
      }
    }

    console.log(`Created ${notificationsCreated.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_checked: reminders?.length || 0,
        notifications_created: notificationsCreated.length,
        details: notificationsCreated
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

async function createNotification(
  supabase: any, 
  reminder: TestReminder, 
  details: string
) {
  // Récupérer l'owner du club
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

  // Créer la notification
  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      category_id: reminder.category_id,
      notification_type: 'test_reminder',
      title: `Rappel: Test ${reminder.test_type} à effectuer`,
      message: `Il est temps de réaliser les tests ${reminder.test_type} (fréquence: ${reminder.frequency_weeks} semaines). ${details}`,
    });

  if (notifError) {
    console.error('Error creating notification:', notifError);
    return;
  }

  // Mettre à jour la date de dernière notification
  await supabase
    .from('test_reminders')
    .update({ last_notification_date: new Date().toISOString().split('T')[0] })
    .eq('id', reminder.id);

  console.log(`Created notification for test ${reminder.test_type} in category ${reminder.category_id}`);
}