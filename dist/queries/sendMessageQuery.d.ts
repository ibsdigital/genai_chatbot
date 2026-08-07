import { FileUpload, IAction } from '@/components/Bot';
export type IncomingInput = {
    question?: string;
    form?: Record<string, unknown>;
    uploads?: FileUpload[];
    overrideConfig?: Record<string, unknown>;
    socketIOClientId?: string;
    chatId?: string;
    fileName?: string;
    leadEmail?: string;
    action?: IAction;
    humanInput?: Record<string, unknown>;
};
type BaseRequest = {
    apiHost?: string;
    tenant_uuid?: string;
    onRequest?: (request: RequestInit) => Promise<void>;
};
export type MessageRequest = BaseRequest & {
    chatflowid?: string;
    body?: IncomingInput;
};
export type FeedbackRatingType = 'THUMBS_UP' | 'THUMBS_DOWN';
export type FeedbackInput = {
    chatId: string;
    messageId: string;
    rating: FeedbackRatingType;
    content?: string;
};
export type CreateFeedbackRequest = BaseRequest & {
    chatflowid?: string;
    body?: FeedbackInput;
};
export type UpdateFeedbackRequest = BaseRequest & {
    id: string;
    body?: Partial<FeedbackInput>;
};
export type MessageFeedbackInput = {
    thumbs_up: boolean;
    thumbs_down: boolean;
    feedback: string;
    inaccurate?: boolean;
    inappropriate?: boolean;
    helpful?: boolean;
};
export type SubmitMessageFeedbackRequest = BaseRequest & {
    chatflowid: string;
    externalChatMsgId: string;
    body: MessageFeedbackInput;
};
export type UpsertRequest = BaseRequest & {
    chatflowid: string;
    apiHost?: string;
    tenant_uuid?: string;
    formData: FormData;
};
export type LeadCaptureInput = {
    chatflowid: string;
    chatId: string;
    name?: string;
    email?: string;
    consentCheckbox?: any;
};
export type LeadCaptureRequest = BaseRequest & {
    body: Partial<LeadCaptureInput>;
};
export type GenerateTTSRequest = BaseRequest & {
    body: {
        chatId: string;
        chatflowId: string;
        chatMessageId: string;
        text: string;
    };
    signal?: AbortSignal;
};
export type AbortTTSRequest = BaseRequest & {
    body: {
        chatflowId: string;
        chatId: string;
        chatMessageId: string;
    };
};
export declare const sendFeedbackQuery: ({ chatflowid, apiHost, body, onRequest }: CreateFeedbackRequest) => Promise<{
    data?: unknown;
    error?: Error | undefined;
}>;
export declare const updateFeedbackQuery: ({ id, apiHost, body, onRequest }: UpdateFeedbackRequest) => Promise<{
    data?: unknown;
    error?: Error | undefined;
}>;
export declare const sendMessageQuery: ({ chatflowid, apiHost, body, onRequest }: MessageRequest) => Promise<{
    error: {
        message: any;
        status: any;
        errorCode: any;
    };
    data?: undefined;
} | {
    data: any;
    error?: undefined;
}>;
export declare const createAttachmentWithFormData: ({ chatflowid, apiHost, formData, onRequest }: UpsertRequest) => Promise<{
    data?: unknown;
    error?: Error | undefined;
}>;
export declare const upsertVectorStoreWithFormData: ({ chatflowid, apiHost, formData, onRequest }: UpsertRequest) => Promise<{
    data?: unknown;
    error?: Error | undefined;
}>;
export declare const getChatbotConfig: ({ chatflowid, apiHost, onRequest }: MessageRequest) => Promise<{
    data?: any;
    error?: Error | undefined;
}>;
export declare const isStreamAvailableQuery: ({ chatflowid, apiHost, onRequest }: MessageRequest) => Promise<{
    data?: any;
    error?: Error | undefined;
}>;
export declare const sendFileDownloadQuery: ({ apiHost, body, onRequest }: MessageRequest) => Promise<{
    data?: any;
    error?: Error | undefined;
}>;
export declare const submitMessageFeedbackQuery: ({ chatflowid, apiHost, externalChatMsgId, body, onRequest, }: SubmitMessageFeedbackRequest) => Promise<{
    data?: unknown;
    error?: Error | undefined;
}>;
export declare function fetchAuthToken(name: string, email: string, apiHost?: string): Promise<string>;
export declare const generateTTSQuery: ({ apiHost, body, onRequest, signal }: GenerateTTSRequest) => Promise<Response>;
export declare const abortTTSQuery: ({ apiHost, body, onRequest }: AbortTTSRequest) => Promise<{
    data?: any;
    error?: Error | undefined;
}>;
export type AbortMessageRequest = BaseRequest & {
    chatflowid: string;
    chatId: string;
};
export declare const abortMessageQuery: ({ chatflowid, apiHost, chatId, onRequest }: AbortMessageRequest) => Promise<{
    data?: any;
    error?: Error | undefined;
}>;
export {};
//# sourceMappingURL=sendMessageQuery.d.ts.map