import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const nav = (props: IconProps) => ({
  width: 15,
  height: 15,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

const chevron = (props: IconProps) => ({
  width: 10,
  height: 10,
  viewBox: '0 0 14 14',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const AgentsIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <circle cx="8" cy="5" r="2.6" />
    <path d="M2.5 13.5c1-3 3-4 5.5-4s4.5 1 5.5 4" />
  </svg>
);

export const SkillsIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <path d="M8 1.5L9.7 6.3L14.5 8L9.7 9.7L8 14.5L6.3 9.7L1.5 8L6.3 6.3Z" />
  </svg>
);

export const WorkflowsIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <circle cx="3" cy="3.2" r="1.7" />
    <circle cx="13" cy="8" r="1.7" />
    <circle cx="3" cy="12.8" r="1.7" />
    <path d="M4.7 3.2H9a2 2 0 0 1 2 2V8M4.7 12.8H9a2 2 0 0 0 2-2V8" />
  </svg>
);

export const AppsIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <rect x="1.5" y="1.5" width="5.4" height="5.4" />
    <rect x="9.1" y="1.5" width="5.4" height="5.4" />
    <rect x="1.5" y="9.1" width="5.4" height="5.4" />
    <rect x="9.1" y="9.1" width="5.4" height="5.4" strokeDasharray="2 1.6" />
  </svg>
);

export const UsersIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <circle cx="5.5" cy="5" r="2.2" />
    <path d="M1.5 13c.8-2.6 2.3-3.6 4-3.6s3.2 1 4 3.6" />
    <circle cx="11.6" cy="5.4" r="1.8" />
    <path d="M11.9 9.5c1.4.3 2.3 1.3 2.8 3" />
  </svg>
);

export const RolesIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <circle cx="5" cy="8" r="2.9" />
    <path d="M7.9 8h6.6M11.9 8v2.5M14.5 8v1.9" />
  </svg>
);

export const SettingsIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <path d="M1.5 4.5h13M1.5 11.5h13" />
    <circle cx="6" cy="4.5" r="1.8" fill="currentColor" />
    <circle cx="10" cy="11.5" r="1.8" fill="currentColor" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...chevron(props)}>
    <path d="M8.5 3L4.5 7l4 4" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...chevron(props)}>
    <path d="M5.5 3l4 4-4 4" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...chevron(props)}>
    <path d="M4 4l6 6M10 4l-6 6" />
  </svg>
);

export const SignOutIcon = (props: IconProps) => (
  <svg {...nav(props)}>
    <path d="M6 2H2.5v12H6M10.5 5l3 3-3 3M13.5 8H6" />
  </svg>
);

export const DrawerCloseIcon = (props: IconProps) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.3}
    aria-hidden
    focusable={false}
    {...props}
  >
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg
    width={8}
    height={8}
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    aria-hidden
    focusable={false}
    {...props}
  >
    <path d="M1.5 5.5L4 8L8.5 2.5" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.2}
    aria-hidden
    focusable={false}
    {...props}
  >
    <path d="M9 2v14M2 9h14" />
  </svg>
);

export const ArrowTipIcon = (props: IconProps) => (
  <svg
    width={7}
    height={10}
    viewBox="0 0 7 10"
    fill="none"
    stroke="#9A9A95"
    strokeWidth={1.2}
    aria-hidden
    focusable={false}
    {...props}
  >
    <path d="M1 1l5 4-5 4" />
  </svg>
);
