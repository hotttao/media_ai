import { extractProductInfo } from "./product-extractor";
import { readFileSync } from "fs";
import { join } from "path";

describe("extractProductInfo", () => {
  const testImagePath = join(
    __dirname,
    "../../docs/virtual_ip/服装/5d7788b73604b9e9f302dbeacc61a0c8.jpg"
  );

  beforeAll(() => {
    expect(() => readFileSync(testImagePath)).not.toThrow();
  });

  it("should extract product info using MiniMax model", async () => {
    const imageBuffer = readFileSync(testImagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString(
      "base64"
    )}`;

    const result = await extractProductInfo([base64Image]);

    expect(result).toBeDefined();
    expect(result?.name).toBeDefined();
    expect(result?.targetAudience).toMatch(/^(MENS|WOMENS|KIDS)$/);
    console.log("Result:", result);
  }, 60000);
});
