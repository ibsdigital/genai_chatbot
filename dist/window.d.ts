import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';
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
export declare function getCompanyConfig(): CompanyConfig | null;
export declare function setCompanyConfigStore(config: CompanyConfig): void;
export declare function fetchAndInitCompanyConfig(apiHost?: string, tenant_uuid?: string): Promise<void>;
type BotProps = {
    chatflowid: string;
    apiHost?: string;
    tenant_uuid?: string;
    onRequest?: (request: RequestInit) => Promise<void>;
    chatflowConfig?: Record<string, unknown>;
    observersConfig?: observersConfigType;
    theme?: BubbleTheme;
};
export declare const initFull: (props: BotProps & {
    id?: string;
}) => Promise<void>;
export declare const init: (props: BotProps) => Promise<void>;
export declare const destroy: () => void;
export declare const clearChat: (id?: string) => void;
type Chatbot = {
    initFull: typeof initFull;
    init: typeof init;
    destroy: typeof destroy;
    clearChat: typeof clearChat;
};
export declare const parseChatbot: () => {
    initFull: (props: BotProps & {
        id?: string;
    }) => Promise<void>;
    init: (props: BotProps) => Promise<void>;
    destroy: () => void;
    clearChat: (id?: string) => void;
};
export declare const injectChatbotInWindow: (bot: Chatbot) => void;
export {};
//# sourceMappingURL=window.d.ts.map