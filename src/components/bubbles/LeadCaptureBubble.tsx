import { createSignal, Show } from 'solid-js';
import { z } from 'zod';
import { FormEvent, LeadsConfig, MessageType } from '@/components/Bot';
import { LeadCaptureInput, fetchAuthToken } from '@/queries/sendMessageQuery';
import { getSessionStorageChatflow, setSessionStorageChatflow } from '@/utils';
import { getCompanyConfig } from '@/window';
import { LeadCaptureDisclaimer } from './LeadCaptureDisclaimer';
import { UserIcon, EmailIcon } from '../icons';

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
const CustomLeadCaptureSchema = (firstNameOptional: boolean) =>
  z.object({
    firstName: firstNameOptional ? z.string().optional() : z.string().min(1, 'First name is required'),
    email: z.string().min(1, 'Email is required').email('Please provide a valid email'),
  });

// ─── Schema for the default variant ──────────────────────────────────────────
const DefaultLeadCaptureSchema = (firstNameOptional: boolean) =>
  z.object({
    firstName: firstNameOptional ? z.string().optional() : z.string().min(1, 'First name is required'),
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

    const res = CustomLeadCaptureSchema(config.firstname_optional ?? true).safeParse({ firstName, email });
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
    <div class="lead-capture-panel">
      <div class="lead-capture-card">
        {/* Branded top bar */}
        <div class="lead-capture-topbar" style={{ 'background-color': config.colors.primary }} />

        {/* Header */}
        <div class="lead-capture-header">
          <p class="lead-capture-header-title">Welcome to the AMS Neve Assistant</p>
          <p class="lead-capture-header-subtitle">Please review the terms below before continuing</p>
        </div>

        {/* Disclaimer — now its own component */}
        <LeadCaptureDisclaimer config={config} />

        {/* Form + footer combined */}
        <form id="lead-capture-form" onSubmit={handleSubmit} class="lead-capture-form">
          <div class="lead-capture-field-wrap">
            <div class="lead-capture-input-icon-wrap">
              <span class="lead-capture-input-icon">
                <UserIcon />
              </span>
              <input
                type="text"
                name="firstName"
                required={config.firstname_optional === false}
                placeholder={config.firstname_optional === false ? 'First Name (required)' : 'First Name (optional)'}
                class={`lead-capture-input ${fieldErrors().firstName ? 'lead-capture-input-error' : ''}`}
              />
            </div>
            {fieldErrors().firstName && <span class="lead-capture-field-error">{fieldErrors().firstName[0]}</span>}
          </div>

          <div class="lead-capture-field-wrap-last">
            <div class="lead-capture-input-icon-wrap">
              <span class="lead-capture-input-icon">
                <EmailIcon />
              </span>
              <input
                type="email"
                name="email"
                placeholder="Email Address (required)"
                class={`lead-capture-input ${fieldErrors().email ? 'lead-capture-input-error' : ''}`}
              />
            </div>
            {fieldErrors().email && <span class="lead-capture-field-error">{fieldErrors().email[0]}</span>}
          </div>

          {generalError() && <p class="lead-capture-general-error">{generalError()}</p>}

          {/* Full-width footer */}
          <div class="lead-capture-footer">
            <p class="lead-capture-footer-text">By continuing you acknowledge and accept these terms.</p>
            <button
              type="submit"
              disabled={isLeadSaving()}
              class={`lead-capture-submit-btn ${isLeadSaving() ? 'lead-capture-submit-btn-disabled' : 'lead-capture-submit-btn-active'}`}
              style={{ 'background-color': isLeadSaving() ? undefined : config.colors.primary }}
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

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const email = formData.get('email') as string;
    const consentGiven = true;

    const formValues = { firstName, email, consentCheckbox: consentGiven };

    const res = DefaultLeadCaptureSchema(config.firstname_optional ?? true).safeParse(formValues);
    if (!res.success) {
      const error = res.error.flatten();
      setLeadFormError(error.fieldErrors);
      setIsLeadSaving(false);
      return;
    }

    localStorage.setItem('leadFirstName', firstName);
    localStorage.setItem('leadEmail', email);
    localStorage.setItem('isConsentGiven', 'true');

    try {
      const token = await fetchAuthToken(firstName, email, props.apiHost);

      const body: LeadCaptureInput = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        name: firstName,
        email,
        consentCheckbox: consentGiven,
      };

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
          <div class="mb-6 text-center">
            <p class="mb-4 text-sm" style={{ color: '#000000', 'line-height': '1.5' }}>
              {config.leadTitleMessage}
            </p>
            <p class="text-sm" style={{ color: '#000000', 'line-height': '1.5' }}>
              {config.leadCaptureMessage}
            </p>
          </div>

          <form class="flex flex-col gap-4" onSubmit={handleLeadCaptureSubmit}>
            <div class="w-full">
              <input
                class="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder={config.firstname_optional === false ? 'First Name (required)' : 'First Name (optional)'}
                required={config.firstname_optional === false}
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
