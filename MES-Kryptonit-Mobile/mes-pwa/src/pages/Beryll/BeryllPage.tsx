/**
 * Раздел Beryll
 */

import { Link } from 'react-router-dom'
import { Card, Badge } from '../../components/ui'

export const BeryllPage = () => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold">Beryll</h1>
        <p className="text-slate-400 text-sm">
          Маршруты Beryll доступны при включённом фичефлаге VITE_BERYLL_ENABLED.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Доступные сценарии</h2>
          <Badge variant="neutral" size="sm">черновик</Badge>
        </div>
        <div className="space-y-2 text-sm text-slate-400">
          <p>Используйте страницы серверов и партий, чтобы сверить контекст.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <Link className="text-primary hover:underline" to="/beryll/server/1">
                /beryll/server/1
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/beryll/batch/1">
                /beryll/batch/1
              </Link>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
