export function AIIcon({ className }: { className?: string }) {
  return (
    <svg
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className={className}
    >
      {/* Brain outline */}
      <path
        d="M4.5 3.5C4.5 2.12 5.62 1 7 1c.68 0 1.29.27 1.74.71C9.19.27 9.8 0 10.5 0c1.38 0 2.5 1.12 2.5 2.5 0 .4-.09.77-.25 1.11.67.35 1.25.9 1.25 1.89 0 1.1-.9 2-2 2-.28 0-.54-.06-.78-.16C11.06 8.27 10.13 9 9 9H7c-1.13 0-2.06-.73-2.22-1.66-.24.1-.5.16-.78.16-1.1 0-2-.9-2-2 0-.99.58-1.54 1.25-1.89C3.09 3.27 3 2.9 3 2.5c0-.69.28-1.31.72-1.76C4.13 1.27 4.5 2.32 4.5 3.5z"
        fill="url(#prefix__paint0_radial_ai_brain)"
      />

      {/* Brain folds/wrinkles */}
      <path
        d="M5.5 4.5C5.5 4.22 5.72 4 6 4s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5z"
        fill="url(#prefix__paint1_linear_ai_brain)"
        opacity="0.3"
      />
      <path
        d="M8.5 4.5C8.5 4.22 8.72 4 9 4s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5z"
        fill="url(#prefix__paint1_linear_ai_brain)"
        opacity="0.3"
      />
      <path
        d="M7 6.5C7 6.22 7.22 6 7.5 6s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5z"
        fill="url(#prefix__paint1_linear_ai_brain)"
        opacity="0.3"
      />

      {/* Neural network connections */}
      <path
        d="M6 4.5L7.5 6L9 4.5M7.5 6L7.5 7.5"
        stroke="url(#prefix__paint2_linear_ai_brain)"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* AI circuits/nodes */}
      <circle cx="6" cy="4.5" r="0.3" fill="#fff" opacity="0.8" />
      <circle cx="9" cy="4.5" r="0.3" fill="#fff" opacity="0.8" />
      <circle cx="7.5" cy="6" r="0.3" fill="#fff" opacity="0.8" />
      <circle cx="7.5" cy="7.5" r="0.3" fill="#fff" opacity="0.8" />

      <defs>
        <radialGradient
          id="prefix__paint0_radial_ai_brain"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(12.5 4.2 -35.6 103.2 2.5 5.8)"
        >
          <stop offset=".067" stopColor="#6366F1" />
          <stop offset=".343" stopColor="#8B5CF6" />
          <stop offset=".672" stopColor="#A855F7" />
        </radialGradient>
        <linearGradient
          id="prefix__paint1_linear_ai_brain"
          x1="3"
          y1="2"
          x2="13"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient
          id="prefix__paint2_linear_ai_brain"
          x1="6"
          y1="4.5"
          x2="9"
          y2="7.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
    </svg>
  );
}
