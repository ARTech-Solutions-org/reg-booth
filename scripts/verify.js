async function verify() {
  const base = 'http://127.0.0.1:8080';
  console.log('Testing endpoints on', base);

  // 1. Root /
  const r1 = await fetch(`${base}/`);
  const t1 = await r1.text();
  console.log('1. GET / -> Status:', r1.status, '| HTML Length:', t1.length, '| Has root div:', t1.includes('id="root"'));

  // 2. /register
  const r2 = await fetch(`${base}/register`);
  const t2 = await r2.text();
  console.log('2. GET /register -> Status:', r2.status, '| HTML Length:', t2.length);

  // 3. /api/healthz
  const r3 = await fetch(`${base}/api/healthz`);
  const j3 = await r3.json();
  console.log('3. GET /api/healthz -> Status:', r3.status, '| Output:', JSON.stringify(j3));

  // 4. Register new attendee
  const regRes = await fetch(`${base}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Rostova',
      email: 'elena@quantum.io',
      company: 'Quantum Dynamics',
      ticketType: 'Speaker',
    }),
  });
  const regData = await regRes.json();
  console.log('4. POST /api/public/register -> Status:', regRes.status, '| QR ID:', regData.attendee?.qrId);

  // 5. Login
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'organizer', password: 'welcome123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('5. POST /api/auth/login -> Status:', loginRes.status, '| Session Cookie:', !!cookie);

  // 6. Scan Check-In
  const checkInRes = await fetch(`${base}/api/check-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ qrId: regData.attendee.qrId }),
  });
  const checkInData = await checkInRes.json();
  console.log('6. POST /api/check-ins -> Status:', checkInRes.status, '| Result:', checkInData.status, '| Message:', checkInData.message);

  // 7. Duplicate Check-In
  const dupeRes = await fetch(`${base}/api/check-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ qrId: regData.attendee.qrId }),
  });
  const dupeData = await dupeRes.json();
  console.log('7. POST /api/check-ins (Duplicate) -> Status:', dupeRes.status, '| Result:', dupeData.status, '| Message:', dupeData.message);

  // 8. Walk-in Registration
  const walkInRes = await fetch(`${base}/api/attendees/walk-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: 'David Kim',
      email: 'david@kimlabs.com',
      company: 'Kim Robotics',
      ticketType: 'VIP',
    }),
  });
  const walkInData = await walkInRes.json();
  console.log('8. POST /api/attendees/walk-in -> Status:', walkInRes.status, '| QR ID:', walkInData.attendee?.qrId, '| Checked In:', !!walkInData.attendee?.checkedInAt);

  // 9. Dashboard
  const dashRes = await fetch(`${base}/api/dashboard/summary`, {
    headers: { Cookie: cookie },
  });
  const dashData = await dashRes.json();
  console.log('9. GET /api/dashboard/summary -> Total:', dashData.total, '| Checked In:', dashData.checkedIn, '| Remaining:', dashData.remaining);
}

verify().catch(console.error);
