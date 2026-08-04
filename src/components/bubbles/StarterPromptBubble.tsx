import { getCompanyConfig } from '@/window';

type Props = {
  prompt: string;
  onPromptClick?: () => void;
  starterPromptFontSize?: number;
  botMessageBackgroundColor?: string;
  botMessageTextColor?: string;
  botMessageBorderColor?: string;
};

function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const StarterPromptBubble = (props: Props) => {
  const config = getCompanyConfig();
  const themePrimary = config?.colors?.primary ?? '#ff8c00'; // match SendButton's source

  const bg = config?.colors.secondary ?? '#f7f8ff';
  const color = config?.colors.secondary ?? '#FFFFFF';

  // simple, minimal conversion to a semi-transparent border color
  const defaultBorder = (() => {
    if (themePrimary.startsWith('#')) {
      return hexToRgba(themePrimary, 0.28);
    }
    if (themePrimary.startsWith('rgb(')) {
      // convert "rgb(r,g,b)" to "rgba(r,g,b,alpha)"
      return themePrimary.replace('rgb(', 'rgba(').replace(')', `,0.28)`);
    }
    if (themePrimary.startsWith('var(')) {
      // assumes you expose --primary-rgb: "R,G,B" somewhere in CSS
      return `rgba(var(--primary-rgb), 0.28)`;
    }
    // fallback: if it's a named color or something else, just use a default rgba
    return 'rgba(255,140,0,0.28)';
  })();

  const borderColor = props.botMessageBorderColor ?? defaultBorder;

  return (
    <>
      {/* simple hover rule that reads the --secondary CSS variable we set on the element */}
      <style>{`
        .starter-hover:hover {
          background-color: var(--secondary) !important;
          color: #ffffff !important;
        }
      `}</style>

      <div
        class={`flex justify-start items-start animate-fade-in host-container hover:brightness-90 active:brightness-75 transform-gpu transition-transform duration-200 ease-out hover:scale-105 hover:bg-[${bg}] hover:text-white`}
        onClick={() => props.onPromptClick?.()}
      >
        <div
          class="px-3 py-1 max-w-full chatbot-host-bubble prose bg-transparent starter-hover"
          style={{
            // expose the secondary color as a CSS variable so the hover rule can use it
            '--secondary': bg,
            color: color,
            'border-radius': '8px',
            'font-size': props.starterPromptFontSize ? `${props.starterPromptFontSize}px` : '14px',
            cursor: 'pointer',
            border: `1px solid ${bg}`,
            transition: 'filter 120ms ease, box-shadow 120ms ease, transform 120ms ease',
            'box-shadow': 'none',
            // keep background transparent by default
            'background-color': 'transparent',
          }}
        >
          {props.prompt}
        </div>
      </div>
    </>
  );
};
