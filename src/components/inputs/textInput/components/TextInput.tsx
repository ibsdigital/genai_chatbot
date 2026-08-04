import { ShortTextInput } from './ShortTextInput';
import { isMobile } from '@/utils/isMobileSignal';
import { Show, createSignal, createEffect, onMount, Setter } from 'solid-js';
import { SendButton } from '@/components/buttons/SendButton';
import { FileEvent, UploadsConfig } from '@/components/Bot';
import { ImageUploadButton } from '@/components/buttons/ImageUploadButton';
import { RecordAudioButton } from '@/components/buttons/RecordAudioButton';
import { AttachmentUploadButton } from '@/components/buttons/AttachmentUploadButton';
import { ChatInputHistory } from '@/utils/chatInputHistory';
import {
  audioRecorder,
  startAudioRecording,
  stopAudioRecording,
  cancelAudioRecording,
  getElaspedTime,
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  stopSpeechRecognition,
} from '../../../../utils/audioRecording'; // adjust the path as needed
import { StopButton } from '@/components/buttons/StopButton';

type TextInputProps = {
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  sendButtonColor?: string;
  inputValue: string;
  fontSize?: number;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onInputChange: (value: string) => void;
  uploadsConfig?: Partial<UploadsConfig>;
  isFullFileUpload?: boolean;
  setPreviews: Setter<unknown[]>;
  onMicrophoneClicked: () => void;
  handleFileChange: (event: FileEvent<HTMLInputElement>) => void;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
  sendMessageSound?: boolean;
  sendSoundLocation?: string;
  fullFileUploadAllowedTypes?: string;
  enableInputHistory?: boolean;
  maxHistorySize?: number;
  isLoading?: boolean;
  showAbortButton?: boolean;
  isMessageStopping?: boolean;
  onAbort?: () => void;
};

const defaultBackgroundColor = '#ffffff';
const defaultTextColor = '#303235';
const defaultSendSound = 'https://cdn.jsdelivr.net/gh/FlowiseAI/FlowiseChatEmbed@latest/src/assets/send_message.mp3';

