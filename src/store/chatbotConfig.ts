import { createSignal } from 'solid-js';

export type ChatbotGlobalConfig = {
  apiHost: string;
  tenant_uuid: string;
};

const [apiHost, setApiHost] = createSignal<string | null>(null);
const [tenantUuid, setTenantUuid] = createSignal<string | null>(null);

export { apiHost, setApiHost, tenantUuid, setTenantUuid };
