import { TypingBubble } from '@/components';

export const LoadingBubble = () => (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-containe w-20 h-20">
    <span class="px-4 py-2 ml-2 whitespace-pre-wrap max-w-full chatbot-host-bubble rounded-2xl w-20 h-20" data-testid="host-bubble">
      <TypingBubble />
    </span>
  </div>
);
