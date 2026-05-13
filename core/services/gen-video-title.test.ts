import { generateVideoTitleContent } from "./gen-video-title";
import { generateText } from "ai";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

describe("generateVideoTitleContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return generated title and content array on success", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([
        { title: "时尚运动套装测评", content: "#运动套装 这款套装采用高品质面料，弹力透气，适合各种运动场景" },
        { title: "这款运动套装太绝了", content: "#种草 #运动时尚 简约设计搭配亮色系，时尚感满满" },
        { title: "运动套装搭配分享", content: "#搭配分享 #购物分享 多种颜色可选，满足不同穿搭需求" },
      ]),
    } as any);

    const result = await generateVideoTitleContent(
      "时尚运动套装",
      "https://example.com/product.jpg"
    );

    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(3);
    expect(result.results[0].title).toBe("时尚运动套装测评");
    expect(result.results[0].content).toContain("#运动套装");
    expect(result.prompt).toContain("时尚运动套装");
    expect(result.productName).toBe("时尚运动套装");
    expect(result.productImage).toBe("https://example.com/product.jpg");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.anything(),
        messages: expect.any(Array),
      })
    );
  });

  it("should return empty results when no JSON match in response", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "This is not JSON response",
    } as any);

    const result = await generateVideoTitleContent("test", "http://example.com.jpg");
    expect(result.results).toEqual([]);
    expect(result.prompt).toContain("test");
  });

  it("should return empty results when JSON parse fails", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "```json\n{invalid json\n",
    } as any);

    const result = await generateVideoTitleContent("test", "http://example.com.jpg");
    expect(result.results).toEqual([]);
  });

  it("should limit results to 3 items", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([
        { title: "Title1", content: "Content1" },
        { title: "Title2", content: "Content2" },
        { title: "Title3", content: "Content3" },
        { title: "Title4", content: "Content4" },
        { title: "Title5", content: "Content5" },
      ]),
    } as any);

    const result = await generateVideoTitleContent("test", "http://example.com.jpg");
    expect(result.results.length).toBe(3);
  });
});