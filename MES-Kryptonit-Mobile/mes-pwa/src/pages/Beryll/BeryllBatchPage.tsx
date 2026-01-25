/**
 * Beryll - партия
 */

import { Link, useParams } from 'react-router-dom'
import { Card, Badge } from '../../components/ui'

export const BeryllBatchPage = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold">Партия Beryll</h1>
        <p className="text-slate-400 text-sm">
          Идентификатор партии: <span className="text-slate-200">{id}</span>
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Данные партии</h2>
          <Badge variant="neutral" size="sm">черновик</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Детали партии появятся после подключения Beryll API. Сейчас страница
          фиксирует маршрут и параметры навигации.
        </p>
        <Link className="text-primary hover:underline text-sm" to="/beryll">
          ← Вернуться к обзору Beryll
        </Link>
      </Card>
    </div>
  )
}
