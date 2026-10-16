import { ContactForm } from '@/components/contact/contact-form'

export const metadata = {
  title: 'Contact Us | EntryDesk',
  description: 'Get in touch with the EntryDesk team. We would love to hear from you.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 xl:px-8">
          <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 xl:px-8">
        <div className="grid gap-12 md:grid-cols-2">
          {/* Contact form */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
            <ContactForm />
          </div>

          {/* Contact info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Get in touch</h3>
              <p className="text-muted-foreground">
                Whether you have questions about EntryDesk, need support, or want to discuss enterprise features,
                feel free to reach out using the form or contact Crux Studios directly.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-3">
              <p className="text-base font-semibold">Crux Studios</p>
              <p className="text-sm text-muted-foreground">
                Website:{' '}
                <a href="https://cruxstudios.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  cruxstudios.dev
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Email:{' '}
                <a href="mailto:contact@cruxstudios.dev" className="text-primary hover:underline font-medium">
                  contact@cruxstudios.dev
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
