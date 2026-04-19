export const metadata = { title: 'Privacy Policy — Shift by And Done' };

export default function PrivacyPolicy() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 680, margin: '60px auto', padding: '0 24px', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 40 }}>Last updated: April 19, 2026</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>1. Overview</h2>
      <p>This Privacy Policy describes how And Done ("we," "us," or "our") handles information collected through the Shift employee scheduling platform at schedule.anddone.ai, including our SMS notification program.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>2. Information We Collect</h2>
      <p>We collect the following information to operate the scheduling service:</p>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
        <li>Employee name and role</li>
        <li>Mobile phone number (provided voluntarily for SMS notifications)</li>
        <li>Work schedule data (shift dates, start and end times)</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>3. SMS Notifications</h2>
      <p>Employees who provide a mobile phone number will receive operational SMS messages including:</p>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
        <li>Weekly schedule postings</li>
        <li>Shift reminders and updates</li>
      </ul>
      <p style={{ marginTop: 12 }}>Message frequency varies depending on scheduling activity but typically ranges from 1–10 messages per week. Message and data rates may apply.</p>
      <p style={{ marginTop: 12 }}><strong>To opt out:</strong> Reply <strong>STOP</strong> to any message at any time. For help, reply <strong>HELP</strong> or contact management directly.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>4. How We Use Your Information</h2>
      <p>Information is used solely to operate the scheduling service and send operational notifications to employees. We do not use your information for marketing or promotional purposes, and we do not sell or share your personal information with third parties.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>5. Data Storage</h2>
      <p>Schedule and employee data is stored securely using Supabase (supabase.com). Phone numbers are stored only for the purpose of delivering schedule notifications.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>6. Your Rights</h2>
      <p>You may request removal of your phone number or personal data at any time by contacting management directly. Upon request, your data will be deleted within 30 days.</p>

      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>7. Contact</h2>
      <p>Questions about this policy? Contact us at <a href="mailto:hello@anddone.ai" style={{ color: '#1d4ed8' }}>hello@anddone.ai</a>.</p>

      <p style={{ marginTop: 48, color: '#999', fontSize: 13 }}>© 2026 And Done. All rights reserved.</p>
    </main>
  );
}
