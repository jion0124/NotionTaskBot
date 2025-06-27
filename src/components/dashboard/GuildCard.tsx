import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Plus, ArrowRight, Crown, Shield, Bot, Database } from 'lucide-react';
import { Guild, BotStatus } from '@/types/guild';
import GuildStatusBadge from './GuildStatusBadge';

interface Props {
  guild: Guild;
  status: BotStatus | null;
  onSelect: (guildId: string) => void;
  onAddBot: (guildId: string, guildName: string) => void;
}

export default function GuildCard({ guild, status, onSelect, onAddBot }: Props) {
  const hasBot = status?.hasBot || false;
  const hasNotion = status?.guildInfo?.notion_api_key && status?.guildInfo?.notion_database_id;

  return (
    <Card 
      className={`group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
        hasBot 
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' 
          : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-blue-300'
      } p-5 sm:p-6 rounded-2xl min-w-0`}
    >
      <CardHeader className="pb-4 px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">
                  {guild.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {guild.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {guild.owner ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    オーナー
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    管理者
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <GuildStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        {hasBot ? (
          <div className="space-y-4">
            <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {hasNotion ? (
                <span className="text-emerald-700 font-medium">
                  ✅ 完全に設定済み - タスク管理を開始できます
                </span>
              ) : (
                <span className="text-amber-700">
                  ⚠️ Botは追加済みですが、Notionの設定が必要です
                </span>
              )}
            </div>
            <Button 
              className={`w-full group-hover:shadow-lg transition-all duration-200 text-xs sm:text-base py-2.5 sm:py-3 ${
                hasNotion 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              onClick={() => onSelect(guild.id)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {hasNotion ? '管理画面を開く' : '設定を完了'}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              NotionTaskBotを追加して、Discordから直接Notionにタスクを管理できるようになります。
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:shadow-lg transition-all duration-200 text-xs sm:text-base py-2.5 sm:py-3"
              onClick={() => onAddBot(guild.id, guild.name)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Botを追加
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 