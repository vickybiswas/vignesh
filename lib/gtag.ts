// Google Analytics helper functions
export const GA_MEASUREMENT_ID = 'G-42CGCXP8QL'; 

declare global {
  interface Window { gtag: (...args: any[]) => void; }
}

// Log the pageview with the given URL
export const pageview = (url: string) => {
  window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
};

interface GTagEvent {
  action: string;
  category: string;
  label: string;
  value?: number;
}

// Log specific events happening.
export const event = ({ action, category, label, value }: GTagEvent) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Set a user ID for analytics
export const setUserId = (userId: string) => {
  window.gtag('set', { user_id: userId });
};

// Report exceptions
export const reportError = ({ description, fatal }: { description: string; fatal?: boolean }) => {
  window.gtag('event', 'exception', {
    description,
    fatal: fatal || false,
  });
};