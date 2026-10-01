import React from "react";

export const metadata = {
  title: 'Privacy Policy | EntryDesk',
  description: 'Privacy Policy for EntryDesk',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background pb-12">
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 xl:px-8">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-muted-foreground">Effective Date: May 8, 2026</p>
          <p className="text-muted-foreground">Last Updated: October 1, 2026 — Updated to include Parent Portal, children&apos;s data processing, and DPDPA (India) compliance details.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 xl:px-8">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              EntryDesk (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an open-source tournament operations and event management platform. This Privacy Policy explains how we collect, use, store, and protect personal information when you use the hosted version of EntryDesk at <a href="https://entrydesk.shorinkai.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">entrydesk.shorinkai.in</a> (the &quot;Service&quot;).
            </p>
            <p className="text-muted-foreground mt-2">
              If you are self-hosting EntryDesk, this policy does not apply to your instance &mdash; you are responsible for your own privacy practices and compliance.
            </p>
            <p className="text-muted-foreground mt-2">
              By using the Service, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Who This Policy Applies To</h2>
            <p className="text-muted-foreground mb-2">This policy applies to four types of users:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li><strong>Organizers</strong> &mdash; individuals or organizations who create and manage tournaments on EntryDesk.</li>
              <li><strong>Coaches</strong> &mdash; individuals who manage dojos, students, and event registrations.</li>
              <li><strong>Parents / Legal Guardians</strong> &mdash; individuals who register their children for tournaments via the EntryDesk Parent Portal.</li>
              <li><strong>Athletes/Students</strong> &mdash; individuals whose data is entered into the platform by coaches or parents on their behalf.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              If you are a parent registering a child, you are confirming that you are the child&apos;s parent or lawful guardian and that you consent to EntryDesk processing your child&apos;s data for the purpose of tournament registration.
            </p>
            <p className="text-muted-foreground mt-2">
              If you are a coach entering data about athletes, <strong>you are responsible</strong> for having appropriate consent from those individuals (or their guardians if they are minors) to submit their information to EntryDesk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. What Data We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-2">3a. Data You Provide Directly</h3>
            <p className="text-muted-foreground mb-2">When you create an account or use the Service, we may collect:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li><strong>Account information:</strong> Full name, email address, password (hashed), and profile details.</li>
              <li><strong>Authentication data:</strong> If you sign in with Google OAuth, we receive your name, email address, and profile picture from Google.</li>
              <li><strong>Dojo/organization information:</strong> Dojo name, location, and affiliation details provided by coaches and organizers.</li>
              <li><strong>Athlete/student roster data:</strong> Names, age categories, weight categories, belt ranks, and event registration details entered by coaches.</li>
              <li><strong>Event data:</strong> Tournament names, dates, locations, formats, entry statuses, and approval decisions created by organizers.</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-2">3b. Data We Collect Automatically</h3>
            <p className="text-muted-foreground mb-2">When you use the Service, we automatically collect:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li><strong>Log data:</strong> IP address, browser type, operating system, pages visited, and timestamps.</li>
              <li><strong>Usage data:</strong> Actions taken within the app, such as form submissions and navigation patterns, used to improve the platform.</li>
              <li><strong>Cookies and session data:</strong> We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-2">3c. Data We Do Not Collect</h3>
            <p className="text-muted-foreground">
              We do not collect payment information (EntryDesk has no paid subscription in its current form), biometric data, health records, or any sensitive personal data beyond what is listed above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Data</h2>
            <p className="text-muted-foreground mb-2">We use collected data to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Authenticate users and manage sessions.</li>
              <li>Enable organizer and coach workflows (event creation, roster management, entry approvals).</li>
              <li>Generate exports (Excel/CSV) for operational use by organizers.</li>
              <li>Respond to support requests and communications.</li>
              <li>Improve and debug the platform based on usage patterns.</li>
              <li>Comply with applicable law.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              We <strong>do not</strong> use your data for advertising, sell it to third parties, or use it to train AI/ML models.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Third Parties</h2>
            <p className="text-muted-foreground mb-4">We share data only in the following limited circumstances:</p>
            
            <h3 className="text-xl font-medium mb-2">5a. Supabase (Infrastructure Provider)</h3>
            <p className="text-muted-foreground mb-4">
              EntryDesk uses <a href="https://supabase.com" className="text-primary hover:underline">Supabase</a> for database hosting and authentication. Your data is stored on Supabase&apos;s infrastructure. Supabase acts as a data processor on our behalf and is bound by their own privacy and security standards. See <a href="https://supabase.com/privacy" className="text-primary hover:underline">Supabase&apos;s Privacy Policy</a>.
            </p>

            <h3 className="text-xl font-medium mb-2">5b. Google (OAuth Provider)</h3>
            <p className="text-muted-foreground mb-4">
              If you use &quot;Sign in with Google,&quot; your authentication is handled by Google. We only receive your basic profile information (name, email, avatar). See <a href="https://policies.google.com/privacy" className="text-primary hover:underline">Google&apos;s Privacy Policy</a>.
            </p>

            <h3 className="text-xl font-medium mb-2">5c. Legal Requirements</h3>
            <p className="text-muted-foreground mb-4">
              We may disclose data if required by law, court order, or government authority, or to protect the rights and safety of users.
            </p>

            <h3 className="text-xl font-medium mb-2">5d. Business Transfer</h3>
            <p className="text-muted-foreground mb-4">
              In the unlikely event EntryDesk undergoes a transfer of ownership, users will be notified, and data may be transferred to the new maintainer under the same privacy commitments.
            </p>
            <p className="text-muted-foreground">
              We do not share data with advertisers, data brokers, or unrelated third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li><strong>Account data</strong> is retained for as long as your account is active.</li>
              <li><strong>Athlete/roster data</strong> entered by coaches is retained for as long as the coach&apos;s account is active.</li>
              <li>Upon account deletion, your personal data will be removed from active systems within <strong>30 days</strong>, except where retention is required by law.</li>
              <li>You may request deletion of your data at any time by contacting us at <strong>hello@ull0sm.in</strong> or <strong>hello@suprateekyawagal.in</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground mb-4">Depending on your location, you may have the following rights:</p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border border border-border rounded-md text-sm text-left mb-4">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium text-foreground">Right</th>
                    <th className="px-4 py-2 font-medium text-foreground">What it means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Access</td>
                    <td className="px-4 py-2 text-muted-foreground">Request a copy of the data we hold about you</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Correction</td>
                    <td className="px-4 py-2 text-muted-foreground">Ask us to correct inaccurate data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Deletion</td>
                    <td className="px-4 py-2 text-muted-foreground">Request deletion of your personal data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Portability</td>
                    <td className="px-4 py-2 text-muted-foreground">Request your data in a portable format</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Objection</td>
                    <td className="px-4 py-2 text-muted-foreground">Object to certain uses of your data</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground mb-2"><strong>GDPR (EU/EEA users):</strong> You have full rights under the General Data Protection Regulation.</p>
            <p className="text-muted-foreground mb-2"><strong>CCPA (California users):</strong> You have the right to know, delete, and opt-out of sale (we do not sell data).</p>
            <p className="text-muted-foreground mb-4"><strong>DPDPA (India users):</strong> Under India&apos;s Digital Personal Data Protection Act 2023, you have rights to access, correction, and erasure of your personal data.</p>
            <p className="text-muted-foreground">To exercise any of these rights, email <strong>hello@ull0sm.in</strong> or <strong>hello@suprateekyawagal.in</strong>.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children and Minors</h2>
            <p className="text-muted-foreground mb-4">EntryDesk is intended for use by adults (coaches, organizers, and parents). Athletes/students registered for tournaments may be minors.</p>

            <h3 className="text-xl font-medium mb-2">8a. If You Are a Coach Entering Minor Data</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>You must have appropriate consent from the minor&apos;s parent or legal guardian.</li>
              <li>You should not submit sensitive health or biometric data about minors.</li>
              <li>You are responsible for compliance with applicable child protection laws in your jurisdiction (e.g., COPPA in the US, GDPR Article 8 in the EU).</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">8b. If You Are a Parent Registering via the Parent Portal</h3>
            <p className="text-muted-foreground mb-2">When you register your child via the Parent Portal:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>You provide explicit consent during registration by checking the consent checkbox. This is recorded with a timestamp and version number.</li>
              <li>Data collected includes: child&apos;s name, date of birth, gender, belt rank, approximate weight, photograph, and school/city.</li>
              <li>This data is used only for: tournament registration, ID card generation, QR-based venue verification, and coach review.</li>
              <li>The data is shared only with the tournament organizer and the coach of your child&apos;s dojo — never with third parties.</li>
              <li>You may withdraw consent at any time by contacting us. Upon withdrawal, your child&apos;s data will be removed from active systems within 30 days.</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">8c. DPDPA (India) Compliance</h3>
            <p className="text-muted-foreground mb-4">
              Under India&apos;s <strong>Digital Personal Data Protection Act 2023 (DPDPA)</strong>, we treat children&apos;s data with extra care:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>We collect only the minimum data necessary for tournament registration.</li>
              <li>Parental consent is obtained and recorded before any child&apos;s data is processed.</li>
              <li>We do not use children&apos;s data for profiling, advertising, or any purpose other than tournament operations.</li>
              <li>We do not share children&apos;s data with data brokers, advertisers, or unrelated third parties.</li>
              <li>As a parent, you have the right to access, correct, and delete your child&apos;s data. See Section 7 for how to exercise these rights.</li>
            </ul>

            <p className="text-muted-foreground">We do not knowingly allow minors under 13 to create accounts directly on the Service. Parents creating accounts are expected to be adults (18+).</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Security</h2>
            <p className="text-muted-foreground mb-2">We take security seriously. Measures include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>All data is transmitted over HTTPS (TLS encryption).</li>
              <li>Passwords are hashed and never stored in plain text.</li>
              <li>Database access is governed by Supabase Row Level Security (RLS) policies.</li>
              <li>Role-based access controls restrict what each user type can see and modify.</li>
            </ul>
            <p className="text-muted-foreground">
              Despite these measures, no system is 100% secure. In the event of a data breach affecting your personal data, we will notify affected users as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Cookies</h2>
            <p className="text-muted-foreground mb-2">We use only essential cookies for:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>Maintaining your login session.</li>
              <li>Storing authentication tokens.</li>
            </ul>
            <p className="text-muted-foreground">
              We do not use analytics, advertising, or third-party tracking cookies. No cookie consent banner is required beyond this disclosure, as we only use strictly necessary cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Links to Third-Party Sites</h2>
            <p className="text-muted-foreground">
              The Service may contain links to external websites. We are not responsible for the privacy practices of those sites and encourage you to review their own policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Open Source Notice</h2>
            <p className="text-muted-foreground">
              EntryDesk&apos;s source code is publicly available on GitHub. The codebase itself does not collect or transmit any data &mdash; data collection only occurs when you use our hosted Service. Self-hosted instances are entirely under the control of whoever deploys them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last Updated&quot; date at the top. For material changes, we will notify users via email or a prominent notice on the platform. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Parent Portal — Specific Data Practices</h2>
            <p className="text-muted-foreground mb-4">
              The EntryDesk Parent Portal allows parents to directly register their children for martial arts tournaments. This section details specific data practices for the Parent Portal:
            </p>

            <h3 className="text-xl font-medium mb-2">14a. Data Collected from Parents</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li><strong>Account data:</strong> Email address and name (via Google Sign-In or email OTP).</li>
              <li><strong>Child profile data:</strong> Name, date of birth, gender, belt/rank, approximate weight, photograph, and school or city.</li>
              <li><strong>Registration data:</strong> Selected tournaments, declared weight category, participation type (kata/kumite/both).</li>
              <li><strong>Consent record:</strong> Timestamp, IP address, and consent version at the time of registration.</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">14b. QR Codes and ID Cards</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>When an entry is approved, a unique QR code token is generated and embedded in the ID card.</li>
              <li>The QR code encodes only a random token URL — no personal data is embedded in the QR image itself.</li>
              <li>Scanning the QR code at the venue shows only: name, dojo, events, and valid/invalid status.</li>
              <li>If an entry is withdrawn after approval, the QR token is permanently revoked and will show &ldquo;Not Valid&rdquo;.</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">14c. Photographs</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>Photos are compressed client-side before upload (max ~150 KB).</li>
              <li>Photos are stored in Vercel Blob with private signed URLs — they are not publicly accessible by URL alone.</li>
              <li>Photos appear on ID cards and in the coach&apos;s student roster. They are never shared with unrelated parties.</li>
              <li>You may request deletion of your child&apos;s photo at any time by contacting us.</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">14d. Data Minimisation and Retention</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li>We collect only the data necessary for tournament registration. Weight and school/city are optional.</li>
              <li>Tournament entry records are retained for the lifetime of your account to support ID card re-downloads and status history.</li>
              <li>Upon requesting account deletion, all personal data (including child profiles, entry records, and photos) will be removed within 30 days.</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">14e. Your Rights as a Parent</h3>
            <p className="text-muted-foreground mb-2">As the parent or guardian of a registered child, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2 mb-4">
              <li><strong>Access:</strong> Request a copy of all data stored about your child.</li>
              <li><strong>Correction:</strong> Edit your child&apos;s profile directly via the Parent Portal, or request corrections via email.</li>
              <li><strong>Deletion:</strong> Request deletion of your child&apos;s data at any time. Deletion removes entry history, photo, and profile data.</li>
              <li><strong>Withdraw consent:</strong> Withdraw your consent for processing at any time. This will result in your child&apos;s data being removed.</li>
              <li><strong>Portability:</strong> Request a data export in JSON or CSV format.</li>
            </ul>
            <p className="text-muted-foreground">
              To exercise any of these rights, email <strong>hello@ull0sm.in</strong> or <strong>hello@suprateekyawagal.in</strong> with &ldquo;Parent Data Request&rdquo; in the subject line.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground mb-4">For privacy-related questions, requests, or concerns, contact:</p>
            <div className="space-y-1 text-muted-foreground">
              <p><strong>EntryDesk Maintainers</strong></p>
              <p>Emails: <strong>hello@ull0sm.in</strong>, <strong>hello@suprateekyawagal.in</strong></p>
              <p>GitHub Profiles: <a href="https://github.com/ull0sm" className="text-primary hover:underline">@ull0sm</a>, <a href="https://github.com/bugsNburgers" className="text-primary hover:underline">@bugsNburgers</a></p>
              <p>Repository: <a href="https://github.com/ull0sm/entrydesk" className="text-primary hover:underline">EntryDesk</a></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
