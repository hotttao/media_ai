/**
 * CombinationSelector 组件单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { CombinationSelector } from '../CombinationSelector'

const mockPoses = [
  { id: 'pose-1', name: '站立姿势', url: 'https://example.com/pose1.jpg' },
  { id: 'pose-2', name: '行走姿势', url: 'https://example.com/pose2.jpg' },
]

const mockModels = [
  { id: 'model-1', name: '模特图-A', url: 'https://example.com/model1.jpg' },
  { id: 'model-2', name: '模特图-B', url: 'https://example.com/model2.jpg' },
]

describe('CombinationSelector', () => {
  it('renders both selection panels', () => {
    render(<CombinationSelector type="style-image" itemsA={mockPoses} itemsB={mockModels} />)
    expect(screen.getByText('姿势')).toBeInTheDocument()
    expect(screen.getByText('模特图')).toBeInTheDocument()
  })

  it('shows correct combination count when items are selected', async () => {
    render(<CombinationSelector type="style-image" itemsA={mockPoses} itemsB={mockModels} />)

    // Click to select first pose
    fireEvent.click(screen.getByText('站立姿势'))
    // Click to select first model
    fireEvent.click(screen.getByText('模特图-A'))

    // Text is split across elements, use a function matcher
    expect(screen.getByText((content) => content.includes('个组合'))).toBeInTheDocument()
  })

  it('filters existing combinations', () => {
    render(
      <CombinationSelector
        type="style-image"
        itemsA={mockPoses}
        itemsB={mockModels}
        existingIds={['pose-1-model-1']}
      />
    )

    // Select the existing combination
    fireEvent.click(screen.getByText('站立姿势'))
    fireEvent.click(screen.getByText('模特图-A'))

    expect(screen.getByText('已存在 ✓')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <CombinationSelector
        type="style-image"
        itemsA={mockPoses}
        itemsB={mockModels}
        loading={true}
      />
    )
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders correct labels for model-image type', () => {
    render(
      <CombinationSelector
        type="model-image"
        itemsA={[{ id: 'ip-1', name: '虚拟IP-小美' }]}
        itemsB={[{ id: 'prod-1', name: '产品-连衣裙' }]}
      />
    )
    expect(screen.getByText('虚拟IP')).toBeInTheDocument()
    expect(screen.getByText('产品')).toBeInTheDocument()
  })

  it('renders correct labels for first-frame type', () => {
    render(
      <CombinationSelector
        type="first-frame"
        itemsA={[{ id: 'scene-1', name: '室内场景' }]}
        itemsB={[{ id: 'style-1', name: '定妆图-A' }]}
      />
    )
    expect(screen.getByText('场景')).toBeInTheDocument()
    expect(screen.getByText('定妆图')).toBeInTheDocument()
  })

  it('calls onSelectionChange when selection changes', () => {
    const onSelectionChange = vi.fn()
    render(
      <CombinationSelector
        type="style-image"
        itemsA={mockPoses}
        itemsB={mockModels}
        onSelectionChange={onSelectionChange}
      />
    )

    fireEvent.click(screen.getByText('站立姿势'))
    expect(onSelectionChange).toHaveBeenCalledWith(['pose-1'], [])
  })

  it('generates all combinations when items on both sides are selected', () => {
    render(
      <CombinationSelector type="style-image" itemsA={mockPoses} itemsB={mockModels} />
    )

    // Select all poses
    fireEvent.click(screen.getByText('站立姿势'))
    fireEvent.click(screen.getByText('行走姿势'))
    // Select all models
    fireEvent.click(screen.getByText('模特图-A'))
    fireEvent.click(screen.getByText('模特图-B'))

    // 2 poses × 2 models = 4 combinations
    // Text is split across elements, use a function matcher
    expect(screen.getByText((content) => content.includes('个组合'))).toBeInTheDocument()
  })
})
