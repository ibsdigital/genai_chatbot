import { createSignal, createEffect, Show, onMount, For, onCleanup, createMemo } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { Marked } from '@ts-stack/markdown';
import {
  FeedbackRatingType,
  sendFeedbackQuery,
  sendFileDownloadQuery,
  updateFeedbackQuery,
  submitMessageFeedbackQuery,
} from '@/queries/sendMessageQuery';
import { FileUpload, IAction, MessageType } from '../Bot';
import { CopyToClipboardButton, ThumbsDownButton, ThumbsUpButton } from '../buttons/FeedbackButtons';
import { MeetingDetailsInline } from './MeetingDetailsInline';
import FeedbackContentDialog from '../FeedbackContentDialog';
import { AgentReasoningBubble } from './AgentReasoningBubble';
import { TickIcon, XIcon } from '../icons';
import { SourceBubble } from './SourceBubble';
import { DateTimeToggleTheme } from '@/features/bubble/types';
import { WorkflowTreeView } from '../treeview/WorkflowTreeView';
import { ThinkingCard } from './ThinkingBubble';
import { getCompanyConfig, CompanyConfig } from '@/window';
import { TTSButton } from '../buttons/TTSButton';
import DOMPurify from 'dompurify';

const receiveAudioUrl = '/assets/receive_message.mp3';

type Props = {
  message: MessageType;
  chatflowid: string;
  chatId: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  fileAnnotations?: any;
  showAvatar?: boolean;
  avatarSrc?: string;
  backgroundColor?: string;
  textColor?: string;
  chatFeedbackStatus?: boolean;
  fontSize?: number;
  feedbackColor?: string;
  isLoading: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  showAgentMessages?: boolean;
  sourceDocsTitle?: string;
  hideSources?: boolean;
  renderHTML?: boolean;
  shouldStream?: boolean;
  isWelcomeMessage?: boolean;
  isFirstMessage?: boolean;
  handleActionClick: (elem: any, action: IAction | undefined | null) => void;
  handleSourceDocumentsClick: (src: any) => void;
  // TTS props
  isTTSEnabled?: boolean;
  isTTSLoading?: Record<string, boolean>;
  isTTSPlaying?: Record<string, boolean>;
  handleTTSClick?: (messageId: string, messageText: string) => void;
  handleTTSStop?: (messageId: string) => void;
  hasCustomHeader?: boolean;
  dialogContainer?: HTMLElement;
};

const defaultBackgroundColor = '#f7f8ff';
const defaultTextColor = '#303235';
const defaultFontSize = 16;
const defaultFeedbackColor = '#FB8105';

