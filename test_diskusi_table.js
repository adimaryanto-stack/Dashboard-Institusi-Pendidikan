const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] ? match[2].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      env[match[1]] = val;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  console.log("Checking if diskusi_rab exists on Supabase...");
  const { data, error } = await supabase.from('diskusi_rab').select('*').limit(1);
  if (error) {
    console.error("Error: ", error.message, error.code);
  } else {
    console.log("Success! Table exists and is accessible. Count:", data.length);
  }
}

main();
