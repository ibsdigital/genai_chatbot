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

export type ChatImageUpload = {
  name: string;
  s3_key: string;
};

type ChatImageUploadUrl = {
  s3_key: string;
  upload_url: string;
  fields: Record<string, string>;
  mime: string;
};

type UploadChatImagesRequest = BaseRequest & {
  chatflowid?: string;
  images: { data: string; name: string; mime: string }[];
};

const dataUrlToBlob = (dataUrl: string, mime: string) => {
  const binary = atob(dataUrl.split(',', 2)[1] ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Claude downscales images past 1568px on the long side, so bigger ones only cost upload time.
const MAX_IMAGE_SIDE = 1568;
const SHRINK_ABOVE_BYTES = 1024 * 1024;

/**
 * Re-encodes a large image as a JPEG of at most MAX_IMAGE_SIDE; small images and GIFs are
 * sent as they are, so screenshots stay sharp. Any failure falls back to the original.
 */
const shrinkImage = async (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/gif') return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size <= SHRINK_ABOVE_BYTES) return blob;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return blob;
    // JPEG has no transparency: without this, transparent areas turn black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const shrunk = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return shrunk && shrunk.size < blob.size ? shrunk : blob;
  } catch {
    return blob;
  }
};

/**
 * Uploads the attached images straight to S3 and returns them as guided chat uploads.
 * The chat request then carries only the S3 keys: a base64 image in its body is blocked by the WAF.
 */
export const uploadChatImages = async ({
  chatflowid,
  apiHost = 'http://localhost:3000',
  images,
}: UploadChatImagesRequest): Promise<ChatImageUpload[]> => {
  const stored = chatflowid ? getSessionStorageChatflow(chatflowid) : {};
  const token = stored?.token || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const files = await Promise.all(
    images.map(async (image) => {
      // The backend accepts image/jpeg only; some browsers report .jpg files as image/jpg.
      const mime = image.mime === 'image/jpg' ? 'image/jpeg' : image.mime;
      const blob = await shrinkImage(dataUrlToBlob(image.data, mime));
      return { name: image.name, mime: blob.type, blob };
    }),
  );

  const { data, error } = await sendRequest<ChatImageUploadUrl[]>({
    method: 'POST',
    url: `${apiHost}/api/v1/respond/upload-url`,
    body: { files: files.map((file) => ({ name: file.name, mime: file.mime, size: file.blob.size })) },
    headers,
  });
  if (error || !data) {
    throw new Error((error as any)?.message || 'Unable to upload images. Please try again.');
  }

  await Promise.all(
    data.map(async (target, i) => {
      const failed = new Error(`Unable to upload ${files[i].name}. Please try again.`);
      // The signed fields go first: S3 ignores any field after the file.
      const form = new FormData();
      Object.entries(target.fields).forEach(([key, value]) => form.append(key, value));
      form.append('file', files[i].blob, files[i].name);
      // A network or CORS failure rejects with a bare "Failed to fetch".
      const response = await fetch(target.upload_url, { method: 'POST', body: form }).catch(() => {
        throw failed;
      });
      if (!response.ok) throw failed;
    }),
  );

  return data.map((target, i) => ({ name: files[i].name, s3_key: target.s3_key }));
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
