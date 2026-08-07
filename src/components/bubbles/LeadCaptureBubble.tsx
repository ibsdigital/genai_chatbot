import { createSignal, Show } from 'solid-js';
import { z } from 'zod';
import { FormEvent, LeadsConfig, MessageType } from '@/components/Bot';
import { LeadCaptureInput, fetchAuthToken } from '@/queries/sendMessageQuery';
import { SaveLeadButton } from '@/components/buttons/LeadCaptureButtons';
import { Avatar } from '@/components/avatars/Avatar';
import { getSessionStorageChatflow, setSessionStorageChatflow } from '@/utils';

import { getCompanyConfig } from '@/window';
import { config } from 'dotenv';

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

const defaultBackgroundColor = '#f7f8ff';
const defaultTextColor = '#303235';
const defaultFontSize = 16;

// Updated schema to match your Figma design
const LeadCaptureSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  email: z.string().min(1, 'Email is required').email('Please provide a valid email'),
  consentCheckbox: z.boolean().refine((val) => val === true, {
    message: 'Please accept the terms & conditions to proceed.',
  }),
});

export const LeadCaptureBubble = (props: Props) => {
  const [leadFirstName, setLeadFirstName] = createSignal<string>('');
  const [leadEmail, setLeadEmail] = createSignal<string>('');
  const [isConsentGiven, setIsConsentGiven] = createSignal(true); // always true
  const [isLeadSaving, setIsLeadSaving] = createSignal(false);
  const [leadFormError, setLeadFormError] = createSignal<Record<string, string[]>>();
  const [generalError, setGeneralError] = createSignal<string | null>(null);

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

    // Validate input
    const res = LeadCaptureSchema.safeParse(formValues);
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
  const config = getCompanyConfig();
  if (!config) return null;

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
                placeholder="First Name (required)"
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
