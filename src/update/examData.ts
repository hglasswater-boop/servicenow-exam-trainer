import { fetchJson } from "./fetchJson";

const REMOTE_EXAM_BASE =
  "https://raw.githubusercontent.com/hglasswater-boop/servicenow-exam-trainer/main/public/exams";

export function remoteExamUrl(path: string): string {
  return `${REMOTE_EXAM_BASE}/${path}`;
}

export async function loadExamJson<T>(
  path: string,
  isNative: boolean,
  loader: <R>(url: string) => Promise<R> = fetchJson
): Promise<T> {
  if (isNative) {
    try {
      return await loader<T>(remoteExamUrl(path));
    } catch {
      return loader<T>(`./exams/${path}`);
    }
  }

  return loader<T>(`./exams/${path}`);
}
