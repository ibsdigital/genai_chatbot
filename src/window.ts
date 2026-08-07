import { createSignal, onCleanup } from 'solid-js';
import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';
import { sendRequest } from './utils';
import { showInlineErrorToast } from './utils/showError';
import { handleApiError } from './utils/apiErrorHandler';
import { setApiHost, setTenantUuid } from './store/chatbotConfig';
// --- Central Config Store ---
export type CompanyConfig = {
  leadTitleMessage: string;
  leadCaptureMessage: string;
  name: string;
  fullName: string;
  firstName: string;
  lastName: string;
  website: string;
  contactUs: string;
  title: string;
  placeholder: string;
  welcomeMessage: string;
  errorMessage: string;
  logo: string;
  chatIcon: string;
  colors: {
    primary: string;
    secondary: string;
    white: string;
    black: string;
    lightGrey: string;
    botMessageBackgroundColor: string;
    botMessageTextColor: string;
  };
  dimensions: {
    height: number;
    width: number;
    buttonSize: number;
  };
  privacyPolicy: string;
  terms: string;
  supportedBy: {
    name: string;
    link: string;
  };
  questions?: string[];
  quickActions?: string[];
  hideSources?: boolean;
  lead_capture_message?: boolean;
  tooltipMessage?: string;
};

const CONFIG_STORAGE_KEY = 'companyConfig';

const [companyConfig, setCompanyConfig] = createSignal<CompanyConfig | null>(null);
const [configError, setConfigError] = createSignal<string | null>(null);

export function getCompanyConfig(): CompanyConfig | null {
  return companyConfig();
}

