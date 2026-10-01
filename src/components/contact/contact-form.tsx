'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitContactForm } from '@/app/contact/actions'
import { useState } from 'react'
import { Mail, Clock, MessageSquare } from 'lucide-react'

interface ContactFormInputs {
  name: string
  email: string
  message: string
}

export function ContactForm() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const isTurnstileRequired = Boolean(siteKey)

  const [isPending, startTransition] = useTransition()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isTurnstileReady, setIsTurnstileReady] = useState(!isTurnstileRequired)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormInputs>({
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  })

  const onSubmit = async (data: ContactFormInputs) => {
    if (isTurnstileRequired && !turnstileToken) {
      setMessage({ type: 'error', text: 'Please complete the CAPTCHA verification' })
      return
    }

    startTransition(async () => {
      const result = await submitContactForm({
        ...data,
        turnstileToken: turnstileToken || undefined,
      })

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Message sent successfully.' })
        reset()
        setTurnstileToken(null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send message.' })
      }
    })
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
      {/* ─── Left: trust signals ─── */}
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Get in touch</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Have a question about EntryDesk, or need help getting set up? Send us a message and we&apos;ll get back to you quickly.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Quick response</p>
              <p className="text-sm text-muted-foreground mt-0.5">We aim to reply within 24 hours on weekdays.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Direct line</p>
              <p className="text-sm text-muted-foreground mt-0.5">Your message goes directly to the EntryDesk team — no bots, no ticket queues.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">We&apos;re here to help</p>
              <p className="text-sm text-muted-foreground mt-0.5">Whether it&apos;s a setup question, a feature request, or a bug — reach out anytime.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: form ─── */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm dark:border-white/[0.06] sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {message && (
            <div
              className={`rounded-lg border p-3.5 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="block text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('name', { required: 'Name is required' })}
              placeholder="Your name"
              disabled={isPending}
              id="contact-name"
              className={errors.name ? 'border-red-400' : ''}
            />
            {errors.name && (
              <span className="text-xs text-red-500 block">{errors.name.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="block text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
              type="email"
              placeholder="your.email@example.com"
              disabled={isPending}
              id="contact-email"
              className={errors.email ? 'border-red-400' : ''}
            />
            {errors.email && (
              <span className="text-xs text-red-500 block">{errors.email.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-message" className="block text-sm font-medium">
              Message <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...register('message', { required: 'Message is required' })}
              placeholder="Tell us how we can help..."
              disabled={isPending}
              rows={5}
              id="contact-message"
              className={errors.message ? 'border-red-400' : ''}
            />
            {errors.message && (
              <span className="text-xs text-red-500 block">{errors.message.message}</span>
            )}
          </div>

          {isTurnstileRequired && (
            <div>
              <Turnstile
                siteKey={siteKey!}
                onSuccess={(token) => {
                  setTurnstileToken(token)
                  setIsTurnstileReady(true)
                }}
                onError={() => {
                  setTurnstileToken(null)
                  setMessage({ type: 'error', text: 'CAPTCHA verification failed. Please try again.' })
                }}
                onExpire={() => {
                  setTurnstileToken(null)
                }}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || (isTurnstileRequired && (!turnstileToken || !isTurnstileReady))}
            className="h-10 w-full"
          >
            {isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>
    </div>
  )
}
