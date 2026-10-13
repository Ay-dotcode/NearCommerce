// Small input rules shared by every client, so a form never accepts something another rejects.

// Practical email check (the server does the authoritative validation).
export const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// True when a money amount has at most 2 decimal places (19.99 yes, 19.999 no).
export const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
