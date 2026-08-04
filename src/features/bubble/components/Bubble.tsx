import { createSignal, Show, splitProps, onCleanup, createEffect, onMount } from 'solid-js';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';
import DOMPurify from 'dompurify';

const defaultButtonColor = '#3B81F6';
const defaultIconColor = '#000000';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps) => {
  const [bubbleProps] = splitProps(props, ['theme']);
  const [bubbleContainerRef, setBubbleContainerRef] = createSignal<HTMLDivElement | undefined>(undefined);
  const hasWindow = typeof window !== 'undefined';

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isFullScreen, setIsFullScreen] = createSignal(true);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  const [viewport, setViewport] = createSignal({
    height: hasWindow ? window.innerHeight : 0,
    width: hasWindow ? window.innerWidth : 0,
  });
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: bubbleProps.theme?.button?.bottom ?? 20,
    right: bubbleProps.theme?.button?.right ?? 20,
  });

  const openBot = () => {
    if (!isBotStarted()) setIsBotStarted(true);
    setIsBotOpened(true);
  };

  const closeBot = () => {
    setIsBotOpened(false);
  };

  const toggleBot = () => {
    isBotOpened() ? closeBot() : openBot();
  };

  onMount(() => {
    const handleResize = () => setViewport({ height: window.innerHeight, width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  onCleanup(() => {
    setIsBotStarted(false);
  });

  const buttonSize = getBubbleButtonSize(props.theme?.button?.size); // Default to 48px if size is not provided
  const buttonBottom = props.theme?.button?.bottom ?? 20;
  const chatWindowBottom = buttonBottom + buttonSize + 10; // Adjust the offset here for slight shift

  const getChatWindowHeight = () => {
    const rawHeight = bubbleProps.theme?.chatWindow?.height;
    if (rawHeight === undefined) return `min(calc(100dvh - ${chatWindowBottom + 16}px), calc(100% - 150px))`;
    if (typeof rawHeight === 'string') return rawHeight;
    return `min(${rawHeight}px, calc(100dvh - ${chatWindowBottom + 16}px))`;
  };

  const getChatWindowMaxHeight = () => {
    return `calc(100dvh - ${chatWindowBottom + 16}px)`;
  };

  const getChatWindowWidth = () => {
    const rawWidth = bubbleProps.theme?.chatWindow?.width;
    if (rawWidth === undefined) return undefined;
    if (typeof rawWidth === 'string') return rawWidth;
    return `${rawWidth}px`;
  };

  const hasCustomChatWindowWidth = () => {
    return bubbleProps.theme?.chatWindow?.width !== undefined;
  };

  const getChatWindowWidthForPositioning = () => {
    const rawWidth = bubbleProps.theme?.chatWindow?.width;
    if (typeof rawWidth === 'number') return rawWidth;
    if (typeof rawWidth === 'string') {
      const pxMatch = rawWidth.trim().match(/^(\d+(?:\.\d+)?)px$/i);
      if (pxMatch) return Number(pxMatch[1]);
    }
    return 410;
  };

  // Add viewport meta tag dynamically
  createEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  });

  const showTooltip = bubbleProps.theme?.tooltip?.showTooltip ?? false;

  return (
    <>
      <style>{styles}</style>
      <Show when={props.theme?.customCSS}>
        <style>{props.theme?.customCSS}</style>
      </Show>
      <style>{styles}</style>
      <Tooltip
        showTooltip={showTooltip && !isBotOpened()}
        position={buttonPosition()}
        buttonSize={buttonSize}
        tooltipMessage={bubbleProps.theme?.tooltip?.tooltipMessage}
        tooltipBackgroundColor={bubbleProps.theme?.tooltip?.tooltipBackgroundColor}
        tooltipTextColor={bubbleProps.theme?.tooltip?.tooltipTextColor}
        tooltipFontSize={bubbleProps.theme?.tooltip?.tooltipFontSize} // Set the tooltip font size
      />
      <BubbleButton
        {...bubbleProps.theme?.button}
        toggleBot={toggleBot}
        isBotOpened={isBotOpened()}
        setButtonPosition={setButtonPosition}
        dragAndDrop={bubbleProps.theme?.button?.dragAndDrop ?? false}
        autoOpen={bubbleProps.theme?.button?.autoWindowOpen?.autoOpen ?? false}
        openDelay={bubbleProps.theme?.button?.autoWindowOpen?.openDelay}
        autoOpenOnMobile={bubbleProps.theme?.button?.autoWindowOpen?.autoOpenOnMobile ?? false}
      />
      <div
        ref={(el) => setBubbleContainerRef(el)}
        part="bot"
        style={{
          display: 'flex',
          'flex-direction': 'column',
          overflow: 'hidden',
          height: getChatWindowHeight(),
          'max-height': getChatWindowMaxHeight(),
          width: getChatWindowWidth(),
          transition: 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out',
          'transform-origin': 'bottom right',
          transform: isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)',
          'box-shadow': 'rgb(0 0 0 / 16%) 0px 5px 40px',
          'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
          'background-image': bubbleProps.theme?.chatWindow?.backgroundImage ? `url(${bubbleProps.theme?.chatWindow?.backgroundImage})` : 'none',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          'z-index': 42424242,
          bottom: `${Math.min(buttonPosition().bottom + buttonSize + 10, viewport().height - chatWindowBottom)}px`,
          right: `${Math.max(0, Math.min(buttonPosition().right, viewport().width - getChatWindowWidthForPositioning() - 10))}px`,
        }}
        class={
          `${isFullScreen() ? 'fullscreen' : ''} fixed sm:right-5 rounded-lg ${hasCustomChatWindowWidth() ? '' : 'w-full sm:w-[400px]'} max-h-[704px]` +
          (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none') +
          ` bottom-${chatWindowBottom}px`
        }
      >
        <Show when={isBotStarted()}>
          <Show when={bubbleProps.theme?.chatWindow?.headerHtml}>
            <div innerHTML={DOMPurify.sanitize(bubbleProps.theme?.chatWindow?.headerHtml ?? '')} />
          </Show>
          <div class="relative flex-1 min-h-0">
            <Show when={isBotOpened()}>
              <button
                onClick={() => {
                  setIsFullScreen(!isFullScreen());
                }}
                class="py-1 pr-3 absolute top-0 right-[64px] m-[8px] bg-transparent rounded-full z-50 filter"
                title={isFullScreen() ? 'Minimize Chat' : 'Maximize Chat'}
                style={{
                  color: '#61595A',
                  'margin-top': '6px',
                }}
              >
                {/* FUllScreen Icon */}

                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path
                    fill="#61595A"
                    d={
                      isFullScreen()
                        ? 'M21.29 4.11997L16.7 8.70997L18.29 10.3C18.92 10.93 18.47 12.01 17.58 12.01H13C12.45 12.01 12 11.56 12 11.01V6.40997C12 5.51997 13.08 5.06997 13.71 5.69997L15.3 7.28997L19.89 2.69997C20.28 2.30997 20.91 2.30997 21.3 2.69997C21.68 3.09997 21.68 3.72997 21.29 4.11997ZM4.11997 21.29L8.70997 16.7L10.3 18.29C10.93 18.92 12.01 18.47 12.01 17.58V13C12.01 12.45 11.56 12 11.01 12H6.40997C5.51997 12 5.06997 13.08 5.69997 13.71L7.28997 15.3L2.69997 19.89C2.30997 20.28 2.30997 20.91 2.69997 21.3C3.09997 21.68 3.72997 21.68 4.11997 21.29Z'
                        : 'M6.99992 16.3333C6.35825 16.3333 5.83325 16.8583 5.83325 17.5V21C5.83325 21.6417 6.35825 22.1667 6.99992 22.1667H10.4999C11.1416 22.1667 11.6666 21.6417 11.6666 21C11.6666 20.3583 11.1416 19.8333 10.4999 19.8333H8.16659V17.5C8.16659 16.8583 7.64159 16.3333 6.99992 16.3333ZM6.99992 11.6667C7.64159 11.6667 8.16659 11.1417 8.16659 10.5V8.16667H10.4999C11.1416 8.16667 11.6666 7.64167 11.6666 7C11.6666 6.35834 11.1416 5.83334 10.4999 5.83334H6.99992C6.35825 5.83334 5.83325 6.35834 5.83325 7V10.5C5.83325 11.1417 6.35825 11.6667 6.99992 11.6667ZM19.8333 19.8333H17.4999C16.8583 19.8333 16.3333 20.3583 16.3333 21C16.3333 21.6417 16.8583 22.1667 17.4999 22.1667H20.9999C21.6416 22.1667 22.1666 21.6417 22.1666 21V17.5C22.1666 16.8583 21.6416 16.3333 20.9999 16.3333C20.3583 16.3333 19.8333 16.8583 19.8333 17.5V19.8333ZM16.3333 7C16.3333 7.64167 16.8583 8.16667 17.4999 8.16667H19.8333V10.5C19.8333 11.1417 20.3583 11.6667 20.9999 11.6667C21.6416 11.6667 22.1666 11.1417 22.1666 10.5V7C22.1666 6.35834 21.6416 5.83334 20.9999 5.83334H17.4999C16.8583 5.83334 16.3333 6.35834 16.3333 7Z'
                    }
                  />
                </svg>
              </button>
              <button
                onClick={closeBot}
                class="py-1 pr-3 absolute top-0 right-[-8px] m-[8px] bg-transparent rounded-full z-50 filter"
                style={{
                  color: '#000000',
                  'margin-top': '6px',
                }}
              >
                {/* Close Icon Cross */}
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path
                    fill="#61595A"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                  />
                </svg>
              </button>
            </Show>
            <Bot
              backgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              formBackgroundColor={bubbleProps.theme?.form?.backgroundColor}
              formTextColor={bubbleProps.theme?.form?.textColor}
              badgeBackgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              bubbleBackgroundColor={bubbleProps.theme?.button?.backgroundColor ?? defaultButtonColor}
              bubbleTextColor={bubbleProps.theme?.button?.iconColor ?? defaultIconColor}
              showTitle={bubbleProps.theme?.chatWindow?.showTitle}
              showAgentMessages={bubbleProps.theme?.chatWindow?.showAgentMessages}
              title={bubbleProps.theme?.chatWindow?.title}
              titleAvatarSrc={bubbleProps.theme?.chatWindow?.titleAvatarSrc}
              titleTextColor={bubbleProps.theme?.chatWindow?.titleTextColor}
              titleBackgroundColor={bubbleProps.theme?.chatWindow?.titleBackgroundColor}
              welcomeMessage={bubbleProps.theme?.chatWindow?.welcomeMessage}
              errorMessage={bubbleProps.theme?.chatWindow?.errorMessage}
              poweredByTextColor={bubbleProps.theme?.chatWindow?.poweredByTextColor}
              textInput={bubbleProps.theme?.chatWindow?.textInput}
              botMessage={bubbleProps.theme?.chatWindow?.botMessage}
              userMessage={bubbleProps.theme?.chatWindow?.userMessage}
              feedback={bubbleProps.theme?.chatWindow?.feedback}
              fontSize={bubbleProps.theme?.chatWindow?.fontSize}
              footer={bubbleProps.theme?.chatWindow?.footer}
              sourceDocsTitle={bubbleProps.theme?.chatWindow?.sourceDocsTitle}
              starterPrompts={bubbleProps.theme?.chatWindow?.starterPrompts}
              quickActions={bubbleProps.theme?.chatWindow?.quickActions}
              starterPromptFontSize={bubbleProps.theme?.chatWindow?.starterPromptFontSize}
              chatflowid={props.chatflowid}
              chatflowConfig={props.chatflowConfig}
              apiHost={props.apiHost}
              onRequest={props.onRequest}
              observersConfig={props.observersConfig}
              clearChatOnReload={bubbleProps.theme?.chatWindow?.clearChatOnReload}
              disclaimer={bubbleProps.theme?.disclaimer}
              dateTimeToggle={bubbleProps.theme?.chatWindow?.dateTimeToggle}
              renderHTML={props.theme?.chatWindow?.renderHTML}
              closeBot={closeBot}
              isExpand={isFullScreen()}
              hasCustomHeader={!!bubbleProps.theme?.chatWindow?.headerHtml}
              dialogContainer={bubbleContainerRef()}
            />
          </div>
        </Show>
      </div>
    </>
  );
};
