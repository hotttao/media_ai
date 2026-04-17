// foundation/providers/registry.ts
import { ToolProvider } from './ToolProvider'

class ProviderRegistry {
  private providers: Map<string, ToolProvider> = new Map()

  register(name: string, provider: ToolProvider): void {
    this.providers.set(name, provider)
  }

  get(name: string): ToolProvider | undefined {
    return this.providers.get(name)
  }

  getAll(): Map<string, ToolProvider> {
    return this.providers
  }

  has(name: string): boolean {
    return this.providers.has(name)
  }
}

// 单例
export const providerRegistry = new ProviderRegistry()