export const TextInput = (props: TextInputProps) => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');
  const [inputHistory] = createSignal(new ChatInputHistory(() => props.maxHistorySize || 10));
  const [isRecording, setIsRecording] = createSignal(false);
  const [elapsedTime, setElapsedTime] = createSignal('00:00');
  const [unsupportedBrowser, setUnsupportedBrowser] = createSignal(false);

  // Speech-to-Text
  const [speechError, setSpeechError] = createSignal('');
  const [isSpeechRecording, setIsSpeechRecording] = createSignal(false);

  let inputRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let fileUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let imgUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let audioRef: HTMLAudioElement | undefined;

  const handleInput = (inputValue: string) => {
    const wordCount = inputValue.length;
    if (props.maxChars && wordCount > props.maxChars) {
      setWarningMessage(props.maxCharsWarningMessage ?? `You exceeded the characters limit. Please input less than ${props.maxChars} characters.`);
      setIsSendButtonDisabled(true);
      return;
    }
    props.onInputChange(inputValue);
    setWarningMessage('');
    setIsSendButtonDisabled(false);
  };

  const checkIfInputIsValid = () => warningMessage() === '' && inputRef?.reportValidity();

  const submit = () => {
    if (checkIfInputIsValid()) {
      if (props.enableInputHistory) {
        inputHistory().addToHistory(props.inputValue);
      }
      props.onSubmit(props.inputValue);
      if (props.sendMessageSound && audioRef) {
        audioRef.play();
      }
    }
  };

  // --- Speech-to-Text Handlers ---
  const handleStartSpeechToText = () => {
    if (!isSpeechRecognitionSupported()) {
      setSpeechError('This Feature works only on Chrome.');
      return;
    }
    setSpeechError('');
    setIsSpeechRecording(true);
    startSpeechRecognition({
      onResult: (text) => {
        props.onInputChange(text);
        setIsSpeechRecording(false);
      },
      onStart: () => setIsSpeechRecording(true),
      onEnd: () => setIsSpeechRecording(false),
      onError: (err) => {
        setSpeechError('Speech recognition error: ' + err);
        setIsSpeechRecording(false);
      },
    });
  };

  const handleStopSpeechToText = () => {
    stopSpeechRecognition();
    setIsSpeechRecording(false);
  };

  // --- File/Image Upload ---
  const handleImageUploadClick = () => {
    if (imgUploadRef) imgUploadRef.click();
  };
  const handleFileUploadClick = () => {
    if (fileUploadRef) fileUploadRef.click();
  };
  const handleFileChange = (event: FileEvent<HTMLInputElement>) => {
    props.handleFileChange(event);
    if (event.target) event.target.value = '';
  };
  const getFileType = () => {
    if (props.isFullFileUpload) return props.fullFileUploadAllowedTypes === '' ? '*' : props.fullFileUploadAllowedTypes;
    if (props.uploadsConfig?.fileUploadSizeAndTypes?.length) {
      const allowedFileTypes = props.uploadsConfig?.fileUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',');
      if (allowedFileTypes.includes('*')) return '*';
      else return allowedFileTypes;
    }
    return '*';
  };

  const handlePaste = (e: ClipboardEvent) => {
    console.log('[DEBUG] uploadsConfig:', props.uploadsConfig, 'isFullFileUpload:', props.isFullFileUpload);
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (
      imageFiles.length > 0 &&
      (props.uploadsConfig?.isImageUploadAllowed || props.uploadsConfig?.isRAGFileUploadAllowed || props.isFullFileUpload)
    ) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      const timestamp = Date.now();
      imageFiles.forEach((file, index) => {
        const ext = file.name.split('.').pop() || 'png';
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const uniqueName = `${baseName}_${timestamp}_${index}.${ext}`;
        const renamedFile = new File([file], uniqueName, { type: file.type });
        dataTransfer.items.add(renamedFile);
      });
      const syntheticEvent = { target: { files: dataTransfer.files } } as FileEvent<HTMLInputElement>;
      props.handleFileChange(syntheticEvent);
    }
  };

  // --- Keyboard/Focus ---
  const handleKeyDown = (e: KeyboardEvent) => {
    // console.log('[DEBUG] handleKeyDown fired, key:', e.key, 'enableInputHistory:', props.enableInputHistory);
    if (e.key === 'Enter' && !e.shiftKey) {
      const isIMEComposition = e.isComposing || e.keyCode === 229;
      if (!isIMEComposition) {
        e.preventDefault();
        submit();
      }
    } else if (props.enableInputHistory ?? true) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const previousInput = inputHistory().getPreviousInput(props.inputValue);
        props.onInputChange(previousInput);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInput = inputHistory().getNextInput();
        props.onInputChange(nextInput);
      }
    }
  };

  createEffect(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;
    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();
  });

  onMount(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;
    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();
    if (props.sendMessageSound) {
      if (props.sendSoundLocation) {
        audioRef = new Audio(props.sendSoundLocation);
      } else {
        audioRef = new Audio(defaultSendSound);
      }
    }
  });

  // --- UI Render ---
  return (
    <div
      class="w-full h-auto max-h-[192px] min-h-[56px] flex flex-col items-end justify-between chatbot-input"
      data-testid="input"
      style={{
        margin: 'auto',
        'background-color': props.backgroundColor ?? defaultBackgroundColor,
        color: props.textColor ?? defaultTextColor,
        border: `1px solid ${props.sendButtonColor ?? '#FB8105'}`,
      }}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    >
      <Show when={warningMessage() !== ''}>
        <div class="w-full px-4 pt-4 pb-1 text-red-500 text-sm" data-testid="warning-message">
          {warningMessage()}
        </div>
      </Show>
      <Show when={speechError()}>
        <div class="w-full px-4 pt-4 pb-1 text-red-500 text-sm">{speechError()}</div>
      </Show>
      <div class="w-full flex items-end justify-between">
        {props.uploadsConfig?.isImageUploadAllowed ? (
          <>
            <ImageUploadButton
              buttonColor={props.sendButtonColor}
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              onClick={handleImageUploadClick}
            >
              <span style={{ 'font-family': 'Poppins, sans-serif' }}>Image Upload</span>
            </ImageUploadButton>
            <input
              style={{ display: 'none' }}
              multiple
              ref={imgUploadRef as HTMLInputElement}
              type="file"
              onChange={handleFileChange}
              accept={
                props.uploadsConfig?.imgUploadSizeAndTypes?.length
                  ? props.uploadsConfig?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',')
                  : '*'
              }
            />
          </>
        ) : null}
        {props.uploadsConfig?.isRAGFileUploadAllowed || props.isFullFileUpload ? (
          <>
            <AttachmentUploadButton
              buttonColor={props.sendButtonColor}
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              onClick={handleFileUploadClick}
            >
              <span style={{ 'font-family': 'Poppins, sans-serif' }}>File Upload</span>
            </AttachmentUploadButton>
            <input
              style={{ display: 'none' }}
              multiple
              ref={fileUploadRef as HTMLInputElement}
              type="file"
              onChange={handleFileChange}
              accept={getFileType()}
            />
          </>
        ) : null}
        <ShortTextInput
          ref={inputRef as HTMLTextAreaElement}
          onInput={handleInput}
          value={props.inputValue}
          fontSize={props.fontSize}
          disabled={props.disabled || isSpeechRecording()}
          placeholder={props.placeholder ?? 'Type your question'}
        />
        {/* Speech-to-Text Button */}
        <RecordAudioButton
          buttonColor={props.sendButtonColor}
          isDisabled={false}
          isRecording={isSpeechRecording()}
          onClick={() => {
            if (!isSpeechRecording()) {
              handleStartSpeechToText();
            } else {
              handleStopSpeechToText();
            }
          }}
        >
          {/* {isSpeechRecording() ? `${elapsedTime()}` : ''} */}
        </RecordAudioButton>
        <Show
          when={props.showAbortButton}
          fallback={
            <SendButton
              sendButtonColor={props.sendButtonColor}
              type="button"
              isDisabled={props.disabled || isSendButtonDisabled()}
              class="m-0 h-[60px] flex items-center justify-center"
              onClick={submit}
            >
              {/* <span style={{ 'font-family': 'Poppins, sans-serif' }}>Send</span> */}
            </SendButton>
          }
        >
          <StopButton
            sendButtonColor={props.sendButtonColor}
            type="button"
            isDisabled={props.isMessageStopping}
            class="m-0 h-14 flex items-center justify-center"
            onclick={() => props.onAbort?.()}
            isStopping={props.isMessageStopping}
          />
        </Show>
      </div>
    </div>
  );
};
