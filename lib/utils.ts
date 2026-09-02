import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function inferPersonFromDescription(description: string, knownMembers: string[] = ['Jorge', 'GO']): string {
  if (!description) return knownMembers[0] || 'Jorge';
  
  // 1. Check if description contains any of the known members explicitly (whole word match)
  for (const member of knownMembers) {
    const escaped = member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(description)) {
      return member;
    }
  }

  // 2. Look for pattern like "VR - GO", "VR - Gabi", "VR - Felipe", "VR (GO)", "VR GO", etc.
  const dashMatch = description.match(/(?:VR|VA|Benefício|Beneficio)[\s]*[-–—:][\s]*([a-zA-ZÀ-ÿ0-9_]+)/i);
  if (dashMatch && dashMatch[1]) {
    const found = dashMatch[1].trim();
    // match against known member case-insensitively
    const match = knownMembers.find(m => m.toLowerCase() === found.toLowerCase());
    return match || found;
  }

  const parenMatch = description.match(/(?:VR|VA)[\s]*\(([^)]+)\)/i);
  if (parenMatch && parenMatch[1]) {
    const found = parenMatch[1].trim();
    const match = knownMembers.find(m => m.toLowerCase() === found.toLowerCase());
    return match || found;
  }

  // 3. If ends with " - Nome"
  const endMatch = description.match(/[-–—]\s*([a-zA-ZÀ-ÿ0-9_]{1,15})$/i);
  if (endMatch && endMatch[1]) {
    const found = endMatch[1].trim();
    const match = knownMembers.find(m => m.toLowerCase() === found.toLowerCase());
    return match || found;
  }

  // Default fallback
  return knownMembers[0] || 'Jorge';
}

