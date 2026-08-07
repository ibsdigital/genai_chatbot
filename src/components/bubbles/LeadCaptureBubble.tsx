import { createSignal, Show, For } from 'solid-js';
import { z } from 'zod';
import { FormEvent, LeadsConfig, MessageType } from '@/components/Bot';
import { LeadCaptureInput, fetchAuthToken } from '@/queries/sendMessageQuery';
import { getSessionStorageChatflow, setSessionStorageChatflow } from '@/utils';
import { getCompanyConfig } from '@/window';

type Props = {
  message: MessageType;
  chatflowid: string;
  chatId: string;
  leadsConfig?: LeadsConfig;
  apiHost?: string;
  showAvatar?: boolean;
  avatarSrc?: string;
  backgroundColor?: string;
  textColor?: string;
  sendButtonColor?: string;
  fontSize?: number;
  isLeadSaved: boolean;
  setIsLeadSaved: (value: boolean) => void;
  setLeadEmail: (value: string) => void;
  setLeadFirstName: (value: string) => void;
  setIsConsentGiven: (value: boolean) => void;
  isExpand?: boolean;
  addPersonalizedWelcome: (firstName: string) => void;
};

// ─── Schema for the custom_message (AMS Neve) variant ────────────────────────
const CustomLeadCaptureSchema = z.object({
  firstName: z.string().optional(),
  email: z.string().min(1, 'Email is required').email('Please provide a valid email'),
});

// ─── Schema for the default variant ──────────────────────────────────────────
const DefaultLeadCaptureSchema = z.object({
  firstName: z.string().optional(),
  email: z.string().min(1, 'Email is required').email('Please provide a valid email'),
  consentCheckbox: z.boolean().refine((val) => val === true, {
    message: 'Please accept the terms & conditions to proceed.',
  }),
});

export const LeadCaptureBubble = (props: Props) => {
  const config = getCompanyConfig();
  if (!config) return null;

  return <>{config.lead_capture_message ? <CustomMessageVariant {...props} /> : <DefaultVariant {...props} />}</>;
};

