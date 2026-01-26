/**
 * Страница рейтингов
 */

import { useEffect, useState } from 'react'
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Medal,
  Crown,
  RefreshCw
} from 'lucide-react'
import { Card, Tabs, Badge, Loader, EmptyState } from '../../components/ui'
import { useAuth } from 'react-oidc-context'
import { api, getErrorMessage } from '../../api/client'
import type { UserRanking, TeamRanking, UserStats } from '../../types'

type Period = 'day' | 'week' | 'month' | 'all'

export const RankingsPage = () => {
  const auth = useAuth()
  const user = auth.user?.profile ? {
    id: auth.user.profile.sub,
  } : null
  
  const [tab, setTab] = useState<'users' | 'teams'>('users')
  const [period, setPeriod] = useState<Period>('week')
  const [userRankings, setUserRankings] = useState<UserRanking[]>([])
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([])
  const [myStats, setMyStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRankings()
  }, [tab, period])

  const loadRankings = async () => {
    try {
      setLoading(true)

      const periodParam = period === 'all' ? 'all' : period
      const { data } = await api.get('/warehouse/rankings', {
        params: { period: periodParam },
      })

      const users = Array.isArray(data?.users) ? data.users : []
      const teams = Array.isArray(data?.teams) ? data.teams : []

      const mappedUsers: UserRanking[] = users.map((item: any, index: number) => {
        const teamId = item.teamId ?? null
        const sectionName = item.sectionName ?? ''

        return {
          userId: item.id,
          user: {
            id: item.id,
            login: '',
            name: item.name,
            surname: item.surname,
            role: '',
            abilities: [],
            teamId: teamId ?? undefined,
            sectionId: undefined,
            team: teamId ? { id: teamId, title: item.teamName || 'Без бригады' } : undefined,
            section: sectionName ? { id: 0, title: sectionName } : undefined,
            img: item.avatar ?? null,
          },
          rank: item.place ?? index + 1,
          score: Number(item.output) || 0,
          operations: Number(item.output) || 0,
          trend: 0,
        }
      })

      const mappedTeams: TeamRanking[] = teams.map((team: any, index: number) => ({
        teamId: team.id,
        team: {
          id: team.id,
          title: team.title,
          leaderId: undefined,
        },
        rank: index + 1,
        score: Number(team.totalOutput) || 0,
        operations: Number(team.totalOutput) || 0,
        memberCount: Number(team.membersCount) || 0,
      }))

      const currentUserId = user?.id ? Number(user.id) : null
      const myEntry = currentUserId
        ? mappedUsers.find((entry) => entry.userId === currentUserId)
        : null

      const totalUsers = mappedUsers.length
      const myOutput = myEntry ? myEntry.score : 0

      const stats: UserStats | null = myEntry
        ? {
            totalOperations: myOutput,
            todayOperations: period === 'day' ? myOutput : 0,
            weekOperations: period === 'week' ? myOutput : 0,
            monthOperations: period === 'month' ? myOutput : 0,
            avgPerDay: 0,
            rank: myEntry.rank,
            totalUsers,
          }
        : null

      setUserRankings(mappedUsers)
      setTeamRankings(mappedTeams)
      setMyStats(stats)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={20} className="text-yellow-400" />
    if (rank === 2) return <Medal size={20} className="text-slate-300" />
    if (rank === 3) return <Medal size={20} className="text-amber-600" />
    return <span className="text-slate-500 font-mono text-sm">#{rank}</span>
  }

  const periodTabs = [
    { key: 'day', label: 'День' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'all', label: 'Всё время' },
  ]

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Рейтинги</h1>
          <p className="text-slate-400 text-sm">Статистика сотрудников</p>
        </div>
        <button 
          onClick={loadRankings}
          className="p-2 hover:bg-surface-light rounded-lg transition-colors"
        >
          <RefreshCw size={20} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* My Stats */}
      {myStats && tab === 'users' && (
        <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Trophy size={28} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Ваш рейтинг</p>
              <p className="text-3xl font-bold">#{myStats.rank}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-slate-400">из {myStats.totalUsers}</p>
              <p className="text-sm text-slate-500">сотрудников</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-background/50 rounded-xl">
              <p className="text-lg font-bold text-primary">{myStats.todayOperations}</p>
              <p className="text-xs text-slate-500">Сегодня</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-xl">
              <p className="text-lg font-bold">{myStats.weekOperations}</p>
              <p className="text-xs text-slate-500">Неделя</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-xl">
              <p className="text-lg font-bold">{myStats.monthOperations}</p>
              <p className="text-xs text-slate-500">Месяц</p>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-xl">
              <p className="text-lg font-bold">{myStats.totalOperations}</p>
              <p className="text-xs text-slate-500">Всего</p>
            </div>
          </div>
        </Card>
      )}

      {/* Type Tabs */}
      <Tabs 
        tabs={[
          { key: 'users', label: 'Сотрудники', icon: <Users size={16} /> },
          { key: 'teams', label: 'Команды', icon: <Trophy size={16} /> },
        ]} 
        activeTab={tab} 
        onChange={(key) => setTab(key as 'users' | 'teams')} 
      />

      {/* Period Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periodTabs.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key as Period)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              period === p.key
                ? 'bg-primary text-white'
                : 'bg-surface-light text-slate-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader text="Загрузка рейтингов..." />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-danger mb-4">{error}</p>
        </Card>
      ) : tab === 'users' ? (
        userRankings.length > 0 ? (
          <div className="space-y-2">
            {userRankings.map((item) => {
              const isMe = item.userId === user?.id
              return (
                <Card 
                  key={item.userId} 
                  className={`p-4 ${isMe ? 'border-primary/50 bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(item.rank)}
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold">
                        {item.user?.surname?.charAt(0)}{item.user?.name?.charAt(0)}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isMe ? 'text-primary' : ''}`}>
                        {item.user?.surname} {item.user?.name}
                        {isMe && <span className="text-xs text-slate-500 ml-2">(вы)</span>}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.operations} операций
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{item.score}</p>
                      {item.trend !== 0 && (
                        <div className={`flex items-center justify-end gap-1 text-xs ${
                          item.trend > 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {item.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(item.trend)}%
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy size={48} />}
            title="Нет данных"
            description="За выбранный период нет статистики"
          />
        )
      ) : (
        teamRankings.length > 0 ? (
          <div className="space-y-2">
            {teamRankings.map((item) => (
              <Card key={item.teamId} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getRankIcon(item.rank)}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.team?.title || 'Команда'}</p>
                    <p className="text-sm text-slate-500">
                      {item.memberCount} участников • {item.operations} операций
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">{item.score}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={48} />}
            title="Нет данных"
            description="За выбранный период нет статистики по командам"
          />
        )
      )}
    </div>
  )
}
