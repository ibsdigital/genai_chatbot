import { FileUpload, IAction } from '@/components/Bot';
import { sendRequest } from '@/utils/index';
import { handleApiError } from '@/utils/apiErrorHandler';
import { apiHost, tenantUuid } from '@/store/chatbotConfig';
import { getSessionStorageChatflow } from '@/utils';
export type IncomingInput = {
  question?: string;
  form?: Record<string, unknown>;
  uploads?: FileUpload[];
  overrideConfig?: Record<string, unknown>;
  socketIOClientId?: string;
  chatId?: string;
  fileName?: string; // Only for assistant
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

export const sendFeedbackQuery = ({ chatflowid, apiHost = 'http://localhost:3000', body, onRequest }: CreateFeedbackRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/feedback/${chatflowid}`,
    body,
    onRequest: onRequest,
  });

export const updateFeedbackQuery = ({ id, apiHost = 'http://localhost:3000', body, onRequest }: UpdateFeedbackRequest) =>
  sendRequest({
    method: 'PUT',
    url: `${apiHost}/api/v1/feedback/${id}`,
    body,
    onRequest: onRequest,
  });

export const sendMessageQuery = async ({ chatflowid, apiHost = 'http://localhost:3000', body, onRequest }: MessageRequest) => {
  const stored = chatflowid ? getSessionStorageChatflow(chatflowid) : {};
  const token = stored?.token || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { data, error } = await sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/respond`,
    body,
    headers,
    onRequest,
  });

  if (error) {
    let status, errorCode, errorMsg;
    if (typeof error === 'object' && error !== null) {
      status = (error as any).status;
      errorCode = (error as any).errorCode;
      errorMsg = (error as any).errorMsg || (error as any).message || String(error);
    } else {
      errorMsg = String(error);
    }

    // Handle API error and return wrapped error to caller
    handleApiError(status || 500, errorCode, errorMsg);
    return { error: { message: errorMsg, status, errorCode } };
  }

  return { data };
};

export const createAttachmentWithFormData = ({ chatflowid, apiHost = 'http://localhost:3000', formData, onRequest }: UpsertRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/attachments/${chatflowid}/${formData.get('chatId')}`,
    formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onRequest: onRequest,
  });

export const upsertVectorStoreWithFormData = ({ chatflowid, apiHost = 'http://localhost:3000', formData, onRequest }: UpsertRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/vector/upsert/${chatflowid}`,
    formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onRequest: onRequest,
  });

export const getChatbotConfig = ({ chatflowid, apiHost = 'http://localhost:3000', onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'GET',
    url: `${apiHost}/api/v1/public-chatbotConfig/${chatflowid}`,
    onRequest: onRequest,
  });

export const isStreamAvailableQuery = ({ chatflowid, apiHost = 'http://localhost:3000', onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'GET',
    url: `${apiHost}/api/v1/chatflows-streaming/${chatflowid}`,
    onRequest: onRequest,
  });

export const sendFileDownloadQuery = ({ apiHost = 'http://localhost:3000', body, onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/openai-assistants-file/download`,
    body,
    type: 'blob',
    onRequest: onRequest,
  });

// export const addLeadQuery = ({ apiHost = 'http://localhost:3000', body, onRequest }: LeadCaptureRequest) =>
//   sendRequest<any>({
//     method: 'POST',
//     url: `${apiHost}/api/v1/leads/`,
//     body,
//     onRequest: onRequest,
//   });

/* get token by email*/
export const submitMessageFeedbackQuery = async ({
  chatflowid,
  apiHost = 'http://localhost:3000',
  externalChatMsgId,
  body,
  onRequest,
}: SubmitMessageFeedbackRequest) => {
  // GET TOKEN FROM STORAGE (same logic as sendMessageQuery)
  const stored = chatflowid ? getSessionStorageChatflow(chatflowid) : {};
  const token = stored?.token || '';

  // BUILD HEADERS WITH AUTH
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // MAKE REQUEST
  return sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/respond/feedback/${externalChatMsgId}`,
    body,
    headers, // Includes Authorization if token exists
    onRequest,
  });
};

export async function fetchAuthToken(name: string, email: string, apiHost = 'http://localhost:3000') {
  const tenant_uuid = tenantUuid() || '';

  if (!email || !tenant_uuid || !apiHost) {
    throw new Error('Missing required parameters: email, tenant_uuid, or apiHost');
  }

  const url = `${apiHost.replace(/\/$/, '')}/api/v1/users/get-token`;

  const body = {
    name,
    email,
    tenant_external_uid: tenant_uuid,
  };

  const { data, error } = await sendRequest<{ token: string }>({
    url,
    method: 'POST',
    body,
  });

  if (error) {
    let status, errorCode, errorMsg;
    if (typeof error === 'object' && error !== null) {
      status = (error as any).status;
      errorCode = (error as any).errorCode;
      errorMsg = (error as any).errorMsg || (error as any).message || String(error);
    } else {
      errorMsg = String(error);
    }
    handleApiError(status || 500, errorCode, errorMsg);
    throw new Error(errorMsg);
  }

  if (!data || !data.token) {
    handleApiError(404, undefined, 'Auth token not found in response.');
    throw new Error('Auth token not found in response.');
  }

  return data.token;
}

export const generateTTSQuery = async ({ apiHost = 'http://localhost:3000', body, onRequest, signal }: GenerateTTSRequest): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const requestInfo: RequestInit = {
    method: 'POST',
    mode: 'cors',
    headers,
    body: JSON.stringify(body),
    signal,
  };

  if (onRequest) {
    await onRequest(requestInfo);
  }

  return fetch(`${apiHost}/api/v1/text-to-speech/generate`, requestInfo);
};

export const abortTTSQuery = ({ apiHost = 'http://localhost:3000', body, onRequest }: AbortTTSRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/text-to-speech/abort`,
    body,
    onRequest: onRequest,
  });

export type AbortMessageRequest = BaseRequest & {
  chatflowid: string;
  chatId: string;
};

export const abortMessageQuery = ({ chatflowid, apiHost = 'http://localhost:3000', chatId, onRequest }: AbortMessageRequest) =>
  sendRequest<any>({
    method: 'PUT',
    url: `${apiHost}/api/v1/chatmessage/abort/${chatflowid}/${chatId}`,
    onRequest: onRequest,
  });