// ─── AMS Neve variant (custom_message: true) ─────────────────────────────────
const CustomMessageVariant = (props: Props) => {
  const [isLeadSaving, setIsLeadSaving] = createSignal(false);
  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string[]>>({});
  const [generalError, setGeneralError] = createSignal<string | null>(null);

  const config = getCompanyConfig()!;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get('firstName') as string) ?? '';
    const email = (formData.get('email') as string) ?? '';

    const res = CustomLeadCaptureSchema.safeParse({ firstName, email });
    if (!res.success) {
      setFieldErrors(res.error.flatten().fieldErrors);
      return;
    }
    setFieldErrors({});
    setIsLeadSaving(true);

    try {
      const token = await fetchAuthToken(firstName, email, props.apiHost);
      setSessionStorageChatflow(props.chatflowid, props.chatId, {
        token,
        lead: { firstName, email, consentCheckbox: true },
      });
      props.setLeadFirstName(firstName);
      props.setLeadEmail(email);
      props.setIsConsentGiven(true);
      props.setIsLeadSaved(true);
      props.addPersonalizedWelcome(firstName);
    } catch {
      setGeneralError('Unable to connect. Please try again.');
    }

    setIsLeadSaving(false);
  };

  return (
    <div class="flex flex-col w-full h-full items-center justify-center" style={{ 'background-color': '#FFFFFF', padding: '15px 25px' }}>
      <div
        class="flex flex-col rounded-lg overflow-hidden"
        style={{
          border: '1px solid #E0E0E0',
          'background-color': '#FAFAFA',
          width: '100%',
          'max-width': '680px',
          height: '100%',
          'max-height': '640px',
          'min-height': '0',
        }}
      >
        {/* Branded top bar */}
        <div style={{ 'background-color': config.colors.primary, height: '4px', 'flex-shrink': '0' }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', 'flex-shrink': '0', 'border-bottom': '1px solid #EEEEEE' }}>
          <p style={{ 'font-size': '14px', 'font-weight': '700', color: '#111', margin: '0 0 2px 0' }}>Welcome to the AMS Neve Assistant</p>
          <p style={{ 'font-size': '12px', color: '#888', margin: '0' }}>Please review the terms below before continuing</p>
        </div>

        {/* Scrollable disclaimer */}
        <div class="overflow-y-auto flex-grow" style={{ padding: '4px 0', 'min-height': '0' }}>
          <For
            each={[
              {
                title: 'General information only',
                text: 'This assistant uses AI to provide information about AMS Neve products, services, and support. While we aim for accuracy, responses may occasionally be incomplete or out of date. For binding details on specifications, pricing, lead times, or warranty terms, please confirm directly with AMS Neve or an authorised dealer.',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={config.colors.primary}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                ),
              },
              {
                title: 'For repairs or fault diagnosis',
                text: "Guidance provided here is for general informational purposes only. For repairs, servicing, or fault diagnosis, please allow the assistant to create a support ticket so that our team can provide specialist human assistance. Do not attempt internal repairs or modifications based on the assistant's responses alone.",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={config.colors.primary}>
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                ),
              },
              {
                title: 'Cannot process transactions',
                text: 'This assistant cannot process orders, payments, or warranty claims, but it can point you to the right team or resource.',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={config.colors.primary}>
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                ),
              },
              {
                title: 'Your privacy matters',
                text: 'Conversations may be recorded and reviewed by a human member of our team to improve service quality, train our systems, and support any follow-up enquiries. Please do not share passwords, payment details, or other sensitive personal information through this chat.',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={config.colors.primary}>
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                ),
              },
            ]}
          >
            {(item, index) => (
              <div
                style={{
                  display: 'flex',
                  'align-items': 'flex-start',
                  gap: '14px',
                  padding: '12px 20px',
                  'border-bottom': index() < 3 ? '1px solid #F0F0F0' : 'none',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    'border-radius': '50%',
                    background: `${config.colors.primary}18`,
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'flex-shrink': '0',
                    'margin-top': '2px',
                  }}
                >
                  {item.icon}
                </div>

                <div>
                  <p
                    style={{
                      'font-size': '13px',
                      'font-weight': '700',
                      color: '#1a1a1a',
                      margin: '0 0 3px 0',
                    }}
                  >
                    {item.title}
                  </p>

                  <p
                    style={{
                      'font-size': '12px',
                      color: '#666',
                      margin: '0',
                      'line-height': '1.55',
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              </div>
            )}
          </For>
          {/* Terms item with links */}
          <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '14px', padding: '12px 20px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                'border-radius': '50%',
                background: `${config.colors.primary}18`,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'flex-shrink': '0',
                'margin-top': '2px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={config.colors.primary}>
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            </div>
            <div>
              <p style={{ 'font-size': '13px', 'font-weight': '700', color: '#1a1a1a', margin: '0 0 3px 0' }}>Terms apply</p>
              <p style={{ 'font-size': '12px', color: '#666', margin: '0', 'line-height': '1.55' }}>
                Your use of this assistant is subject to AMS Neve's{' '}
                <a href={config.privacyPolicy} target="_blank" style={{ color: config.colors.primary, 'text-decoration': 'underline' }}>
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href={config.terms} target="_blank" style={{ color: config.colors.primary, 'text-decoration': 'underline' }}>
                  Terms of Use
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Form + footer combined */}
        <form
          id="lead-capture-form"
          onSubmit={handleSubmit}
          style={{ 'flex-shrink': '0', 'border-top': '1px solid #E0E0E0', 'background-color': '#F5F5F5', padding: '14px 20px' }}
        >
          <div style={{ 'max-width': '400px', margin: '0 auto 10px' }}>
            <div style={{ position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', 'pointer-events': 'none' }}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
                  fill="#AAAAAA"
                />
              </svg>
              <input
                type="text"
                name="firstName"
                placeholder="First Name (optional)"
                style={{
                  'background-color': '#FFFFFF',
                  border: `1px solid ${fieldErrors().firstName ? '#ef4444' : '#E0E0E0'}`,
                  'border-radius': '7px',
                  'font-size': '13px',
                  width: '100%',
                  'box-sizing': 'border-box',
                  padding: '9px 10px 9px 32px',
                  outline: 'none',
                }}
              />
            </div>
            {fieldErrors().firstName && (
              <span style={{ color: '#ef4444', 'font-size': '11px', 'margin-top': '3px', display: 'block' }}>{fieldErrors().firstName[0]}</span>
            )}
          </div>
          <div style={{ 'max-width': '400px', margin: '0 auto 12px' }}>
            <div style={{ position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', 'pointer-events': 'none' }}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#AAAAAA" />
              </svg>
              <input
                type="email"
                name="email"
                placeholder="Email Address (required)"
                style={{
                  'background-color': '#FFFFFF',
                  border: `1px solid ${fieldErrors().email ? '#ef4444' : '#E0E0E0'}`,
                  'border-radius': '7px',
                  'font-size': '13px',
                  width: '100%',
                  'box-sizing': 'border-box',
                  padding: '9px 10px 9px 32px',
                  outline: 'none',
                }}
              />
            </div>
            {fieldErrors().email && (
              <span style={{ color: '#ef4444', 'font-size': '11px', 'margin-top': '3px', display: 'block' }}>{fieldErrors().email[0]}</span>
            )}
          </div>
          {generalError() && (
            <p style={{ color: '#ef4444', 'font-size': '12px', 'text-align': 'center', 'max-width': '400px', margin: '0 auto' }}>{generalError()}</p>
          )}

          {/* Full-width footer */}
          <div
            style={{
              margin: '12px -20px -14px',
              'border-top': '1px solid #E0E0E0',
              'background-color': '#EBEBEB',
              padding: '10px 20px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              gap: '10px',
            }}
          >
            <p style={{ 'font-size': '11px', color: '#777', margin: '0', 'line-height': '1.4' }}>
              By continuing you acknowledge and accept these terms.
            </p>
            <button
              type="submit"
              disabled={isLeadSaving()}
              style={{
                'background-color': isLeadSaving() ? '#aaa' : config.colors.primary,
                color: '#FFFFFF',
                border: 'none',
                'border-radius': '6px',
                padding: '9px 22px',
                'font-size': '13px',
                'font-weight': '600',
                cursor: isLeadSaving() ? 'not-allowed' : 'pointer',
                'white-space': 'nowrap',
                'flex-shrink': '0',
              }}
            >
              {isLeadSaving() ? 'Connecting...' : 'Continue →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Default variant (custom_message: false / absent) ────────────────────────
const DefaultVariant = (props: Props) => {
  const [leadFirstName, setLeadFirstName] = createSignal<string>('');
  const [leadEmail, setLeadEmail] = createSignal<string>('');
  const [isLeadSaving, setIsLeadSaving] = createSignal(false);
  const [leadFormError, setLeadFormError] = createSignal<Record<string, string[]>>();
  const [generalError, setGeneralError] = createSignal<string | null>(null);

  const config = getCompanyConfig()!;

  const handleLeadCaptureSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLeadSaving(true);
    setGeneralError(null);

    // Extract form data
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const email = formData.get('email') as string;

    // consentCheckbox always true
    const consentGiven = true;

    const formValues = { firstName, email, consentCheckbox: consentGiven };

    const res = DefaultLeadCaptureSchema.safeParse(formValues);
    if (!res.success) {
      const error = res.error.flatten();
      setLeadFormError(error.fieldErrors);
      setIsLeadSaving(false);
      return;
    }

    // Save first name for personalization
    localStorage.setItem('leadFirstName', firstName);
    localStorage.setItem('leadEmail', email);
    localStorage.setItem('isConsentGiven', 'true');

    try {
      // Fetch auth token (will show toast if it fails)
      const token = await fetchAuthToken(firstName, email, props.apiHost);

      // Prepare lead capture body (replace with real API call if needed)
      const body: LeadCaptureInput = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        name: firstName,
        email,
        consentCheckbox: consentGiven,
      };

      // Placeholder for actual lead capture API call
      const result = { data: true };

      if (result.data) {
        setSessionStorageChatflow(props.chatflowid, props.chatId, {
          token,
          lead: { firstName, email, consentCheckbox: true },
        });

        setLeadFirstName(firstName);
        props.addPersonalizedWelcome(firstName);
        props.setIsLeadSaved(true);
        props.setLeadEmail(email);
        props.setLeadFirstName(firstName);
        props.setIsConsentGiven(consentGiven);
      } else {
        setGeneralError('Something went wrong capturing your info. Please try again.');
      }
    } catch (err) {
      setGeneralError('Failed to authenticate. Please try again.');
    }

    setIsLeadSaving(false);
  };

  type TemplateData = Record<string, string | number | undefined | null>;

  function renderTemplate(template: string, data: TemplateData): string {
    return template.replace(/{(.*?)}/g, (_, key: string) => {
      const value = data[key.trim()];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  const userData = {
    firstName: leadFirstName(),
  };

  return (
    <div class="flex flex-col w-full h-full justify-center items-center p-6" style={{ 'background-color': '#FFFFFF' }}>
      {props.isLeadSaved || getSessionStorageChatflow(props.chatflowid)?.lead ? (
        <div class="flex flex-col gap-2 text-center">
          <span style={{ 'white-space': 'pre-line', color: '#000000' }}>{renderTemplate(config.welcomeMessage, userData)}</span>
        </div>
      ) : (
        <div class="w-full max-w-md rounded-lg p-6 shadow-lg" style={{ 'background-color': '#EBEBEB' }}>
          {/* Welcome Messages */}
          <div class="mb-6 text-center">
            <p class="mb-4 text-sm" style={{ color: '#000000', 'line-height': '1.5' }}>
              {config.leadTitleMessage}
            </p>

            <p class="text-sm" style={{ color: '#000000', 'line-height': '1.5' }}>
              {config.leadCaptureMessage}
            </p>
          </div>

          <form class="flex flex-col gap-4" onSubmit={handleLeadCaptureSubmit}>
            {/* First Name Field */}
            <div class="w-full">
              <input
                class="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder="First Name (optional)"
                name="firstName"
                value={leadFirstName()}
                onChange={(e) => setLeadFirstName(e.currentTarget.value)}
                style={{
                  'background-color': '#FFFFFF',
                  'border-color': '#E5E7EB',
                  'font-size': '14px',
                }}
              />
              {leadFormError()?.firstName && <span class="text-red-500 text-sm mt-1">{leadFormError()?.firstName[0]}</span>}
            </div>

            {/* Email Field */}
            <div class="w-full">
              <input
                class="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                type="email"
                placeholder="Email Address (required)"
                name="email"
                value={leadEmail()}
                onChange={(e) => setLeadEmail(e.currentTarget.value)}
                style={{
                  'background-color': '#FFFFFF',
                  'border-color': '#E5E7EB',
                  'font-size': '14px',
                }}
              />
              {leadFormError()?.email && <span class="text-red-500 text-sm mt-1">{leadFormError()?.email[0]}</span>}
            </div>

            {/* Consent Info (no checkbox, just message) */}
            <div class="mt-2 text-xs text-gray-600 text-center" style={{ 'font-size': '12px', color: '#000000' }}>
              By continuing, you agree to our{' '}
              <a href={config.terms} target="_blank" class="underline" style={{ color: config.colors.secondary }}>
                Terms of Use
              </a>{' '}
              and{' '}
              <a href={config.privacyPolicy} target="_blank" class="underline" style={{ color: config.colors.secondary }}>
                Privacy Policy
              </a>
              .
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              class="w-28 self-end py-1 px-2 rounded-md font-semibold transition-colors duration-200 text-sm"
              style={{
                'background-color': config.colors.primary,
                color: '#FFFFFF',
                'margin-top': '8px',
              }}
              disabled={isLeadSaving()}
            >
              {isLeadSaving() ? 'Submitting...' : 'Submit'}
            </button>

            {generalError() && <span class="text-red-500 text-sm text-center">{generalError()}</span>}
          </form>
        </div>
      )}
    </div>
  );
};
