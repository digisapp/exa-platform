const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

(async () => {
  // Find Thaissa's model record
  const { data: model, error: modelErr } = await supabase
    .from('models')
    .select('id, first_name, last_name, username')
    .ilike('username', 'thaissafit')
    .single();

  if (modelErr || !model) {
    console.log('Model not found:', modelErr?.message);
    process.exit(1);
  }
  console.log('Found model:', model.first_name, model.last_name, '(' + model.username + ')', 'ID:', model.id);

  // Find the Miami Swim Week event badge
  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .ilike('slug', 'miami-swim-week-2026')
    .single();

  if (!event) {
    console.log('Event not found');
    process.exit(1);
  }
  console.log('Found event:', event.name, 'ID:', event.id);

  const { data: badge } = await supabase
    .from('badges')
    .select('id, name')
    .eq('event_id', event.id)
    .eq('badge_type', 'event')
    .single();

  if (!badge) {
    console.log('Event badge not found');
    process.exit(1);
  }
  console.log('Found badge:', badge.name, 'ID:', badge.id);

  // Check if Thaissa has this badge
  const { data: existingBadge } = await supabase
    .from('model_badges')
    .select('id')
    .eq('model_id', model.id)
    .eq('badge_id', badge.id)
    .single();

  if (!existingBadge) {
    console.log('Thaissa does not have this badge — nothing to remove');
  } else {
    console.log('Found model_badge record, removing...');
    const { error: deleteErr } = await supabase
      .from('model_badges')
      .delete()
      .eq('model_id', model.id)
      .eq('badge_id', badge.id);

    if (deleteErr) {
      console.log('Error removing badge:', deleteErr.message);
    } else {
      console.log('Badge removed successfully');
    }
  }

  // Also ensure gig_applications status is pending
  const { data: app, error: appErr } = await supabase
    .from('gig_applications')
    .select('id, status')
    .eq('model_id', model.id)
    .limit(5);

  console.log('Gig applications:', app);

  if (app && app.length > 0) {
    for (const a of app) {
      if (a.status === 'accepted') {
        const { error: updateErr } = await supabase
          .from('gig_applications')
          .update({ status: 'pending', reviewed_at: null })
          .eq('id', a.id);
        console.log(updateErr ? 'Update error: ' + updateErr.message : 'gig_application set to pending: ' + a.id);
      } else {
        console.log('gig_application already at status:', a.status, '(id:', a.id + ')');
      }
    }
  }
})();
