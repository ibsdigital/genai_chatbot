// ../icons/StopIcon.tsx
import { JSX } from 'solid-js/jsx-runtime';
const defaultButtonColor = '#F00';
export const StopIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" fill={props.color || '#F00'} viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