export const BotBubble = (props: Props) => {
  let botDetailsEl: HTMLDetailsElement | undefined;

  Marked.setOptions({
    isNoP: true,
    sanitize: props.renderHTML !== undefined ? !props.renderHTML : true,
  });

  // Reactive config signal with proper typing
  const [config, setConfig] = createSignal<CompanyConfig | null>(null);

  // Load config reactively
  createEffect(() => {
    const loadedConfig = getCompanyConfig();
    setConfig(loadedConfig);
  });

  // Computed colors that react to config changes
  const backgroundColor = createMemo(() => {
    const currentConfig = config();
    const bgColor = props.backgroundColor ?? currentConfig?.colors?.botMessageBackgroundColor ?? defaultBackgroundColor;
    return bgColor;
  });

  const textColor = createMemo(() => {
    const currentConfig = config();
    const txtColor = props.textColor ?? currentConfig?.colors?.botMessageTextColor ?? defaultTextColor;
    return txtColor;
  });

  // Primary color from config for meeting details theming
  const colors = createMemo(() => {
    const currentConfig = config();
    return currentConfig?.colors;
  });

  const [rating, setRating] = createSignal('');
  const [feedbackId, setFeedbackId] = createSignal('');
  const [showFeedbackContentDialog, setShowFeedbackContentModal] = createSignal(false);
  const [copiedMessage, setCopiedMessage] = createSignal(false);
  const [thumbsUpColor, setThumbsUpColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor);
  const [thumbsDownColor, setThumbsDownColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor);

  // Meeting details state
  const [showMeetingDetails, setShowMeetingDetails] = createSignal(false);

  // Streaming state, ref, and "has streamed" per bubble
  const [streamedText, setStreamedText] = createSignal('');
  const [botMsgRef, setBotMsgRef] = createSignal<HTMLSpanElement | null>(null);
  const [hasStreamed, setHasStreamed] = createSignal(false);

  const uniqueKey = props.message?.messageId || props.message?.id || props.message?.dateTime || Math.random().toString(32).slice(2);

  // Simple scroll function for the chat container
  const scrollToBottomOfChat = () => {
    const chatContainer = document.querySelector('.chatbot-chat-view');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // === Enhanced streaming effect with container-aware scrolling ===
  createEffect(() => {
    const fullText = props.message.message || '';
    if (!props.shouldStream || hasStreamed()) {
      setStreamedText(fullText);
      setHasStreamed(true);
      return;
    }
    setStreamedText('');
    const words = fullText.split(/(\s+)/);
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setStreamedText(words.slice(0, i).join(''));

      // Simple scroll during streaming - reduced frequency
      const el = botMsgRef();
      if (el && props.shouldStream && !hasStreamed()) {
        if (i % 8 === 0 || i >= words.length) {
          // Every 8 words instead of 5
          scrollToBottomOfChat();
        }
      }

      if (i >= words.length) {
        clearInterval(interval);
        setHasStreamed(true);
      }
    }, 8);
    onCleanup(() => clearInterval(interval));
  });

  // Simple auto-scroll when sources appear
  createEffect(() => {
    if (props.message.sourceDocuments && props.message.sourceDocuments.length > 0 && hasStreamed()) {
      // Small delay to ensure sources are rendered
      setTimeout(() => {
        scrollToBottomOfChat();
      }, 150);
    }
  });

  // --- Markdown rendering and styling with config colors + MEETING DETAILS INJECTION ---
  createEffect(() => {
    const el = botMsgRef();
    if (!el) return;

    // Parse the markdown content
    el.innerHTML = DOMPurify.sanitize(Marked.parse(streamedText() || ''));

    // Use reactive text color
    const currentTextColor = textColor();
    el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
      (element as HTMLElement).style.color = currentTextColor;
    });
    el.querySelectorAll('pre').forEach((element) => {
      (element as HTMLElement).style.color = '#FFFFFF';
      element.querySelectorAll('code').forEach((codeElement) => {
        (codeElement as HTMLElement).style.color = '#FFFFFF';
      });
    });
    el.querySelectorAll('code:not(pre code)').forEach((element) => {
      (element as HTMLElement).style.color = '#4CAF50';
    });
    el.querySelectorAll('a').forEach((link) => {
      link.target = '_blank';
    });

    // NEW: Inject meeting details inline if meeting data exists and message contains success text
    const messageText = streamedText() || '';
    const hasMeetingSuccessMessage =
      messageText.toLowerCase().includes('meeting has been scheduled') ||
      messageText.toLowerCase().includes('meeting scheduled') ||
      messageText.toLowerCase().includes('appointment confirmed') ||
      messageText.toLowerCase().includes('meeting invite');

    if (props.message.meetingData && hasMeetingSuccessMessage && hasStreamed()) {
      // Check if meeting details are already injected to avoid duplicates
      if (!el.querySelector('[data-meeting-details]')) {
        // Create a container for the SolidJS component
        const meetingContainer = document.createElement('div');
        meetingContainer.setAttribute('data-meeting-details', 'true');

        // Create a placeholder that will be replaced by our SolidJS component
        meetingContainer.innerHTML = `
          <div id="meeting-details-${props.message.messageId || Math.random().toString(36).substr(2, 9)}"></div>
        `;

        el.appendChild(meetingContainer);

        // Render the SolidJS component into the placeholder
        import('solid-js/web').then(({ render }) => {
          const placeholder = meetingContainer.querySelector('div');
          if (placeholder) {
            render(
              () => (
                <MeetingDetailsInline
                  meetingData={props.message.meetingData}
                  primaryColor={colors()?.primary}
                  botMessageBackgroundColor={colors()?.botMessageBackgroundColor}
                  botMessageTextColor={colors()?.botMessageTextColor}
                />
              ),
              placeholder,
            );
          }
        });
      }
    }

    // Handle file annotations (existing code)
    if (props.fileAnnotations && props.fileAnnotations.length) {
      for (const annotations of props.fileAnnotations) {
        if (el.querySelector(`button[data-name="${annotations.fileName}"]`)) continue;
        const button = document.createElement('button');
        button.setAttribute('data-name', annotations.fileName);
        button.textContent = annotations.fileName;
        button.className =
          'py-2 px-4 mb-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 file-annotation-button';
        button.addEventListener('click', function () {
          downloadFile(annotations);
        });
        const svgContainer = document.createElement('div');
        svgContainer.className = 'ml-2';
        svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-download" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`;
        button.appendChild(svgContainer);
        el.appendChild(button);
      }
    }
  });

  // DOWNLOAD helper
  const downloadFile = async (fileAnnotation: any) => {
    try {
      const response = await sendFileDownloadQuery({
        apiHost: props.apiHost,
        body: { fileName: fileAnnotation.fileName, chatflowId: props.chatflowid, chatId: props.chatId } as any,
        onRequest: props.onRequest,
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileAnnotation.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // COPY TO CLIPBOARD functionality
  const copyMessageToClipboard = async () => {
    try {
      const text = botMsgRef()?.textContent || props.message.message || '';
      await navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const saveToSessionStorage = (rating: FeedbackRatingType) => {
    const chatDetails = sessionStorage.getItem(`${props.chatflowid}_EXTERNAL`);
    if (!chatDetails) return;
    try {
      const parsedDetails = JSON.parse(chatDetails);
      const messages: MessageType[] = parsedDetails.chatHistory || [];
      const message = messages.find((msg) => msg.messageId === props.message.messageId);
      if (!message) return;
      message.rating = rating;
      sessionStorage.setItem(`${props.chatflowid}_EXTERNAL`, JSON.stringify({ ...parsedDetails, chatHistory: messages }));
    } catch (e) {
      return;
    }
  };

  const isValidURL = (url: string): URL | undefined => {
    try {
      return new URL(url);
    } catch {
      return undefined;
    }
  };

  // FIXED: Properly handle nested array structure from API
  const removeDuplicateURL = (message: MessageType) => {
    const visitedURLs: string[] = [];
    const newSourceDocuments: any[] = [];
    (message.sourceDocuments || []).forEach((arr: any) => {
      // Correctly extract document from nested array structure
      const doc = Array.isArray(arr) ? arr[0] : arr; // Get first element if it's an array
      if (!doc || !doc.metadata || !doc.metadata.source) return;

      if (isValidURL(doc.metadata.source) && !visitedURLs.includes(doc.metadata.source)) {
        visitedURLs.push(doc.metadata.source);
        newSourceDocuments.push(doc);
      } else if (!isValidURL(doc.metadata.source)) {
        newSourceDocuments.push(doc);
      }
    });
    return newSourceDocuments;
  };

  const onThumbsUpClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_UP' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });
      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_UP');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        setThumbsUpColor('#006400');
        saveToSessionStorage('THUMBS_UP');
      }
    }
  };

  const onThumbsDownClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_DOWN' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });
      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_DOWN');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        setThumbsDownColor('#8B0000');
        saveToSessionStorage('THUMBS_DOWN');
      }
    }
  };

  const submitFeedbackContent = async (text: string) => {
    try {
      // Prepare payload matching your API spec
      const payload = {
        thumbs_up: rating() === 'THUMBS_UP',
        thumbs_down: rating() === 'THUMBS_DOWN',
        feedback: text,
        inaccurate: false, // You can enhance this later
        inappropriate: false, // e.g., add checkboxes in dialog
        helpful: false, // or remove if not used
      };

      // Extract external_chat_msg_id safely
      const externalChatMsgId = props.message.external_chat_msg_id;

      if (!externalChatMsgId) {
        console.error('Missing external_chat_msg_id for feedback submission');
        alert('Unable to submit feedback: message identifier missing.');
        return;
      }

      await submitMessageFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        externalChatMsgId: externalChatMsgId,
        body: payload,
        onRequest: props.onRequest,
      });

      // Close dialog + reset
      setShowFeedbackContentModal(false);
      setFeedbackId('');

      // Optional: Visual confirmation
      if (rating() === 'THUMBS_UP') {
        setThumbsUpColor('#006400'); // dark green
      } else if (rating() === 'THUMBS_DOWN') {
        setThumbsDownColor('#8B0000'); // dark red
      }

      // Optional: Save to sessionStorage (if you want local persistence)
      saveToSessionStorage(rating() as FeedbackRatingType);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  // Play receive sound when component mounts (SOLIDJS SAFETY)
  onMount(() => {
    // Only play sound if we're not in a loading state
    if (!props.isLoading) {
      const receiveSound = new Audio(receiveAudioUrl);
      receiveSound.play().catch((e) => console.error('Error playing receive sound:', e));
    }
  });

  onMount(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    }
  });

  createEffect(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    } else if (botDetailsEl && !props.isLoading) {
      botDetailsEl.open = false;
    }
  });

  const renderArtifacts = (item: Partial<FileUpload>) => {
    const setArtifactRef = (el: HTMLSpanElement) => {
      if (el) {
        const currentTextColor = textColor();
        el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
          (element as HTMLElement).style.color = currentTextColor;
        });
        el.querySelectorAll('pre').forEach((element) => {
          (element as HTMLElement).style.color = '#FFFFFF';
          element.querySelectorAll('code').forEach((codeElement) => {
            (codeElement as HTMLElement).style.color = '#FFFFFF';
          });
        });
        el.querySelectorAll('code:not(pre code)').forEach((element) => {
          (element as HTMLElement).style.color = '#4CAF50';
        });
        el.querySelectorAll('a').forEach((link) => {
          link.target = '_blank';
        });
      }
    };

    return (
      <>
        <Show when={item.type === 'png' || item.type === 'jpeg'}>
          <div class="flex items-center justify-center p-0 m-0">
            <img
              class="w-full h-full bg-cover"
              src={(() => {
                const isFileStorage = typeof item.data === 'string' && item.data.startsWith('FILE-STORAGE::');
                return isFileStorage
                  ? `${props.apiHost}/api/v1/get-upload-file?chatflowId=${props.chatflowid}&chatId=${props.chatId}&fileName=${(
                      item.data as string
                    ).replace('FILE-STORAGE::', '')}`
                  : (item.data as string);
              })()}
            />
          </div>
        </Show>
        <Show when={item.type === 'html'}>
          <div class="mt-2">
            <div innerHTML={DOMPurify.sanitize(item.data as string)} />
          </div>
        </Show>
        <Show when={item.type !== 'png' && item.type !== 'jpeg' && item.type !== 'html'}>
          <span
            ref={setArtifactRef}
            innerHTML={Marked.parse(item.data as string)}
            class="prose"
            style={{
              'background-color': backgroundColor(),
              color: textColor(),
              'border-radius': '6px',
              'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
            }}
          />
        </Show>
      </>
    );
  };

  const formatDateTime = (dateTimeString: string | undefined, showDate: boolean | undefined, showTime: boolean | undefined) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date string:', dateTimeString);
        return '';
      }
      let formatted = '';
      if (showDate) {
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const [{ value: month }, , { value: day }, , { value: year }] = dateFormatter.formatToParts(date);
        formatted = `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}, ${year}`;
      }
      if (showTime) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const timeString = timeFormatter.format(date).toLowerCase();
        formatted = formatted ? `${formatted}, ${timeString}` : timeString;
      }
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // === MAIN RENDER ===
  return (
    <div>
      <div class="flex flex-row justify-start mb-2 items-start host-container" style={{ 'margin-right': '50px' }}>
        <Show when={props.showAvatar}>
          <Avatar initialAvatarSrc={props.avatarSrc} />
        </Show>
        <div class="flex flex-col justify-start">
          {props.showAgentMessages &&
            props.message.agentFlowExecutedData &&
            Array.isArray(props.message.agentFlowExecutedData) &&
            props.message.agentFlowExecutedData.length > 0 && (
              <div>
                <WorkflowTreeView
                  workflowData={props.message.agentFlowExecutedData}
                  indentationLevel={24}
                  apiHost={props.apiHost}
                  chatflowid={props.chatflowid}
                  chatId={props.chatId}
                  hasCustomHeader={props.hasCustomHeader}
                  dialogContainer={props.dialogContainer}
                />
              </div>
            )}
          {props.showAgentMessages && props.message.agentReasoning && (
            <details ref={botDetailsEl} class="mb-2 px-4 py-2 ml-2 chatbot-host-bubble rounded-[6px]">
              <summary class="cursor-pointer">
                <span class="italic">Agent Messages</span>
              </summary>
              <br />
              <For each={props.message.agentReasoning}>
                {(agent) => {
                  const agentMessages = agent.messages ?? [];
                  let msgContent: string = agent.instructions || (agentMessages.length > 1 ? agentMessages.join('\n') : (agentMessages[0] ?? ''));
                  if (agentMessages.length === 0 && !agent.instructions) msgContent = `<p>Finished</p>`;
                  return (
                    <AgentReasoningBubble
                      agentName={agent.agentName ?? ''}
                      agentMessage={msgContent}
                      agentArtifacts={agent.artifacts}
                      backgroundColor={backgroundColor()}
                      textColor={textColor()}
                      fontSize={props.fontSize}
                      apiHost={props.apiHost}
                      chatflowid={props.chatflowid}
                      chatId={props.chatId}
                      renderHTML={props.renderHTML}
                    />
                  );
                }}
              </For>
            </details>
          )}
          {props.message.artifacts && props.message.artifacts.length > 0 && (
            <div class="flex flex-row items-start flex-wrap w-full gap-2">
              <For each={props.message.artifacts}>{(item) => (item !== null ? <>{renderArtifacts(item)}</> : null)}</For>
            </div>
          )}
          {props.message.thinking && (
            <div class="ml-2 mb-1 max-w-full">
              <ThinkingCard
                thinking={props.message.thinking}
                thinkingDuration={props.message.thinkingDuration}
                isThinking={props.message.isThinking}
                backgroundColor={backgroundColor() ?? defaultBackgroundColor}
                textColor={textColor() ?? defaultTextColor}
              />
            </div>
          )}
          <div class="flex flex-col items-start">
            {props.message.message && (
              <span
                ref={setBotMsgRef}
                class="px-4 py-2 ml-2 max-w-full chatbot-host-bubble prose"
                data-testid="host-bubble"
                style={{
                  'background-color': backgroundColor(),
                  color: textColor(),
                  'border-radius': '6px',
                  'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
                }}
              />
            )}

            <div class="flex items-center gap-1 mt-1 ml-2">
              <Show when={!props.isWelcomeMessage && !props.isFirstMessage}>
                <Show when={props.isTTSEnabled && (props.message.id || props.message.messageId)}>
                  <TTSButton
                    feedbackColor={props.feedbackColor}
                    isLoading={(() => {
                      const messageId = props.message.id || props.message.messageId;
                      return !!(messageId && props.isTTSLoading?.[messageId]);
                    })()}
                    isPlaying={(() => {
                      const messageId = props.message.id || props.message.messageId;
                      return !!(messageId && props.isTTSPlaying?.[messageId]);
                    })()}
                    onClick={() => {
                      const messageId = props.message.id || props.message.messageId;
                      if (!messageId) return;
                      const messageText = props.message.message || '';
                      if (props.isTTSLoading?.[messageId]) return;
                      if (props.isTTSPlaying?.[messageId]) {
                        props.handleTTSStop?.(messageId);
                      } else {
                        props.handleTTSClick?.(messageId, messageText);
                      }
                    }}
                  />
                </Show>
                <CopyToClipboardButton
                  feedbackColor={props.feedbackColor}
                  onClick={copyMessageToClipboard}
                  class="!p-1 !min-w-[24px] !min-h-[24px]"
                />
                <div
                  class={`transition-all duration-300 ${copiedMessage() ? 'w-16 opacity-100' : 'w-0 opacity-0'} overflow-hidden whitespace-nowrap`}
                >
                  <span class="text-xs text-green-600 font-medium ml-1">Copied!</span>
                </div>
                <ThumbsUpButton
                  feedbackColor={thumbsUpColor()}
                  isDisabled={false}
                  rating={rating()}
                  onClick={() => {
                    setRating('THUMBS_UP');
                    setShowFeedbackContentModal(true);
                  }}
                  class="!p-1 !min-w-[24px] !min-h-[24px]"
                />
                <ThumbsDownButton
                  feedbackColor={thumbsDownColor()}
                  isDisabled={false}
                  rating={rating()}
                  onClick={() => {
                    setRating('THUMBS_DOWN');
                    setShowFeedbackContentModal(true);
                  }}
                  class="!p-1 !min-w-[24px] !min-h-[24px]"
                />
              </Show>
            </div>
          </div>

          {/* Sources - Show automatically when available AND streaming is complete */}
          <Show when={!props.hideSources && props.message.sourceDocuments && props.message.sourceDocuments.length > 0 && hasStreamed()}>
            <div class="mt-1 mb-2 ml-2" data-sources-container={props.message.messageId || uniqueKey}>
              <Show when={props.sourceDocsTitle}>
                <span class="px-2 py-1 font-semibold text-sm text-gray-600">{props.sourceDocsTitle}</span>
              </Show>
              <div
                class="source-docs-container"
                style={{
                  display: 'flex',
                  'flex-direction': 'row',
                  width: '100%',
                  'flex-wrap': 'wrap',
                  gap: '6px',
                  'margin-top': '4px',
                }}
              >
                <For each={removeDuplicateURL(props.message)}>
                  {(doc) => {
                    if (!doc || !doc.metadata || !doc.metadata.source) return null;
                    const URL = isValidURL(doc.metadata.source);
                    return (
                      <div
                        style={{
                          'font-size': '11px',
                          padding: '3px 6px',
                          'background-color': '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          'border-radius': '6px',
                          cursor: 'pointer',
                          'max-width': '180px',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          color: '#475569',
                          transition: 'background-color 0.2s ease',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '3px',
                        }}
                        onClick={() => {
                          if (URL) {
                            window.open(doc.metadata.source, '_blank');
                          } else {
                            props.handleSourceDocumentsClick(doc);
                          }
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = '#e2e8f0';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = '#f1f5f9';
                        }}
                      >
                        <span style={{ 'font-size': '9px', 'line-height': '1' }}>🔗</span>
                        <span style={{ 'line-height': '1' }}>
                          {(() => {
                            const source = doc.metadata.source;
                            if (doc.metadata.title) {
                              return doc.metadata.title;
                            }
                            if (source.startsWith('http')) {
                              try {
                                return new window.URL(source).hostname.replace('www.', '');
                              } catch {
                                return source;
                              }
                            }
                            if (source.includes('/')) {
                              const fileName = source.split('/').pop() || '';
                              return fileName.replace(/\.[^/.]+$/, '');
                            }

                            return source;
                          })()}
                        </span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          {props.message.action && (
            <div class="px-4 py-2 flex flex-row justify-start space-x-2">
              <For each={props.message.action.elements || []}>
                {(action) => {
                  return (
                    <>
                      {(action.type === 'approve-button' && action.label === 'Yes') || action.type === 'agentflowv2-approve-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-green-600 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <TickIcon />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (action.type === 'reject-button' && action.label === 'No') || action.type === 'agentflowv2-reject-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-red-600 border border-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <XIcon isCurrentColor={true} />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (
                        <button type="button">{action.label}</button>
                      )}
                    </>
                  );
                }}
              </For>
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK, DATE, ETC. */}
      <div>
        <Show when={showFeedbackContentDialog()}>
          <FeedbackContentDialog
            isOpen={showFeedbackContentDialog()}
            onClose={() => setShowFeedbackContentModal(false)}
            onSubmit={submitFeedbackContent}
            backgroundColor={backgroundColor()}
            textColor={textColor()}
            primaryColor={colors()?.primary}
          />
        </Show>

        {/* OPTIONAL: Keep old feedback UI (below message) if chatFeedbackStatus is true */}
        <Show when={props.chatFeedbackStatus && props.message.messageId && !props.isFirstMessage}>
          <div class={`flex items-center px-2 pb-2 ${props.showAvatar ? 'ml-10' : ''}`}>
            {rating() === '' && (
              <>
                <ThumbsUpButton feedbackColor={thumbsUpColor()} onClick={onThumbsUpClick} class="!p-1 !min-w-[24px] !min-h-[24px]" />
                <ThumbsDownButton feedbackColor={thumbsDownColor()} onClick={onThumbsDownClick} class="!p-1 !min-w-[24px] !min-h-[24px]" />
              </>
            )}
            <Show when={props.message.dateTime}>
              <div class="text-sm text-gray-500 ml-2">
                {formatDateTime(props.message.dateTime, props?.dateTimeToggle?.date, props?.dateTimeToggle?.time)}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};
