import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";

const STORAGE_KEY = "calj_app_review_state_v1";
const MIN_LAUNCHES = 5;
const MIN_DAYS_SINCE_INSTALL = 3;
const MIN_DAYS_BETWEEN_PROMPTS = 120;

type ReviewState = {
  launches: number;
  firstLaunch: number;
  lastPrompt: number | null;
  declined: boolean;
};

function readState(): ReviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { launches: 0, firstLaunch: Date.now(), lastPrompt: null, declined: false };
}

function writeState(s: ReviewState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function trackAppLaunch() {
  const s = readState();
  s.launches += 1;
  if (!s.firstLaunch) s.firstLaunch = Date.now();
  writeState(s);
}

export function canAskForReview(): boolean {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
  const s = readState();
  if (s.declined) return false;
  if (s.launches < MIN_LAUNCHES) return false;
  const daysSinceInstall = (Date.now() - s.firstLaunch) / (1000 * 60 * 60 * 24);
  if (daysSinceInstall < MIN_DAYS_SINCE_INSTALL) return false;
  if (s.lastPrompt) {
    const daysSincePrompt = (Date.now() - s.lastPrompt) / (1000 * 60 * 60 * 24);
    if (daysSincePrompt < MIN_DAYS_BETWEEN_PROMPTS) return false;
  }
  return true;
}

export async function requestAppReview(): Promise<void> {
  if (!canAskForReview()) return;
  try {
    await InAppReview.requestReview();
    const s = readState();
    s.lastPrompt = Date.now();
    writeState(s);
  } catch (e) {
    console.warn("[appReview] failed", e);
  }
}

export function markReviewDeclined() {
  const s = readState();
  s.declined = true;
  writeState(s);
}

/** Trigger after a positive moment (e.g. user just completed an action successfully). */
export async function maybeRequestReviewAfterPositiveAction() {
  if (canAskForReview()) {
    await requestAppReview();
  }
}