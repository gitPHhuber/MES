/**
 * Beryll - сервер
 */

import { Link, useParams } from 'react-router-dom'
import { Card, Badge } from '../../components/ui'

export const BeryllServerPage = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold">Сервер Beryll</h1>
        <p className="text-slate-400 text-sm">
          Идентификатор сервера: <span className="text-slate-200">{id}</span>
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Состояние</h2>
          <Badge variant="neutral" size="sm">черновик</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Страница подготовлена для интеграции с сервисом Beryll и пока отображает
          только маршрутизацию в PWA.
        </p>
        <Link className="text-primary hover:underline text-sm" to="/beryll">
          ← Вернуться к обзору Beryll
        </Link>
      </Card>
    </div>
  )
}
