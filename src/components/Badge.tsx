import { FooterTheme } from '@/features/bubble/types';
import { Show, onCleanup, onMount, createSignal, createEffect } from 'solid-js';
import { getCompanyConfig, CompanyConfig } from '@/window';

type Props = {
  footer?: FooterTheme;
  botContainer: HTMLDivElement | undefined;
  poweredByTextColor?: string;
  badgeBackgroundColor?: string;
};

const defaultTextColor = '#303235';

export const Badge = (props: Props) => {
  let liteBadge: HTMLAnchorElement | undefined;
  let observer: MutationObserver | undefined;

  // Reactive config signal to handle timing issues
  const [config, setConfig] = createSignal<CompanyConfig | null>(null);

  // Load config reactively
  createEffect(() => {
    const loadedConfig = getCompanyConfig();
    setConfig(loadedConfig);
  });

  const appendBadgeIfNecessary = (mutations: MutationRecord[]) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((removedNode) => {
        if ('id' in removedNode && liteBadge && removedNode.id == 'lite-badge') {
          console.log("Sorry, you can't remove the brand 😅");
          props.botContainer?.append(liteBadge);
        }
      });
    });
  };

  onMount(() => {
    if (!document || !props.botContainer) return;

    observer = new MutationObserver(appendBadgeIfNecessary);
    observer.observe(props.botContainer, {
      subtree: false,
      childList: true,
    });
  });

  onCleanup(() => {
    if (observer) observer.disconnect();
  });

  // Helper function to check if supportedBy is available and valid
  const hasSupportedBy = () => {
    const currentConfig = config();

    if (!currentConfig) {
      console.log('🔍 No config for supportedBy check');
      return false;
    }

    const result =
      currentConfig?.supportedBy &&
      currentConfig.supportedBy.name &&
      currentConfig.supportedBy.link &&
      currentConfig.supportedBy.name.trim() !== '' &&
      currentConfig.supportedBy.link.trim() !== '';

    return result;
  };

  // Check footer visibility conditions
  const shouldShowFooter = () => {
    const showFooter = props.footer?.showFooter === undefined || props.footer?.showFooter === null || props.footer?.showFooter === true;
    return showFooter;
  };

  return (
    <>
      {/* Combined footer section - Both "Powered by" and "Supported by" in same line */}
      <Show when={config() && shouldShowFooter()}>
        <span
          class="w-full text-center px-[10px] pt-[6px] pb-[10px] m-auto text-[11px]"
          style={{
            color: props.footer?.textColor ?? props.poweredByTextColor ?? defaultTextColor,
            'background-color': props.badgeBackgroundColor ?? '#ffffff',
            'font-weight': 400,
            // Remove debug border when satisfied: border: '1px solid red',
          }}
        >
          {(() => {
            const currentConfig = config()!;
            const hasSupportedByData = hasSupportedBy();

            return (
              <>
                {/* Powered by part */}
                {props.footer?.text ?? 'Powered by '}
                <a href={currentConfig.website} target="_blank" rel="noopener noreferrer">
                  <span
                    style={{
                      color: currentConfig.colors.primary,
                      'font-weight': 800,
                      margin: '0 2px',
                      'text-decoration': 'none',
                    }}
                  >
                    {currentConfig.name}
                  </span>
                </a>

                {/* Add comma and "Supported by" if supportedBy data exists */}
                <Show when={hasSupportedByData}>
                  <span>, Supported by </span>
                  <a href={currentConfig.supportedBy!.link} target="_blank" rel="noopener noreferrer">
                    <span
                      style={{
                        color: '#FB8105',
                        'font-weight': 800,
                        margin: '0 2px',
                        'text-decoration': 'none',
                      }}
                    >
                      {currentConfig.supportedBy!.name}
                    </span>
                  </a>
                </Show>
              </>
            );
          })()}
        </span>
      </Show>

      {/* Empty footer when showFooter is explicitly set to false */}
      <Show when={props.footer?.showFooter === false}>
        <span
          class="w-full text-center px-[10px] pt-[6px] pb-[10px] m-auto text-[13px]"
          style={{
            color: props.footer?.textColor ?? props.poweredByTextColor ?? defaultTextColor,
            'background-color': props.badgeBackgroundColor ?? '#ffffff',
          }}
        />
      </Show>
    </>
  );
};
