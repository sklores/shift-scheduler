export const metadata = { title: 'Terms & Conditions — Shift by And Done' };

export default function Terms() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 680, margin: '60px auto', padding: '0 24px', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Terms &amp; Conditions</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 40 }}>Last updated: April 19, 2026</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>1. Program Description</h2>
      <p>The Shift SMS Notification Program ("Program") sends operational text messages to restaurant employees regarding their work schedules. Messages include weekly schedule postings, shift reminders, and shift change notifications. This is a strictly operational program — no marketing or promotional messages will be sent.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>2. Who Can Participate</h2>
      <p>Participation is limited to current employees of participating restaurants using the Shift scheduling platform. Employees enroll by providing their mobile phone number to management as part of the onboarding process.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>3. Message Frequency</h2>
      <p>Message frequency varies depending on scheduling activity. Employees typically receive 1–10 messages per week. A message will be sent each time a schedule is published or a shift is updated.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>4. Message &amp; Data Rates</h2>
      <p>Message and data rates may apply depending on your mobile carrier plan. And Done is not responsible for any charges incurred from your carrier.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>5. Opt-Out</h2>
      <p>You may opt out of SMS notifications at any time by replying <strong>STOP</strong> to any message. After opting out, you will receive a single confirmation message and no further messages will be sent. To re-enroll, contact management directly.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>6. Help</h2>
      <p>For help with the SMS program, reply <strong>HELP</strong> to any message or contact management directly at <a href="mailto:hello@anddone.ai" style={{ color: '#1d4ed8' }}>hello@anddone.ai</a>.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>7. Supported Carriers</h2>
      <p>Messages are delivered via major US carriers including AT&amp;T, Verizon, T-Mobile, Sprint, and others. Carrier support may vary.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>8. Privacy</h2>
      <p>Your phone number and personal information will not be shared with third parties or used for marketing purposes. See our full <a href="/privacy-policy" style={{ color: '#1d4ed8' }}>Privacy Policy</a> for details.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>9. Changes to These Terms</h2>
      <p>We may update these Terms from time to time. Continued participation in the SMS program after changes constitutes acceptance of the updated Terms.</p>

      <p style={{ marginTop: 48, color: '#999', fontSize: 13 }}>© 2026 And Done. All rights reserved.</p>
    </main>
  );
}
