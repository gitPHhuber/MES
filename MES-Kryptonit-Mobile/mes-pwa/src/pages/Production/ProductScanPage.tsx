/**
 * Страница сканирования продукта
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, Keyboard, Search, ArrowRight, Package, ArrowLeft } from 'lucide-react'
import { Card, Input, Button, Badge, Loader, EmptyState } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import { STATUS_LABELS, STATUS_COLORS } from '../../config'
import type { ScanResult } from '../../types'

export const ProductScanPage = () => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [serialNumber, setSerialNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSearch = async () => {
    const code = serialNumber.trim()
    if (!code) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data } = await api.post('/products/scan', { code })
      setResult(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Продукт не найден'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleStartOperation = () => {
    if (result?.product && result?.nextStep) {
      navigate(`/production/checklist/${result.product.id}/${result.nextStep.id}`)
    }
  }

  const handleViewProduct = () => {
    if (result?.product) {
      navigate(`/production/${result.product.id}`)
    }
  }

  const handleReset = () => {
    setSerialNumber('')
    setResult(null)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={20} />}
          onClick={() => navigate(-1)}
        />
        <div>
          <h1 className="text-xl font-bold">Сканирование</h1>
          <p className="text-slate-400 text-sm">Найти продукт</p>
        </div>
      </div>

      {/* Icon */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl">
          <QrCode size={40} className="text-primary" />
        </div>
      </div>

      {/* Search Input */}
      <Card className="p-5">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              ref={inputRef}
              placeholder="Серийный номер или QR..."
              icon={<Keyboard size={18} />}
              value={serialNumber}
              onChange={(e) => {
                setSerialNumber(e.target.value.toUpperCase())
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              className="text-lg font-mono"
            />
          </div>
          <Button
            onClick={handleSearch}
            loading={loading}
            disabled={!serialNumber.trim()}
            size="lg"
            icon={<Search size={18} />}
          >
            <span className="hidden sm:inline">Найти</span>
          </Button>
        </div>

        <p className="text-sm text-slate-500 mt-3 text-center">
          Используйте сканер или введите номер вручную
        </p>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader text="Поиск продукта..." />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-6 bg-danger/10 border-danger/20">
          <div className="text-center">
            <p className="text-danger font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={handleReset}>
              Попробовать снова
            </Button>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <Card className="p-5 animate-slideUp">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold font-mono">{result.product.serialNumber}</h2>
              <p className="text-slate-400">{result.product.productType?.name || 'Продукт'}</p>
            </div>
            <Badge variant={STATUS_COLORS[result.product.status] || 'neutral'}>
              {STATUS_LABELS[result.product.status] || result.product.status}
            </Badge>
          </div>

          {result.currentStep && (
            <div className="p-4 bg-surface-light rounded-xl mb-3">
              <p className="text-sm text-slate-400 mb-1">Текущий этап</p>
              <p className="font-medium">{result.currentStep.title}</p>
            </div>
          )}

          {result.nextStep && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-3">
              <p className="text-sm text-primary mb-1">Следующий этап</p>
              <p className="font-medium">{result.nextStep.title}</p>
            </div>
          )}

          {result.message && (
            <p className="text-sm text-slate-400 text-center mb-4">
              {result.message}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            {result.canProceed && result.nextStep && (
              <Button
                onClick={handleStartOperation}
                className="flex-1"
                icon={<ArrowRight size={18} />}
              >
                Начать операцию
              </Button>
            )}
            <Button
              onClick={handleViewProduct}
              variant={result.canProceed ? 'outline' : 'primary'}
              className="flex-1"
            >
              Подробнее
            </Button>
          </div>

          <button
            onClick={handleReset}
            className="w-full text-center text-sm text-primary hover:underline mt-4"
          >
            Сканировать другой продукт
          </button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && !result && (
        <EmptyState
          icon={<Package size={48} />}
          title="Готов к сканированию"
          description="Отсканируйте QR-код или введите серийный номер"
        />
      )}
    </div>
  )
}
