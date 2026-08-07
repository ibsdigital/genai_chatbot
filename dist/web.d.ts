declare const chatbot: {
    initFull: (props: {
        chatflowid: string;
        apiHost?: string | undefined;
        tenant_uuid?: string | undefined;
        onRequest?: ((request: RequestInit) => Promise<void>) | undefined;
        chatflowConfig?: Record<string, unknown> | undefined;
        observersConfig?: import("./components/Bot").observersConfigType | undefined;
        theme?: import(".").BubbleTheme | undefined;
    } & {
        id?: string | undefined;
    }) => Promise<void>;
    init: (props: {
        chatflowid: string;
        apiHost?: string | undefined;
        tenant_uuid?: string | undefined;
        onRequest?: ((request: RequestInit) => Promise<void>) | undefined;
        chatflowConfig?: Record<string, unknown> | undefined;
        observersConfig?: import("./components/Bot").observersConfigType | undefined;
        theme?: import(".").BubbleTheme | undefined;
    }) => Promise<void>;
    destroy: () => void;
    clearChat: (id?: string | undefined) => void;
};
export default chatbot;
//# sourceMappingURL=web.d.ts.map