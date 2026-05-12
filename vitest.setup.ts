import "@testing-library/jest-dom"
import * as fs from "fs"
import * as path from "path"

// 加载 .env 文件中的环境变量（用于测试）
const envPath = path.join(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8")
  content.split("\n").forEach((line) => {
    // 去掉 # 注释
    const commentIndex = line.indexOf('#')
    const cleanLine = commentIndex >= 0 ? line.substring(0, commentIndex) : line

    const [key, ...rest] = cleanLine.split("=")
    if (key && rest.length > 0) {
      const value = rest.join("=").replace(/^["']|["']$/g, "").trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  })
}