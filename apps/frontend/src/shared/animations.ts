import { keyframes } from '@mui/material';

export const slideInFade = keyframes`
  from { transform: translateX(-8px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

export const stepPulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

export const stepIconPulse = keyframes`
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
`;

export const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;
