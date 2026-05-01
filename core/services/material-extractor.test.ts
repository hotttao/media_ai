import { extractMaterialInfo } from "./material-extractor";
import { readFileSync } from "fs";
import { join } from "path";

describe("extractMaterialInfo", () => {
  const testImagePath = join(
    __dirname,
    "../../docs/virtual_ip/场景/IMG_4726.JPG"
  );

  beforeAll(() => {
    expect(() => readFileSync(testImagePath)).not.toThrow();
  });

  // Skip this test as it requires real MiniMax API credentials
  it.skip("should extract material info using MiniMax model", async () => {
    const imageBuffer = readFileSync(testImagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString(
      "base64"
    )}`;

    const result = await extractMaterialInfo([base64Image]);

    expect(result).toBeDefined();
    expect(result?.name).toBeDefined();
    expect(result?.type).toMatch(/^(CLOTHING|SCENE|ACTION|MAKEUP|ACCESSORY|OTHER)$/);
    expect(result?.description).toBeDefined();
    expect(result?.tags).toBeDefined();
    expect(Array.isArray(result?.tags)).toBe(true);
    console.log("Result:", result);
  }, 60000);
});
