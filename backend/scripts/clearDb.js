import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clearDb() {
  console.log('Clearing tracked_products (and cascading to history/logs)...');
  const { error } = await supabase
    .from('tracked_products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (error) {
    console.error('Error clearing DB:', error);
    process.exit(1);
  }
  
  console.log('✅ Database cleared successfully!');
  process.exit(0);
}

clearDb();