export function setCompanyConfigStore(config: CompanyConfig) {
  setCompanyConfig(config);
  sessionStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export async function fetchAndInitCompanyConfig(apiHost?: string, tenant_uuid?: string) {
  const cached = sessionStorage.getItem(CONFIG_STORAGE_KEY);
  if (cached) {
    try {
      setCompanyConfig(JSON.parse(cached));
      return;
    } catch (err) {
      console.error('Error parsing cached configuration:', err);
      setConfigError('Failed to parse saved chatbot configuration.');
      return;
    }
  }

  try {
    const url = `${apiHost}/api/v1/tenant/chatbot_config`;
    const body = { external_uid: tenant_uuid };

    // Use sendRequest utility for the API call
    const { data, error } = await sendRequest<{ result: CompanyConfig }>({
      url,
      method: 'POST',
      body,
    });

    if (error) {
      // Try to extract status, errorCode, and errorMsg if error is an object
      let status, errorCode, errorMsg;
      if (typeof error === 'object' && error !== null) {
        status = (error as any).status;
        errorCode = (error as any).errorCode;
        errorMsg = (error as any).errorMsg || (error as any).message || error.toString();
      } else {
        errorMsg = String(error);
      }
      handleApiError(status || 500, errorCode, errorMsg);
      return;
    }

    if (!data || !data.result) {
      handleApiError(404, undefined, 'Invalid tenant UUID or configuration not found.');
      return;
    }

    setCompanyConfigStore(data.result);
    setConfigError(null);
  } catch (err) {
    console.error('Unexpected error loading chatbot config:', err);
    handleApiError(500, undefined, 'Unexpected error occurred. Please try again.');
  }
}

// --- Call this ONCE at app start (e.g. in main.tsx or your entrypoint) ---

let elementUsed: Element | undefined;

type BotProps = {
  chatflowid: string;
  apiHost?: string;
  tenant_uuid?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  observersConfig?: observersConfigType;
  theme?: BubbleTheme;
};

export const initFull = async (props: BotProps & { id?: string }) => {
  destroy();
  if (!companyConfig()) {
    await fetchAndInitCompanyConfig(props.apiHost, props.tenant_uuid);
  }

  const err = configError();
  if (err) {
    showInlineErrorToast(err);
    return;
  }
  if (props.apiHost) setApiHost(props.apiHost);
  if (props.tenant_uuid) setTenantUuid(props.tenant_uuid);
  const config = companyConfig();
  let fullElement = props.id ? document.getElementById(props.id) : document.querySelector('flowise-fullchatbot');
  if (!fullElement) {
    fullElement = document.createElement('flowise-fullchatbot');
    if (!props.theme) {
      props.theme = generateDefaultTheme(config!);
    }
    Object.assign(fullElement, props);
    document.body.appendChild(fullElement);
  } else {
    if (!props.theme) {
      props.theme = generateDefaultTheme(config!);
    }
    Object.assign(fullElement, props);
  }
  elementUsed = fullElement;
};

export const init = async (props: BotProps) => {
  destroy();
  if (!companyConfig()) {
    await fetchAndInitCompanyConfig(props.apiHost, props.tenant_uuid);
  }

  const err = configError();
  if (err) {
    showInlineErrorToast(err);
    return;
  }
  if (props.apiHost) setApiHost(props.apiHost);
  if (props.tenant_uuid) setTenantUuid(props.tenant_uuid);
  const config = companyConfig();
  const element = document.createElement('flowise-chatbot');

  if (!props.theme) {
    props.theme = generateDefaultTheme(config!);
    console.log(`rops.theme.chatWindow?.quickActions ${props.theme.chatWindow?.quickActions}`);
  }

  Object.assign(element, props);
  document.body.appendChild(element);
  elementUsed = element;
};

const generateDefaultTheme = (config: CompanyConfig): BubbleTheme => {
  return {
    button: {
      backgroundColor: config.colors.primary,
      right: 20,
      bottom: 20,
      size: config.dimensions.buttonSize,
      dragAndDrop: false,
      iconColor: config.colors.black,
      customIconSrc: config.chatIcon,
    },
    form: {
      backgroundColor: config.colors.white,
      textColor: config.colors.black,
    },
    tooltip: {
      showTooltip: true,
      tooltipMessage: config.tooltipMessage ?? 'Hi There! How can I help you?',
      tooltipBackgroundColor: config.colors.black,
      tooltipTextColor: config.colors.white,
      tooltipFontSize: 16,
    },
    chatWindow: {
      showTitle: true,
      titleBackgroundColor: config.colors.white,
      titleTextColor: config.colors.black,
      welcomeMessage: config.welcomeMessage,
      errorMessage: config.errorMessage,
      backgroundColor: config.colors.white,
      height: config.dimensions.height,
      width: config.dimensions.width,
      fontSize: 14,
      poweredByTextColor: config.colors.primary,
      botMessage: {
        backgroundColor: config.colors.botMessageBackgroundColor, // Fixed!
        textColor: config.colors.botMessageTextColor, // Fixed!
        showAvatar: false,
      },
      userMessage: {
        backgroundColor: config.colors.secondary,
        textColor: config.colors.white,
        showAvatar: false,
      },
      textInput: {
        placeholder: config.placeholder,
        backgroundColor: config.colors.white,
        textColor: config.colors.black,
        sendButtonColor: config.colors.primary,
        maxChars: 1000,
        maxCharsWarningMessage: 'You exceeded the characters limit. Please input less than 1000 characters.',
        autoFocus: true,
      },
      feedback: {
        color: config.colors.black,
      },
      footer: {
        textColor: config.colors.black,
        text: 'Powered by',
        companyLink: config.website,
      },
      starterPrompts: config.questions || [],
      quickActions: config.quickActions || [],
    },
  };
};

export const destroy = () => {
  elementUsed?.remove();
};

export const clearChat = (id?: string) => {
  document.dispatchEvent(new CustomEvent('flowise-clear-chat', id ? { detail: { id } } : undefined));
};

type Chatbot = {
  initFull: typeof initFull;
  init: typeof init;
  destroy: typeof destroy;
  clearChat: typeof clearChat;
};

declare const window:
  | {
      Chatbot: Chatbot | undefined;
    }
  | undefined;

export const parseChatbot = () => ({
  initFull,
  init,
  destroy,
  clearChat,
});

export const injectChatbotInWindow = (bot: Chatbot) => {
  if (typeof window === 'undefined') return;
  window.Chatbot = { ...bot };
};
