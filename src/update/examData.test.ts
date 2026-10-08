import { describe, expect, it, vi } from "vitest";
import { loadExamJson, remoteExamUrl } from "./examData";

describe("exam data loading", () => {
  it("uses bundled data on web", async () => {
    const loader = vi.fn().mockResolvedValue({ source: "local" });

    const result = await loadExamJson("cis-df/exam.json", false, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith("./exams/cis-df/exam.json");
    expect(result).toEqual({ source: "local" });
  });

  it("uses public repo data first on Android", async () => {
    const loader = vi.fn().mockResolvedValue({ source: "remote" });

    const result = await loadExamJson("cis-df/questions.json", true, loader);

    expect(loader).toHaveBeenCalledWith(
      remoteExamUrl("cis-df/questions.json")
    );
    expect(result).toEqual({ source: "remote" });
  });

  it("falls back to bundled data when Android remote loading fails", async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ source: "local" });

    const result = await loadExamJson("index.json", true, loader);

    expect(loader).toHaveBeenNthCalledWith(1, remoteExamUrl("index.json"));
    expect(loader).toHaveBeenNthCalledWith(2, "./exams/index.json");
    expect(result).toEqual({ source: "local" });
  });
});
