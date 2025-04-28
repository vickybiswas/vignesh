import { messages } from "@/utils/messages";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// filenameValidation.js

export function validateFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return { isValid: false, error: messages.fileNameStringError };
  }

  // Disallowed characters: \ / : * ? " < > | and spaces
  const forbiddenPattern = /[\\\/:*?"<>|\s]/;

  if (forbiddenPattern.test(fileName)) {
    return { isValid: false, error: messages.fileNameFormatError };
  }

  if (fileName.trim() === '') {
    return { isValid: false, error: messages.fileNameCannotEmptyOrContainWhitespace };
  }

  if (fileName.length > 255) {
    return { isValid: false, error: messages.fileNameLengthError };
  }

  return { isValid: true, error: null };
}

export function addTxtExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const trimmedName = fileName.trim();

  // Check if it ends with '.txt' in any case (lower or upper)
  if (trimmedName.toLowerCase().endsWith('.txt')) {
    return trimmedName;
  }

  return `${trimmedName}.txt`;
}