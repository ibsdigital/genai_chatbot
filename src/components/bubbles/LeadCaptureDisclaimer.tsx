import { For } from 'solid-js';
import { CompanyConfig } from '@/window';
import { InfoCircleIcon, RepairIcon, NoTransactionIcon, PrivacyIcon, TermsIcon } from '../icons';

type Props = {
  config: CompanyConfig;
};

const disclaimerItems = [
  {
    title: 'General information only',
    text: 'This assistant uses AI to provide information about AMS Neve products, services, and support. While we aim for accuracy, responses may occasionally be incomplete or out of date. For binding details on specifications, pricing, lead times, or warranty terms, please confirm directly with AMS Neve or an authorised dealer.',
    Icon: InfoCircleIcon,
  },
  {
    title: 'For repairs or fault diagnosis',
    text: "Guidance provided here is for general informational purposes only. For repairs, servicing, or fault diagnosis, please allow the assistant to create a support ticket so that our team can provide specialist human assistance. Do not attempt internal repairs or modifications based on the assistant's responses alone.",
    Icon: RepairIcon,
  },
  {
    title: 'Cannot process transactions',
    text: 'This assistant cannot process orders, payments, or warranty claims, but it can point you to the right team or resource.',
    Icon: NoTransactionIcon,
  },
  {
    title: 'Your privacy matters',
    text: 'Conversations may be recorded and reviewed by a human member of our team to improve service quality, train our systems, and support any follow-up enquiries. Please do not share passwords, payment details, or other sensitive personal information through this chat.',
    Icon: PrivacyIcon,
  },
];

export const LeadCaptureDisclaimer = (props: Props) => {
  return (
    <div class="lead-disclaimer">
      <For each={disclaimerItems}>
        {(item, index) => (
          <div class={`lead-disclaimer-item ${index() < disclaimerItems.length - 1 ? 'lead-disclaimer-item-bordered' : ''}`}>
            <div class="lead-disclaimer-icon-wrap" style={{ background: `${props.config.colors.primary}18` }}>
              <item.Icon color={props.config.colors.primary} />
            </div>
            <div>
              <p class="lead-disclaimer-title">{item.title}</p>
              <p class="lead-disclaimer-text">{item.text}</p>
            </div>
          </div>
        )}
      </For>

      <div class="lead-disclaimer-item">
        <div class="lead-disclaimer-icon-wrap" style={{ background: `${props.config.colors.primary}18` }}>
          <TermsIcon color={props.config.colors.primary} />
        </div>
        <div>
          <p class="lead-disclaimer-title">Terms apply</p>
          <p class="lead-disclaimer-text">
            Your use of this assistant is subject to AMS Neve's{' '}
            <a href={props.config.privacyPolicy} target="_blank" class="lead-disclaimer-link" style={{ color: props.config.colors.primary }}>
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href={props.config.terms} target="_blank" class="lead-disclaimer-link" style={{ color: props.config.colors.primary }}>
              Terms of Use
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};