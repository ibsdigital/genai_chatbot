// src/components/icons/EmailIcon.tsx
import { JSX } from 'solid-js/jsx-runtime';
const defaultIconColor = '#AAAAAA';

export const EmailIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path
      d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
      fill={props.color ?? defaultIconColor}
    />
  </svg>
);
