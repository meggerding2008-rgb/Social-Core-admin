const fs = require('fs');

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v.trim();
  }
  return out;
}

const env = loadEnv('.env.local');
const key = env.BREVO_API_KEY || '';

console.log('keyConfigured=' + Boolean(key));
console.log('keyLen=' + key.length);
console.log('keyPrefixOk=' + String(key.startsWith('xkeysib-')));
console.log('fromEmailSet=' + Boolean(env.BREVO_FROM_EMAIL));
console.log('fromNameSet=' + Boolean(env.BREVO_FROM_NAME));

(async () => {
  const res = await fetch('https://api.brevo.com/v3/account', {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'api-key': key,
    },
  });
  console.log('accountStatus=' + res.status);
  let code = null;
  let message = null;
  try {
    const j = await res.json();
    code = j && j.code ? String(j.code) : null;
    message = j && j.message ? String(j.message).slice(0, 160) : null;
  } catch {
    // ignore
  }
  console.log('accountCode=' + code);
  console.log('accountMessage=' + message);
})().catch((e) => {
  console.log('networkError=true');
  console.log('errName=' + e.name);
});
